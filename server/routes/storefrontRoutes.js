import { sendStoreEmail } from '../lib/storeEmail.js';

export function registerStorefrontRoutes(app, context) {
  const {
    fs,
    path,
    prisma,
    masterPrisma,
    parseOrThrow,
    z,
    parseStringArrayJson,
    storefrontUpdateInput,
    storefrontImageUploadInput,
    storefrontFontUploadInput,
    storefrontOrderUpdateInput,
    STOREFRONT_MEDIA_ROOT,
    STOREFRONT_FONT_ROOT,
    randomBytes,
    requireFeatureEdit,
  } = context;

// All owner storefront routes must resolve through the signed-in account context.
app.use('/api/storefront', requireFeatureEdit('storefront_edit'));
app.use('/api/storefront/orders', requireFeatureEdit('storefront_edit'));
app.use('/api/storefront/launch-tools', requireFeatureEdit('storefront_edit'));
app.use('/api/storefront/gift-cards', requireFeatureEdit('storefront_edit'));
app.use('/api/storefront/reviews', requireFeatureEdit('storefront_edit'));
app.use('/api/storefront/rewards', requireFeatureEdit('storefront_edit'));
app.use('/api/storefront/discount-codes', requireFeatureEdit('storefront_edit'));
app.use('/api/storefront/gallery', requireFeatureEdit('storefront_edit'));
app.use('/api/storefront/membership', requireFeatureEdit('storefront_edit'));
app.use('/api/storefront/subscriptions', requireFeatureEdit('storefront_edit'));
app.use('/api/storefront/pickup', requireFeatureEdit('storefront_edit'));

function giftCardCode(randomBytes) {
  return `CM-GIFT-${randomBytes(5).toString('hex').toUpperCase()}`;
}

async function createCustomerNotification(db, randomBytes, customerId, category, title, message) {
  if (!customerId) return;
  await db.$executeRaw`
    INSERT INTO "StoreCustomerNotification" ("id", "customer_id", "category", "title", "message", "is_read", "created_at")
    VALUES (${`notice-${randomBytes(12).toString('hex')}`}, ${customerId}, ${category}, ${title}, ${message}, ${0}, ${new Date().toISOString()})
  `;
}

async function awardReward(db, randomBytes, customerId, points, source, referenceId, note) {
  const now = new Date().toISOString();
  const inserted = await db.$executeRaw`INSERT OR IGNORE INTO "StoreCustomerRewardLedger" ("id", "customer_id", "points", "source", "reference_id", "note", "created_at") VALUES (${`reward-${randomBytes(12).toString('hex')}`}, ${customerId}, ${points}, ${source}, ${referenceId}, ${note}, ${now})`;
  if (!inserted) return false;
  await db.$executeRaw`INSERT INTO "StoreCustomerRewardBalance" ("customer_id", "points", "updated_at") VALUES (${customerId}, ${points}, ${now}) ON CONFLICT("customer_id") DO UPDATE SET "points" = "points" + ${points}, "updated_at" = ${now}`;
  await createCustomerNotification(db, randomBytes, customerId, 'rewards', 'Rewards updated', `${points > 0 ? '+' : ''}${points} reward points: ${note}`);
  return true;
}

app.get('/api/storefront/gift-cards', async (_req, res, next) => {
  try {
    const cards = await prisma.$queryRaw`
      SELECT g.*, c."name" AS "customer_name", c."email" AS "customer_email"
      FROM "StoreGiftCard" g
      LEFT JOIN "StoreCustomer" c ON c."id" = g."customer_id"
      ORDER BY g."updated_at" DESC
    `;
    const usages = await prisma.$queryRaw`
      SELECT u.*, g."code" AS "gift_card_code" FROM "StoreGiftCardUsage" u
      JOIN "StoreGiftCard" g ON g."id" = u."gift_card_id"
      ORDER BY u."created_at" DESC LIMIT 250
    `;
    const credits = await prisma.$queryRaw`
      SELECT cr.*, c."name" AS "customer_name", c."email" AS "customer_email"
      FROM "StoreCustomerCredit" cr JOIN "StoreCustomer" c ON c."id" = cr."customer_id"
      ORDER BY cr."updated_at" DESC
    `;
    res.json({ cards, usages, credits });
  } catch (error) { next(error); }
});

app.post('/api/storefront/gift-cards', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ customer_email: z.string().trim().email().max(320), amount: z.number().min(0.01).max(5000), code: z.string().trim().max(80).optional().default(''), note: z.string().trim().max(500).optional().default('') }), req.body);
    const customers = await prisma.$queryRaw`SELECT "id", "name" FROM "StoreCustomer" WHERE lower("email") = ${data.customer_email.toLowerCase()} AND "active" = 1 LIMIT 1`;
    const customer = customers[0];
    if (!customer) { const error = new Error('Create or locate the customer storefront account before issuing a gift card.'); error.status = 404; throw error; }
    const now = new Date().toISOString();
    const id = `gift-${randomBytes(12).toString('hex')}`;
    const code = (data.code || giftCardCode(randomBytes)).toUpperCase();
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO "StoreGiftCard" ("id", "code", "customer_id", "initial_balance", "balance", "active", "created_at", "updated_at") VALUES (${id}, ${code}, ${customer.id}, ${data.amount}, ${data.amount}, ${1}, ${now}, ${now})`;
      await tx.$executeRaw`INSERT INTO "StoreGiftCardUsage" ("id", "gift_card_id", "amount", "balance_after", "usage_type", "note", "created_at") VALUES (${`gift-use-${randomBytes(12).toString('hex')}`}, ${id}, ${data.amount}, ${data.amount}, ${'issue'}, ${data.note || 'Gift card issued by staff.'}, ${now})`;
      await createCustomerNotification(tx, randomBytes, customer.id, 'gift_card', 'Gift card added', `A gift card ending in ${code.slice(-6)} with a $${Number(data.amount).toFixed(2)} balance was added to your account.`);
    });
    const rows = await prisma.$queryRaw`SELECT * FROM "StoreGiftCard" WHERE "id" = ${id} LIMIT 1`;
    res.status(201).json(rows[0]);
  } catch (error) { next(error); }
});

app.post('/api/storefront/gift-cards/:id/adjust', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ amount: z.number().positive().max(5000), note: z.string().trim().min(2).max(500), active: z.boolean().optional() }), req.body);
    const now = new Date().toISOString();
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`SELECT * FROM "StoreGiftCard" WHERE "id" = ${req.params.id} LIMIT 1`;
      const card = rows[0];
      if (!card) { const error = new Error('Gift card not found.'); error.status = 404; throw error; }
      const balance = Math.round((Number(card.balance) + data.amount) * 100) / 100;
      if (balance < 0) { const error = new Error('This adjustment would make the gift card balance negative.'); error.status = 400; throw error; }
      const active = data.active === undefined ? Boolean(card.active) : data.active;
      await tx.$executeRaw`UPDATE "StoreGiftCard" SET "balance" = ${balance}, "active" = ${active ? 1 : 0}, "updated_at" = ${now} WHERE "id" = ${card.id}`;
      await tx.$executeRaw`INSERT INTO "StoreGiftCardUsage" ("id", "gift_card_id", "amount", "balance_after", "usage_type", "note", "created_at") VALUES (${`gift-use-${randomBytes(12).toString('hex')}`}, ${card.id}, ${data.amount}, ${balance}, ${'staff_adjustment'}, ${data.note}, ${now})`;
      await createCustomerNotification(tx, randomBytes, card.customer_id, 'gift_card', 'Gift card updated', `Staff added $${data.amount.toFixed(2)} to your gift card ending in ${String(card.code).slice(-6)}. New balance: $${balance.toFixed(2)}. ${data.note}`);
    });
    const rows = await prisma.$queryRaw`SELECT * FROM "StoreGiftCard" WHERE "id" = ${req.params.id} LIMIT 1`;
    res.json(rows[0]);
  } catch (error) { next(error); }
});

app.post('/api/storefront/gift-cards/credits', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ customer_email: z.string().trim().email().max(320), amount: z.number().positive().max(5000), credit_type: z.enum(['free_gift', 'giveaway_balance']).default('giveaway_balance'), label: z.string().trim().min(2).max(160) }), req.body);
    const customers = await prisma.$queryRaw`SELECT "id" FROM "StoreCustomer" WHERE lower("email") = ${data.customer_email.toLowerCase()} AND "active" = 1 LIMIT 1`;
    const customer = customers[0]; if (!customer) { const error = new Error('Customer storefront account not found.'); error.status = 404; throw error; }
    const now = new Date().toISOString(); const id = `credit-${randomBytes(12).toString('hex')}`;
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO "StoreCustomerCredit" ("id", "customer_id", "credit_type", "label", "balance", "active", "created_at", "updated_at") VALUES (${id}, ${customer.id}, ${data.credit_type}, ${data.label}, ${data.amount}, ${1}, ${now}, ${now})`;
      await createCustomerNotification(tx, randomBytes, customer.id, data.credit_type, data.credit_type === 'free_gift' ? 'Free gift added' : 'Giveaway balance added', `${data.label}: $${data.amount.toFixed(2)} was added to your storefront account.`);
    });
    res.status(201).json({ id });
  } catch (error) { next(error); }
});

app.get('/api/storefront/reviews', async (_req, res, next) => {
  try {
    const rows = await prisma.$queryRaw`SELECT r.*, c."name" AS "customer_name", c."email" AS "customer_email", p."name" AS "product_name" FROM "StoreProductReview" r JOIN "StoreCustomer" c ON c."id" = r."customer_id" JOIN "Product" p ON p."id" = r."product_id" ORDER BY CASE r."status" WHEN 'pending' THEN 0 ELSE 1 END, r."created_at" DESC`;
    res.json(rows);
  } catch (error) { next(error); }
});
app.patch('/api/storefront/reviews/:id', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ status: z.enum(['approved', 'rejected']) }), req.body);
    const now = new Date().toISOString();
    const rows = await prisma.$queryRaw`SELECT "customer_id", "verified_purchase", "status" FROM "StoreProductReview" WHERE "id" = ${req.params.id} LIMIT 1`;
    const review = rows[0]; if (!review) { const error = new Error('Review not found'); error.status = 404; throw error; }
    await prisma.$executeRaw`UPDATE "StoreProductReview" SET "status" = ${data.status}, "updated_at" = ${now} WHERE "id" = ${req.params.id}`;
    if (data.status === 'approved' && review.status !== 'approved') await awardReward(prisma, randomBytes, review.customer_id, review.verified_purchase ? 25 : 10, 'review', req.params.id, review.verified_purchase ? 'Verified review approved' : 'Review approved');
    res.json({ updated: true });
  } catch (error) { next(error); }
});

app.post('/api/storefront/rewards', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ customer_email: z.string().trim().email().max(320), points: z.number().int().min(-10000).max(10000).refine((value) => value !== 0), source: z.enum(['referral', 'birthday', 'subscription', 'goodwill']), note: z.string().trim().min(2).max(500) }), req.body);
    const customers = await prisma.$queryRaw`SELECT "id" FROM "StoreCustomer" WHERE lower("email") = ${data.customer_email.toLowerCase()} AND "active" = 1 LIMIT 1`;
    const customer = customers[0]; if (!customer) { const error = new Error('Customer storefront account not found.'); error.status = 404; throw error; }
    await awardReward(prisma, randomBytes, customer.id, data.points, data.source, `staff-${Date.now()}-${randomBytes(4).toString('hex')}`, data.note);
    res.status(201).json({ awarded: true });
  } catch (error) { next(error); }
});

app.get('/api/storefront/discount-codes', async (_req, res, next) => {
  try {
    const codes = await prisma.$queryRaw`SELECT * FROM "StoreDiscountCode" ORDER BY "created_at" DESC`;
    const redemptions = await prisma.$queryRaw`
      SELECT r.*, c."code", o."order_number", o."customer_email"
      FROM "StoreDiscountRedemption" r
      JOIN "StoreDiscountCode" c ON c."id" = r."discount_code_id"
      JOIN "StoreOrder" o ON o."id" = r."order_id"
      ORDER BY r."created_at" DESC LIMIT 250
    `;
    res.json({ codes, redemptions });
  } catch (error) { next(error); }
});

app.post('/api/storefront/discount-codes', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({
      code: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9_-]+$/),
      discount_type: z.enum(['percent', 'fixed']).default('percent'),
      discount_value: z.number().positive().max(10000),
      minimum_subtotal: z.number().min(0).max(100000).default(0),
      starts_at: z.string().datetime().optional().nullable(),
      expires_at: z.string().datetime().optional().nullable(),
      usage_limit: z.number().int().min(0).max(100000).default(0),
      per_customer_limit: z.number().int().min(0).max(100000).default(1),
      stack_with_mix: z.boolean().default(true),
      stack_with_gift_card: z.boolean().default(true),
      active: z.boolean().default(true),
    }).superRefine((value, issue) => {
      if (value.discount_type === 'percent' && value.discount_value > 100) issue.addIssue({ code: 'custom', message: 'Percent discounts cannot exceed 100.' });
      if (value.starts_at && value.expires_at && value.starts_at >= value.expires_at) issue.addIssue({ code: 'custom', message: 'Expiration must be after the start date.' });
    }), req.body);
    const now = new Date().toISOString();
    const id = `coupon-${randomBytes(12).toString('hex')}`;
    const code = data.code.toUpperCase();
    await prisma.$executeRaw`INSERT INTO "StoreDiscountCode" ("id", "code", "discount_type", "discount_value", "minimum_subtotal", "starts_at", "expires_at", "usage_limit", "per_customer_limit", "stack_with_mix", "stack_with_gift_card", "active", "created_at", "updated_at") VALUES (${id}, ${code}, ${data.discount_type}, ${data.discount_value}, ${data.minimum_subtotal}, ${data.starts_at || null}, ${data.expires_at || null}, ${data.usage_limit}, ${data.per_customer_limit}, ${data.stack_with_mix ? 1 : 0}, ${data.stack_with_gift_card ? 1 : 0}, ${data.active ? 1 : 0}, ${now}, ${now})`;
    const rows = await prisma.$queryRaw`SELECT * FROM "StoreDiscountCode" WHERE "id" = ${id} LIMIT 1`;
    res.status(201).json(rows[0]);
  } catch (error) { next(error); }
});

app.patch('/api/storefront/discount-codes/:id', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ active: z.boolean().optional(), expires_at: z.string().datetime().optional().nullable(), usage_limit: z.number().int().min(0).max(100000).optional(), per_customer_limit: z.number().int().min(0).max(100000).optional() }), req.body);
    const rows = await prisma.$queryRaw`SELECT * FROM "StoreDiscountCode" WHERE "id" = ${req.params.id} LIMIT 1`;
    const current = rows[0];
    if (!current) { const error = new Error('Discount code not found.'); error.status = 404; throw error; }
    const now = new Date().toISOString();
    await prisma.$executeRaw`UPDATE "StoreDiscountCode" SET "active" = ${data.active === undefined ? current.active : data.active ? 1 : 0}, "expires_at" = ${data.expires_at === undefined ? current.expires_at : data.expires_at}, "usage_limit" = ${data.usage_limit ?? current.usage_limit}, "per_customer_limit" = ${data.per_customer_limit ?? current.per_customer_limit}, "updated_at" = ${now} WHERE "id" = ${current.id}`;
    const updated = await prisma.$queryRaw`SELECT * FROM "StoreDiscountCode" WHERE "id" = ${current.id} LIMIT 1`;
    res.json(updated[0]);
  } catch (error) { next(error); }
});

app.get('/api/storefront/gallery', async (_req, res, next) => {
  try {
    const rows = await prisma.$queryRaw`SELECT g.*, c."name" AS "customer_name", c."email" AS "customer_email" FROM "StoreCustomerGalleryItem" g JOIN "StoreCustomer" c ON c."id" = g."customer_id" ORDER BY CASE g."status" WHEN 'pending' THEN 0 ELSE 1 END, g."updated_at" DESC`;
    res.json(rows);
  } catch (error) { next(error); }
});

app.patch('/api/storefront/gallery/:id', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ status: z.enum(['approved', 'rejected']) }), req.body);
    const changed = await prisma.$executeRaw`UPDATE "StoreCustomerGalleryItem" SET "status" = ${data.status}, "updated_at" = ${new Date().toISOString()} WHERE "id" = ${req.params.id}`;
    if (!changed) { const error = new Error('Gallery item not found.'); error.status = 404; throw error; }
    res.json({ updated: true });
  } catch (error) { next(error); }
});

app.get('/api/storefront/membership', async (_req, res, next) => {
  try {
    const programRows = await prisma.$queryRaw`SELECT * FROM "StoreMembershipProgram" WHERE "id" = 'default' LIMIT 1`;
    const members = await prisma.$queryRaw`SELECT m.*, c."name" AS "customer_name", c."email" AS "customer_email" FROM "StoreCustomerMembership" m JOIN "StoreCustomer" c ON c."id" = m."customer_id" ORDER BY CASE m."status" WHEN 'active' THEN 0 ELSE 1 END, m."updated_at" DESC`;
    const samples = await prisma.product.findMany({ where: { product_type: 'sample' }, select: { id: true, name: true, quantity_in_stock: true } });
    res.json({ program: programRows[0] || { id: 'default', name: 'Candle Club', discount_percent: 0, sample_product_id: '', active: false }, members, samples });
  } catch (error) { next(error); }
});

app.put('/api/storefront/membership/program', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ name: z.string().trim().min(2).max(120), discount_percent: z.number().min(0).max(100), sample_product_id: z.string().max(120).optional().default(''), active: z.boolean() }), req.body);
    if (data.sample_product_id) { const sample = await prisma.product.findUnique({ where: { id: data.sample_product_id }, select: { product_type: true } }); if (!sample || sample.product_type !== 'sample') { const error = new Error('Choose a sample product for the member sample benefit.'); error.status = 400; throw error; } }
    const now = new Date().toISOString();
    await prisma.$executeRaw`INSERT INTO "StoreMembershipProgram" ("id", "name", "discount_percent", "sample_product_id", "active", "created_at", "updated_at") VALUES (${'default'}, ${data.name}, ${data.discount_percent}, ${data.sample_product_id}, ${data.active ? 1 : 0}, ${now}, ${now}) ON CONFLICT("id") DO UPDATE SET "name" = excluded."name", "discount_percent" = excluded."discount_percent", "sample_product_id" = excluded."sample_product_id", "active" = excluded."active", "updated_at" = excluded."updated_at"`;
    const rows = await prisma.$queryRaw`SELECT * FROM "StoreMembershipProgram" WHERE "id" = 'default' LIMIT 1`; res.json(rows[0]);
  } catch (error) { next(error); }
});

app.post('/api/storefront/membership/members', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ customer_email: z.string().trim().email().max(320), ends_at: z.string().datetime().optional().nullable() }), req.body);
    const customers = await prisma.$queryRaw`SELECT "id", "name" FROM "StoreCustomer" WHERE lower("email") = ${data.customer_email.toLowerCase()} AND "active" = 1 LIMIT 1`; const customer = customers[0];
    if (!customer) { const error = new Error('Customer storefront account not found.'); error.status = 404; throw error; }
    const now = new Date().toISOString();
    await prisma.$executeRaw`INSERT INTO "StoreCustomerMembership" ("id", "customer_id", "status", "started_at", "ends_at", "created_at", "updated_at") VALUES (${`member-${randomBytes(12).toString('hex')}`}, ${customer.id}, ${'active'}, ${now}, ${data.ends_at || null}, ${now}, ${now}) ON CONFLICT("customer_id") DO UPDATE SET "status" = 'active', "started_at" = excluded."started_at", "ends_at" = excluded."ends_at", "updated_at" = excluded."updated_at"`;
    await createCustomerNotification(prisma, randomBytes, customer.id, 'membership', 'Membership activated', 'Your storefront membership is active. Member discounts, samples, exclusive scents, and eligible early access are now available.');
    res.status(201).json({ enrolled: true });
  } catch (error) { next(error); }
});

app.patch('/api/storefront/membership/members/:id', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ status: z.enum(['active', 'paused', 'cancelled']) }), req.body); const now = new Date().toISOString();
    const rows = await prisma.$queryRaw`SELECT "customer_id" FROM "StoreCustomerMembership" WHERE "id" = ${req.params.id} LIMIT 1`; if (!rows[0]) { const error = new Error('Membership not found.'); error.status = 404; throw error; }
    await prisma.$executeRaw`UPDATE "StoreCustomerMembership" SET "status" = ${data.status}, "updated_at" = ${now} WHERE "id" = ${req.params.id}`;
    await createCustomerNotification(prisma, randomBytes, rows[0].customer_id, 'membership', `Membership ${data.status}`, `Your storefront membership is now ${data.status}.`); res.json({ updated: true });
  } catch (error) { next(error); }
});

app.get('/api/storefront/subscriptions/plans', async (_req, res, next) => { try { res.json(await prisma.$queryRaw`SELECT * FROM "StoreSubscriptionPlan" ORDER BY "created_at" DESC`); } catch (error) { next(error); } });
app.get('/api/storefront/pickup', async (_req, res, next) => { try { const settings = await prisma.$queryRaw`SELECT * FROM "StorePickupSettings" WHERE "id" = 'default' LIMIT 1`; const slots = await prisma.$queryRaw`SELECT * FROM "StorePickupSlot" ORDER BY "starts_at" ASC`; res.json({ settings: settings[0] || { instructions: '', cutoff_hours: 24, active: false }, slots }); } catch (error) { next(error); } });
app.put('/api/storefront/pickup/settings', async (req, res, next) => { try { const data = parseOrThrow(z.object({ instructions: z.string().max(2000).default(''), cutoff_hours: z.number().int().min(0).max(168).default(24), active: z.boolean() }), req.body); await prisma.$executeRaw`INSERT INTO "StorePickupSettings" ("id", "instructions", "cutoff_hours", "active", "updated_at") VALUES (${'default'}, ${data.instructions}, ${data.cutoff_hours}, ${data.active ? 1 : 0}, ${new Date().toISOString()}) ON CONFLICT("id") DO UPDATE SET "instructions" = excluded."instructions", "cutoff_hours" = excluded."cutoff_hours", "active" = excluded."active", "updated_at" = excluded."updated_at"`; res.json({ updated: true }); } catch (error) { next(error); } });
app.post('/api/storefront/pickup/slots', async (req, res, next) => { try { const data = parseOrThrow(z.object({ starts_at: z.string().datetime(), capacity: z.number().int().min(1).max(100) }), req.body); if (new Date(data.starts_at).getTime() <= Date.now()) { const error = new Error('Pickup slot must be in the future.'); error.status = 400; throw error; } await prisma.$executeRaw`INSERT INTO "StorePickupSlot" ("id", "starts_at", "capacity", "active", "created_at") VALUES (${`pickup-${randomBytes(12).toString('hex')}`}, ${data.starts_at}, ${data.capacity}, ${1}, ${new Date().toISOString()})`; res.status(201).json({ created: true }); } catch (error) { next(error); } });
app.patch('/api/storefront/pickup/slots/:id', async (req, res, next) => { try { const data = parseOrThrow(z.object({ active: z.boolean() }), req.body); const changed = await prisma.$executeRaw`UPDATE "StorePickupSlot" SET "active" = ${data.active ? 1 : 0} WHERE "id" = ${req.params.id}`; if (!changed) { const error = new Error('Pickup slot not found.'); error.status = 404; throw error; } res.json({ updated: true }); } catch (error) { next(error); } });
app.post('/api/storefront/subscriptions/plans', async (req, res, next) => { try { const data = parseOrThrow(z.object({ name: z.string().trim().min(2).max(120), plan_type: z.enum(['one_candle', 'two_candle', 'discovery', 'seasonal', 'candle_of_month']), description: z.string().trim().max(1000).optional().default(''), candle_count: z.number().int().min(1).max(24), monthly_price: z.number().min(0).max(10000), quarterly_price: z.number().min(0).max(30000), monthly_delivery_day: z.number().int().min(1).max(28).default(1), quarterly_start_month: z.number().int().min(1).max(12).default(1), active: z.boolean().default(true) }), req.body); const now = new Date().toISOString(); const id = `sub-plan-${randomBytes(12).toString('hex')}`; await prisma.$executeRaw`INSERT INTO "StoreSubscriptionPlan" ("id", "name", "plan_type", "description", "candle_count", "monthly_price", "quarterly_price", "monthly_delivery_day", "quarterly_start_month", "active", "created_at", "updated_at") VALUES (${id}, ${data.name}, ${data.plan_type}, ${data.description}, ${data.candle_count}, ${data.monthly_price}, ${data.quarterly_price}, ${data.monthly_delivery_day}, ${data.quarterly_start_month}, ${data.active ? 1 : 0}, ${now}, ${now})`; const rows = await prisma.$queryRaw`SELECT * FROM "StoreSubscriptionPlan" WHERE "id" = ${id} LIMIT 1`; res.status(201).json(rows[0]); } catch (error) { next(error); } });
app.patch('/api/storefront/subscriptions/plans/:id', async (req, res, next) => { try { const data = parseOrThrow(z.object({ active: z.boolean() }), req.body); const changed = await prisma.$executeRaw`UPDATE "StoreSubscriptionPlan" SET "active" = ${data.active ? 1 : 0}, "updated_at" = ${new Date().toISOString()} WHERE "id" = ${req.params.id}`; if (!changed) { const error = new Error('Subscription plan not found.'); error.status = 404; throw error; } res.json({ updated: true }); } catch (error) { next(error); } });
app.get('/api/storefront/subscriptions/fulfillment', async (_req, res, next) => { try { res.json(await prisma.$queryRaw`SELECT f.*, s."status" AS "subscription_status", p."name" AS "plan_name", c."name" AS "customer_name", c."email" AS "customer_email" FROM "StoreSubscriptionFulfillment" f JOIN "StoreCustomerSubscription" s ON s."id" = f."subscription_id" JOIN "StoreSubscriptionPlan" p ON p."id" = s."plan_id" JOIN "StoreCustomer" c ON c."id" = s."customer_id" ORDER BY f."shipment_due_at" ASC`); } catch (error) { next(error); } });
app.patch('/api/storefront/subscriptions/fulfillment/:id', async (req, res, next) => { try { const data = parseOrThrow(z.object({ status: z.enum(['pending', 'in_production', 'ready', 'shipped', 'cancelled']), staff_note: z.string().trim().max(2000).optional().default('') }), req.body); const now = new Date().toISOString(); const rows = await prisma.$queryRaw`SELECT s."customer_id", p."name" AS "plan_name" FROM "StoreSubscriptionFulfillment" f JOIN "StoreCustomerSubscription" s ON s."id" = f."subscription_id" JOIN "StoreSubscriptionPlan" p ON p."id" = s."plan_id" WHERE f."id" = ${req.params.id} LIMIT 1`; if (!rows[0]) { const error = new Error('Subscription fulfillment record not found.'); error.status = 404; throw error; } await prisma.$executeRaw`UPDATE "StoreSubscriptionFulfillment" SET "status" = ${data.status}, "staff_note" = ${data.staff_note}, "updated_at" = ${now} WHERE "id" = ${req.params.id}`; if (['ready', 'shipped', 'cancelled'].includes(data.status)) await createCustomerNotification(prisma, randomBytes, rows[0].customer_id, 'subscription', `Subscription ${data.status.replace('_', ' ')}`, `${rows[0].plan_name} is now ${data.status.replace('_', ' ')}.`); res.json({ updated: true }); } catch (error) { next(error); } });

app.get('/api/storefront/launch-tools', async (_req, res, next) => {
  try {
    const [polls, requests] = await Promise.all([
      prisma.$queryRaw`SELECT p.*, COUNT(v."id") AS "vote_count" FROM "StoreScentPoll" p LEFT JOIN "StoreScentPollVote" v ON v."poll_id" = p."id" GROUP BY p."id" ORDER BY p."created_at" DESC`,
      prisma.$queryRaw`SELECT * FROM "StoreCustomScentRequest" ORDER BY CASE "status" WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, "created_at" DESC`,
    ]);
    res.json({ polls, requests });
  } catch (e) { next(e); }
});

app.post('/api/storefront/launch-tools/polls', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ title: z.string().trim().min(3).max(180), poll_type: z.enum(['next_scent', 'retired_scent']).default('next_scent'), options: z.array(z.string().trim().min(1).max(120)).min(2).max(12) }), req.body);
    const now = new Date().toISOString();
    const id = `poll-${randomBytes(12).toString('hex')}`;
    await prisma.$executeRaw`INSERT INTO "StoreScentPoll" ("id", "title", "poll_type", "options_json", "active", "created_at", "updated_at") VALUES (${id}, ${data.title}, ${data.poll_type}, ${JSON.stringify([...new Set(data.options)])}, ${1}, ${now}, ${now})`;
    const rows = await prisma.$queryRaw`SELECT * FROM "StoreScentPoll" WHERE "id" = ${id} LIMIT 1`;
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

app.patch('/api/storefront/launch-tools/polls/:id', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ active: z.boolean().optional(), title: z.string().trim().min(3).max(180).optional() }), req.body);
    const rows = await prisma.$queryRaw`SELECT * FROM "StoreScentPoll" WHERE "id" = ${req.params.id} LIMIT 1`;
    if (!rows[0]) { const error = new Error('Poll not found'); error.status = 404; throw error; }
    const now = new Date().toISOString();
    await prisma.$executeRaw`UPDATE "StoreScentPoll" SET "active" = ${data.active === undefined ? rows[0].active : data.active ? 1 : 0}, "title" = ${data.title ?? rows[0].title}, "updated_at" = ${now} WHERE "id" = ${req.params.id}`;
    const updated = await prisma.$queryRaw`SELECT * FROM "StoreScentPoll" WHERE "id" = ${req.params.id} LIMIT 1`;
    res.json(updated[0]);
  } catch (e) { next(e); }
});

app.patch('/api/storefront/launch-tools/requests/:id', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ status: z.enum(['new', 'reviewing', 'quoted', 'accepted', 'declined', 'closed']), quote_amount: z.number().min(0).max(100000).default(0), admin_notes: z.string().max(4000).optional().default('') }), req.body);
    const now = new Date().toISOString();
    await prisma.$executeRaw`UPDATE "StoreCustomScentRequest" SET "status" = ${data.status}, "quote_amount" = ${data.quote_amount}, "admin_notes" = ${data.admin_notes}, "updated_at" = ${now} WHERE "id" = ${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.get('/api/storefront/event-favors', async (_req, res, next) => { try { res.json(await prisma.$queryRaw`SELECT * FROM "StoreEventFavorRequest" ORDER BY CASE "status" WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, "created_at" DESC`); } catch (error) { next(error); } });
app.get('/api/storefront/custom-order-quotes', async (_req, res, next) => { try { res.json(await prisma.$queryRaw`SELECT * FROM "StoreCustomOrderQuote" ORDER BY "updated_at" DESC`); } catch (error) { next(error); } });
app.get('/api/storefront/workshops', async (_req, res, next) => { try { const workshops = await prisma.$queryRaw`SELECT s.*, COALESCE(SUM(b."party_size"), 0) AS "booked" FROM "StoreWorkshopSlot" s LEFT JOIN "StoreWorkshopBooking" b ON b."slot_id" = s."id" AND b."status" <> 'cancelled' GROUP BY s."id" ORDER BY s."starts_at" ASC`; res.json(workshops.map((workshop) => ({ ...workshop, booked: Number(workshop.booked) }))); } catch (error) { next(error); } });
app.post('/api/storefront/workshops', async (req, res, next) => { try { const data = parseOrThrow(z.object({ starts_at: z.string().datetime(), capacity: z.number().int().min(1).max(100), deposit_amount: z.number().min(0).max(10000) }), req.body); await prisma.$executeRaw`INSERT INTO "StoreWorkshopSlot" ("id", "starts_at", "capacity", "deposit_amount") VALUES (${`workshop-${randomBytes(12).toString('hex')}`}, ${data.starts_at}, ${data.capacity}, ${data.deposit_amount})`; res.status(201).json({ created: true }); } catch (error) { next(error); } });
app.patch('/api/storefront/workshops/:id', async (req, res, next) => { try { const data = parseOrThrow(z.object({ active: z.boolean() }), req.body); const changed = await prisma.$executeRaw`UPDATE "StoreWorkshopSlot" SET "active" = ${data.active ? 1 : 0} WHERE "id" = ${req.params.id}`; if (!changed) { const error = new Error('Workshop slot not found.'); error.status = 404; throw error; } res.json({ updated: true }); } catch (error) { next(error); } });
app.get('/api/storefront/workshop-bookings', async (_req, res, next) => { try { res.json(await prisma.$queryRaw`SELECT b.*, s."starts_at", s."deposit_amount" FROM "StoreWorkshopBooking" b JOIN "StoreWorkshopSlot" s ON s."id" = b."slot_id" ORDER BY s."starts_at" ASC, b."created_at" ASC`); } catch (error) { next(error); } });
app.patch('/api/storefront/workshop-bookings/:id', async (req, res, next) => { try { const data = parseOrThrow(z.object({ status: z.enum(['confirmed', 'cancelled', 'attended', 'no_show']) }), req.body); const changed = await prisma.$executeRaw`UPDATE "StoreWorkshopBooking" SET "status" = ${data.status} WHERE "id" = ${req.params.id}`; if (!changed) { const error = new Error('Workshop booking not found.'); error.status = 404; throw error; } res.json({ updated: true }); } catch (error) { next(error); } });
app.get('/api/storefront/workshop-party-requests', async (_req, res, next) => { try { res.json(await prisma.$queryRaw`SELECT * FROM "StoreWorkshopPartyRequest" ORDER BY CASE "status" WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, "requested_date" ASC, "created_at" DESC`); } catch (error) { next(error); } });
app.patch('/api/storefront/workshop-party-requests/:id', async (req, res, next) => { try { const data = parseOrThrow(z.object({ status: z.enum(['new', 'reviewing', 'quoted', 'confirmed', 'declined', 'closed']), admin_notes: z.string().max(4000).default('') }), req.body); const changed = await prisma.$executeRaw`UPDATE "StoreWorkshopPartyRequest" SET "status" = ${data.status}, "admin_notes" = ${data.admin_notes}, "updated_at" = ${new Date().toISOString()} WHERE "id" = ${req.params.id}`; if (!changed) { const error = new Error('Party request not found.'); error.status = 404; throw error; } res.json({ updated: true }); } catch (error) { next(error); } });
app.get('/api/storefront/refill-program', async (_req, res, next) => { try { const existing = await prisma.$queryRaw`SELECT * FROM "StoreRefillProgram" WHERE "id" = 'default' LIMIT 1`; if (!existing[0]) { await prisma.$executeRaw`INSERT INTO "StoreRefillProgram" ("id", "eligibility_rules", "return_instructions") VALUES ('default', ${'Clean, undamaged containers from this storefront are eligible for refill.'}, ${'Return the cleaned, empty container to the store for inspection.'})`; } res.json((await prisma.$queryRaw`SELECT * FROM "StoreRefillProgram" WHERE "id" = 'default' LIMIT 1`)[0]); } catch (error) { next(error); } });
app.put('/api/storefront/refill-program', async (req, res, next) => { try { const data = parseOrThrow(z.object({ active: z.boolean(), discount_percent: z.number().min(0).max(100), eligibility_rules: z.string().trim().max(3000), return_instructions: z.string().trim().max(3000) }), req.body); await prisma.$executeRaw`INSERT INTO "StoreRefillProgram" ("id", "active", "discount_percent", "eligibility_rules", "return_instructions", "updated_at") VALUES ('default', ${data.active ? 1 : 0}, ${data.discount_percent}, ${data.eligibility_rules}, ${data.return_instructions}, ${new Date().toISOString()}) ON CONFLICT("id") DO UPDATE SET "active" = excluded."active", "discount_percent" = excluded."discount_percent", "eligibility_rules" = excluded."eligibility_rules", "return_instructions" = excluded."return_instructions", "updated_at" = excluded."updated_at"`; res.json({ updated: true }); } catch (error) { next(error); } });
app.get('/api/storefront/refill-requests', async (_req, res, next) => { try { res.json(await prisma.$queryRaw`SELECT * FROM "StoreRefillRequest" ORDER BY CASE "status" WHEN 'new' THEN 0 WHEN 'received' THEN 1 WHEN 'in_production' THEN 2 ELSE 3 END, "created_at" DESC`); } catch (error) { next(error); } });
app.patch('/api/storefront/refill-requests/:id', async (req, res, next) => { try { const data = parseOrThrow(z.object({ status: z.enum(['new', 'eligible', 'received', 'in_production', 'ready', 'completed', 'declined', 'issue']), container_received: z.boolean(), discount_percent: z.number().min(0).max(100), staff_notes: z.string().max(4000).default('') }), req.body); const changed = await prisma.$executeRaw`UPDATE "StoreRefillRequest" SET "status" = ${data.status}, "container_received" = ${data.container_received ? 1 : 0}, "discount_percent" = ${data.discount_percent}, "staff_notes" = ${data.staff_notes}, "updated_at" = ${new Date().toISOString()} WHERE "id" = ${req.params.id}`; if (!changed) { const error = new Error('Refill request not found.'); error.status = 404; throw error; } res.json({ updated: true }); } catch (error) { next(error); } });
app.post('/api/storefront/custom-order-quotes', async (req, res, next) => { try { const data = parseOrThrow(z.object({ customer_name: z.string().trim().min(1).max(120), customer_email: z.string().trim().email().max(254), title: z.string().trim().min(2).max(160), details: z.string().max(4000).default(''), total_amount: z.number().min(0).max(100000), deposit_amount: z.number().min(0).max(100000) }).refine((value) => value.deposit_amount <= value.total_amount, { message: 'Deposit cannot exceed total.' }), req.body); const now = new Date().toISOString(); const id = `custom-quote-${randomBytes(12).toString('hex')}`; const shareCode = randomBytes(16).toString('hex'); await prisma.$executeRaw`INSERT INTO "StoreCustomOrderQuote" ("id", "share_code", "customer_name", "customer_email", "title", "details", "revision", "status", "total_amount", "deposit_amount", "created_at", "updated_at") VALUES (${id}, ${shareCode}, ${data.customer_name}, ${data.customer_email.toLowerCase()}, ${data.title}, ${data.details}, ${1}, ${'sent'}, ${data.total_amount}, ${data.deposit_amount}, ${now}, ${now})`; res.status(201).json({ id, share_code: shareCode }); } catch (error) { next(error); } });
app.patch('/api/storefront/custom-order-quotes/:id', async (req, res, next) => { try { const data = parseOrThrow(z.object({ status: z.enum(['draft', 'sent', 'approved', 'declined', 'in_production', 'complete']), total_amount: z.number().min(0).max(100000), deposit_amount: z.number().min(0).max(100000), deposit_paid: z.boolean(), final_paid: z.boolean(), details: z.string().max(4000).default('') }).refine((value) => value.deposit_amount <= value.total_amount, { message: 'Deposit cannot exceed total.' }), req.body); const now = new Date().toISOString(); const changed = await prisma.$executeRaw`UPDATE "StoreCustomOrderQuote" SET "status" = ${data.status}, "total_amount" = ${data.total_amount}, "deposit_amount" = ${data.deposit_amount}, "deposit_paid" = ${data.deposit_paid ? 1 : 0}, "final_paid" = ${data.final_paid ? 1 : 0}, "details" = ${data.details}, "revision" = "revision" + 1, "updated_at" = ${now} WHERE "id" = ${req.params.id}`; if (!changed) { const error = new Error('Custom order quote not found.'); error.status = 404; throw error; } res.json({ updated: true }); } catch (error) { next(error); } });
app.get('/api/storefront/feature-settings', async (_req, res, next) => { try { res.json(await prisma.$queryRaw`SELECT * FROM "StorefrontFeatureSetting" ORDER BY "feature_key" ASC`); } catch (error) { next(error); } });
app.put('/api/storefront/feature-settings/:key', async (req, res, next) => { try { const key = parseOrThrow(z.enum(['custom_labels', 'custom_scent', 'event_favors', 'refill_program']), req.params.key); const data = parseOrThrow(z.object({ enabled: z.boolean() }), req.body); await prisma.$executeRaw`INSERT INTO "StorefrontFeatureSetting" ("feature_key", "enabled", "updated_at") VALUES (${key}, ${data.enabled ? 1 : 0}, ${new Date().toISOString()}) ON CONFLICT("feature_key") DO UPDATE SET "enabled" = excluded."enabled", "updated_at" = excluded."updated_at"`; res.json({ updated: true }); } catch (error) { next(error); } });
app.patch('/api/storefront/event-favors/:id', async (req, res, next) => { try { const data = parseOrThrow(z.object({ status: z.enum(['new', 'reviewing', 'quoted', 'accepted', 'declined', 'closed']), quote_amount: z.number().min(0).max(100000).default(0) }), req.body); const changed = await prisma.$executeRaw`UPDATE "StoreEventFavorRequest" SET "status" = ${data.status}, "estimate_amount" = ${data.quote_amount}, "updated_at" = ${new Date().toISOString()} WHERE "id" = ${req.params.id}`; if (!changed) { const error = new Error('Event favor request not found.'); error.status = 404; throw error; } res.json({ updated: true }); } catch (error) { next(error); } });

app.get('/api/storefront/orders', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const now = new Date().toISOString();
    await prisma.$executeRaw`
      UPDATE "StoreOrder"
      SET
        "status" = 'cancelled',
        "fulfillment_status" = 'cancelled',
        "staff_note" = CASE WHEN "staff_note" = '' THEN 'Payment reservation expired.' ELSE "staff_note" END,
        "updated_at" = ${now}
      WHERE "status" = 'awaiting_payment'
        AND "payment_status" = 'unpaid'
        AND "reservation_expires_at" IS NOT NULL
        AND "reservation_expires_at" <= ${now}
    `;
    const rows = await prisma.$queryRaw`
      SELECT
        o."id", o."order_number", o."customer_name", o."customer_email", o."customer_phone",
        o."status", o."payment_status", o."fulfillment_status", o."currency", o."subtotal_amount",
        o."discount_amount", o."shipping_amount", o."tax_amount", o."total_amount", o."tracking_number", o."staff_note",
        o."reservation_expires_at", o."paid_at", o."created_at", o."updated_at",
        COUNT(i."id") AS "item_count"
      FROM "StoreOrder" o
      LEFT JOIN "StoreOrderItem" i ON i."order_id" = o."id"
      GROUP BY o."id"
      ORDER BY o."created_at" DESC
    `;
    res.json(rows.map((row) => ({ ...row, item_count: Number(row.item_count || 0) })));
  } catch (e) {
    next(e);
  }
});

app.get('/api/storefront/orders/:orderId', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const orderRows = await prisma.$queryRaw`
      SELECT * FROM "StoreOrder" WHERE "id" = ${req.params.orderId} LIMIT 1
    `;
    const order = orderRows[0];
    if (!order) {
      const error = new Error('Order not found');
      error.status = 404;
      throw error;
    }
    const [items, payments] = await Promise.all([
      prisma.$queryRaw`
        SELECT "id", "product_id", "product_name", "product_image_data", "unit_price", "quantity", "line_total", "customization_json"
        FROM "StoreOrderItem" WHERE "order_id" = ${order.id} ORDER BY "created_at" ASC
      `,
      prisma.$queryRaw`
        SELECT "id", "provider", "provider_payment_id", "status", "amount", "currency", "created_at", "updated_at"
        FROM "StoreOrderPayment" WHERE "order_id" = ${order.id} ORDER BY "created_at" ASC
      `,
    ]);
    res.json({ ...order, items, payments });
  } catch (e) {
    next(e);
  }
});

app.patch('/api/storefront/orders/:orderId/items/:itemId/label-review', async (req, res, next) => {
  try {
    const data = parseOrThrow(z.object({ label_approval_status: z.enum(['pending_review', 'approved', 'changes_requested']), label_production_notes: z.string().trim().max(1000).default('') }), req.body);
    const rows = await prisma.$queryRaw`SELECT "customization_json" FROM "StoreOrderItem" WHERE "id" = ${req.params.itemId} AND "order_id" = ${req.params.orderId} LIMIT 1`;
    if (!rows[0]) { const error = new Error('Order item not found.'); error.status = 404; throw error; }
    let customization = {};
    try { customization = JSON.parse(rows[0].customization_json || '{}'); } catch { customization = {}; }
    if (!Object.prototype.hasOwnProperty.call(customization, 'label_approval_status')) { const error = new Error('This order item does not have a custom label.'); error.status = 400; throw error; }
    const updated = { ...customization, label_approval_status: data.label_approval_status, label_production_notes: data.label_production_notes };
    await prisma.$executeRaw`UPDATE "StoreOrderItem" SET "customization_json" = ${JSON.stringify(updated)} WHERE "id" = ${req.params.itemId}`;
    res.json({ updated: true, customization: updated });
  } catch (error) { next(error); }
});

app.patch('/api/storefront/orders/:orderId', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const data = parseOrThrow(storefrontOrderUpdateInput, req.body);
    const existingRows = await prisma.$queryRaw`
      SELECT * FROM "StoreOrder" WHERE "id" = ${req.params.orderId} LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) {
      const error = new Error('Order not found');
      error.status = 404;
      throw error;
    }
    const requestedStatus = data.status ?? existing.status;
    const requestedPaymentStatus = data.payment_status ?? existing.payment_status;
    if (data.payment_status !== undefined || requestedStatus === 'paid' || requestedStatus === 'refunded') {
      const error = new Error('Payment status, paid orders, and refunds must be recorded by the payment provider flow.');
      error.status = 400;
      throw error;
    }
    if (existing.payment_status !== 'paid' && !['awaiting_payment', 'cancelled'].includes(requestedStatus)) {
      const error = new Error('An order must have a verified payment before it can enter fulfillment.');
      error.status = 409;
      throw error;
    }
    if (existing.payment_status !== 'paid' && data.fulfillment_status !== undefined) {
      const error = new Error('An order must have a verified payment before fulfillment can be updated.');
      error.status = 409;
      throw error;
    }
    if (existing.payment_status === 'paid' && requestedStatus === 'cancelled') {
      const error = new Error('Paid orders must be refunded through the payment provider before they can be cancelled.');
      error.status = 409;
      throw error;
    }
    if (['cancelled', 'refunded'].includes(existing.status) && requestedStatus !== existing.status) {
      const error = new Error('Cancelled or refunded orders cannot be reopened.');
      error.status = 409;
      throw error;
    }
    if (['cancelled', 'refunded'].includes(existing.status) && (data.fulfillment_status !== undefined || data.tracking_number !== undefined)) {
      const error = new Error('Cancelled or refunded orders cannot be updated.');
      error.status = 409;
      throw error;
    }
    const now = new Date().toISOString();
    await prisma.$executeRaw`
      UPDATE "StoreOrder"
      SET
        "status" = ${requestedStatus},
        "fulfillment_status" = ${data.fulfillment_status ?? existing.fulfillment_status},
        "payment_status" = ${existing.payment_status},
        "tracking_number" = ${data.tracking_number ?? existing.tracking_number},
        "staff_note" = ${data.staff_note ?? existing.staff_note},
        "updated_at" = ${now}
      WHERE "id" = ${existing.id}
    `;
    const updatedRows = await prisma.$queryRaw`
      SELECT * FROM "StoreOrder" WHERE "id" = ${existing.id} LIMIT 1
    `;
    const updated = updatedRows[0];
    const emailType = updated.status === 'shipped' ? 'shipping_update' : updated.status === 'ready_for_pickup' ? 'pickup_ready' : updated.status === 'cancelled' ? 'order_cancelled' : '';
    if (emailType) await sendStoreEmail(prisma, () => randomBytes(16).toString('hex'), { eventType: emailType, recipient: updated.customer_email, subject: `${emailType === 'shipping_update' ? 'Your order shipped' : emailType === 'pickup_ready' ? 'Your order is ready' : 'Your order was cancelled'}: ${updated.order_number}`, text: updated.tracking_number ? `Order ${updated.order_number} tracking: ${updated.tracking_number}` : `Order ${updated.order_number} status: ${updated.status.replace(/_/g, ' ')}.` });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

app.delete('/api/storefront/orders/:orderId', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) { const error = new Error('Unauthorized'); error.status = 401; throw error; }
    const rows = await prisma.$queryRaw`SELECT "id", "status" FROM "StoreOrder" WHERE "id" = ${req.params.orderId} LIMIT 1`;
    const order = rows[0];
    if (!order) { const error = new Error('Order not found'); error.status = 404; throw error; }
    if (order.status !== 'cancelled') { const error = new Error('Only cancelled orders can be deleted.'); error.status = 409; throw error; }
    await prisma.$executeRaw`DELETE FROM "StoreOrder" WHERE "id" = ${order.id} AND "status" = ${'cancelled'}`;
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

app.post('/api/storefront/orders/:orderId/refund', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) { const error = new Error('Unauthorized'); error.status = 401; throw error; }
    const orderRows = await prisma.$queryRaw`SELECT * FROM "StoreOrder" WHERE "id" = ${req.params.orderId} LIMIT 1`;
    const order = orderRows[0];
    if (!order) { const error = new Error('Order not found'); error.status = 404; throw error; }
    if (order.payment_status !== 'paid' || order.status === 'refunded') { const error = new Error('Only a paid order can be refunded.'); error.status = 409; throw error; }
    const paymentRows = await prisma.$queryRaw`
      SELECT * FROM "StoreOrderPayment" WHERE "order_id" = ${order.id} AND "status" = 'paid' ORDER BY "created_at" DESC LIMIT 1
    `;
    const payment = paymentRows[0];
    if (!payment?.provider_payment_id || !['square', 'paypal'].includes(payment.provider)) { const error = new Error('This order has no refundable provider payment record.'); error.status = 409; throw error; }
    const refundRows = await prisma.$queryRaw`
      SELECT "id" FROM "StoreOrderPayment" WHERE "order_id" = ${order.id} AND "status" IN ('refund_pending', 'refunded') LIMIT 1
    `;
    if (refundRows[0]) { const error = new Error('A refund has already been submitted for this order.'); error.status = 409; throw error; }

    const amount = Number(order.total_amount);
    const currency = String(order.currency || 'USD');
    const refundIdempotencyKey = randomBytes(20).toString('hex');
    let providerRefundId = '';
    let refundPending = false;
    if (payment.provider === 'square') {
      if (!process.env.SQUARE_ACCESS_TOKEN) { const error = new Error('Square refunds are not configured.'); error.status = 400; throw error; }
      const square = await import('square');
      const client = new square.SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN, environment: String(process.env.SQUARE_ENVIRONMENT).toLowerCase() === 'production' ? square.SquareEnvironment.Production : square.SquareEnvironment.Sandbox });
      const result = await client.refunds.refundPayment({ idempotencyKey: refundIdempotencyKey, paymentId: String(payment.provider_payment_id), amountMoney: { amount: BigInt(Math.round(amount * 100)), currency }, reason: `Store order ${order.order_number} refund` });
      const refundStatus = String(result.refund?.status || '').toUpperCase();
      if (!result.refund?.id || !['COMPLETED', 'PENDING'].includes(refundStatus)) { const error = new Error('Square did not accept the refund.'); error.status = 400; throw error; }
      providerRefundId = String(result.refund.id);
      refundPending = refundStatus === 'PENDING';
    } else {
      const clientId = String(process.env.PAYPAL_CLIENT_ID || '').trim();
      const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();
      if (!clientId || !clientSecret) { const error = new Error('PayPal refunds are not configured.'); error.status = 400; throw error; }
      const base = String(process.env.PAYPAL_ENVIRONMENT || '').toLowerCase() === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
      const tokenResponse = await fetch(`${base}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
      const token = await tokenResponse.json();
      if (!token.access_token) { const error = new Error('PayPal authentication failed.'); error.status = 400; throw error; }
      const response = await fetch(`${base}/v2/payments/captures/${encodeURIComponent(payment.provider_payment_id)}/refund`, { method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': refundIdempotencyKey }, body: JSON.stringify({ amount: { value: amount.toFixed(2), currency_code: currency }, note_to_payer: 'Refund processed by the store.' }) });
      const result = await response.json();
      if (!response.ok || !result.id || String(result.status || '').toUpperCase() !== 'COMPLETED') { const error = new Error(result.message || 'PayPal did not complete the refund.'); error.status = 400; throw error; }
      providerRefundId = String(result.id);
    }

    const now = new Date().toISOString();
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "StoreOrderPayment" ("id", "order_id", "provider", "provider_payment_id", "status", "amount", "currency", "created_at", "updated_at")
        VALUES (${`refund-${Date.now()}-${randomBytes(8).toString('hex')}`}, ${order.id}, ${payment.provider}, ${providerRefundId}, ${refundPending ? 'refund_pending' : 'refunded'}, ${-amount}, ${currency}, ${now}, ${now})
      `;
      if (!refundPending) {
        await tx.$executeRaw`
          UPDATE "StoreOrder" SET "status" = 'refunded', "payment_status" = 'refunded', "fulfillment_status" = 'cancelled', "updated_at" = ${now}
          WHERE "id" = ${order.id} AND "payment_status" = 'paid'
        `;
      }
    });
    const updatedRows = await prisma.$queryRaw`SELECT * FROM "StoreOrder" WHERE "id" = ${order.id} LIMIT 1`;
    const updated = updatedRows[0];
    if (!refundPending) await sendStoreEmail(prisma, () => randomBytes(16).toString('hex'), { eventType: 'refund_confirmation', recipient: updated.customer_email, subject: `Refund processed: ${updated.order_number}`, text: `A refund of $${amount.toFixed(2)} was processed for order ${updated.order_number}.` });
    res.json({ ...updated, refund_pending: refundPending });
  } catch (error) { next(error); }
});

app.get('/api/storefront', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const rows = await masterPrisma.$queryRaw`
      SELECT "store_slug", "store_title", "store_description", "store_logo_data", "store_banner_data", "store_background_image_data", "store_custom_html", "store_preset_state", "store_custom_full_mode", "store_show_details", "store_product_ids"
      FROM "Account"
      WHERE "id" = ${auth.account_id}
      LIMIT 1
    `;
    let storePresetState = null;
    try {
      const rawState = String(rows[0]?.store_preset_state || '').trim();
      if (rawState) {
        const parsed = JSON.parse(rawState);
        if (parsed && typeof parsed === 'object') {
          storePresetState = parsed;
        }
      }
    } catch {
      storePresetState = null;
    }
    res.json({
      store_slug: rows[0]?.store_slug || '',
      store_title: rows[0]?.store_title || '',
      store_description: rows[0]?.store_description || '',
      store_logo_data: rows[0]?.store_logo_data || '',
      store_banner_data: rows[0]?.store_banner_data || '',
      store_background_image_data: rows[0]?.store_background_image_data || '',
      store_custom_html: rows[0]?.store_custom_html || '',
      store_preset_state: storePresetState,
      store_custom_full_mode: Boolean(rows[0]?.store_custom_full_mode),
      store_show_details: Boolean(rows[0]?.store_show_details ?? 1),
      store_product_ids: parseStringArrayJson(rows[0]?.store_product_ids),
    });
  } catch (e) {
    next(e);
  }
});

app.get('/api/storefront/products', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        image_data: true,
        price: true,
        quantity_in_stock: true,
      },
    });
    res.json(products);
  } catch (e) {
    next(e);
  }
});

app.post('/api/storefront/upload-image', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const data = parseOrThrow(storefrontImageUploadInput, req.body);
    const match = String(data.data_url || '').match(
      /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/i
    );
    if (!match?.[1] || !match?.[2]) {
      const error = new Error('Invalid image format');
      error.status = 400;
      throw error;
    }
    const extRaw = match[1].toLowerCase();
    const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 8 * 1024 * 1024) {
      const error = new Error('Image file is too large');
      error.status = 413;
      throw error;
    }

    const accountDir = path.join(STOREFRONT_MEDIA_ROOT, auth.account_id);
    if (!fs.existsSync(accountDir)) {
      fs.mkdirSync(accountDir, { recursive: true });
    }
    const fileName = `${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;
    const absPath = path.join(accountDir, fileName);
    fs.writeFileSync(absPath, buffer);
    res.status(201).json({ url: `/store-media/${auth.account_id}/${fileName}` });
  } catch (e) {
    next(e);
  }
});

app.post('/api/storefront/upload-font', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const data = parseOrThrow(storefrontFontUploadInput, req.body);
    const fileNameRaw = String(data.file_name || '').trim();
    const ext = path.extname(fileNameRaw).toLowerCase();
    const allowedExt = new Set(['.ttf', '.otf', '.woff', '.woff2']);
    if (!allowedExt.has(ext)) {
      const error = new Error('Unsupported font format. Use TTF, OTF, WOFF, or WOFF2.');
      error.status = 400;
      throw error;
    }
    const match = String(data.data_url || '').match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/i);
    if (!match?.[2]) {
      const error = new Error('Invalid font data');
      error.status = 400;
      throw error;
    }
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 12 * 1024 * 1024) {
      const error = new Error('Font file is too large');
      error.status = 413;
      throw error;
    }
    const accountDir = path.join(STOREFRONT_FONT_ROOT, auth.account_id);
    if (!fs.existsSync(accountDir)) {
      fs.mkdirSync(accountDir, { recursive: true });
    }
    const safeBaseName = path
      .basename(fileNameRaw, ext)
      .replace(/[^A-Za-z0-9 _-]/g, '')
      .trim()
      .slice(0, 80);
    const family = (safeBaseName || `Font-${Date.now()}`).replace(/\s+/g, ' ');
    const storedFileName = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    const absPath = path.join(accountDir, storedFileName);
    fs.writeFileSync(absPath, buffer);
    res.status(201).json({
      url: `/store-fonts/${auth.account_id}/${storedFileName}`,
      family,
      original_name: fileNameRaw,
    });
  } catch (e) {
    next(e);
  }
});

app.put('/api/storefront', async (req, res, next) => {
  try {
    const auth = req.auth;
    if (!auth || auth.blocked) {
      const error = new Error('Unauthorized');
      error.status = 401;
      throw error;
    }
    const data = parseOrThrow(storefrontUpdateInput, req.body);
    const tierRows = await masterPrisma.$queryRaw`
      SELECT "plan_tier"
      FROM "Account"
      WHERE "id" = ${auth.account_id}
      LIMIT 1
    `;
    const planTier = String(tierRows[0]?.plan_tier || 'free').toLowerCase();
    if (planTier !== 'elite') {
      const error = new Error('Storefront setup requires Elite plan');
      error.status = 403;
      throw error;
    }
    const conflicting = await masterPrisma.$queryRaw`
      SELECT "id"
      FROM "Account"
      WHERE "store_slug" = ${data.store_slug}
        AND "id" <> ${auth.account_id}
      LIMIT 1
    `;
    if (conflicting[0]) {
      const error = new Error('Store name is already taken');
      error.status = 409;
      throw error;
    }
    const requestedProductIds = Array.from(new Set(data.store_product_ids || []));
    let sanitizedProductIds = requestedProductIds;
    if (requestedProductIds.length > 0) {
      const available = await prisma.product.findMany({
        where: { id: { in: requestedProductIds } },
        select: { id: true },
      });
      const availableSet = new Set(available.map((item) => item.id));
      sanitizedProductIds = requestedProductIds.filter((id) => availableSet.has(id));
    }
    await masterPrisma.$executeRaw`
      UPDATE "Account"
      SET
        "store_slug" = ${data.store_slug},
        "store_title" = ${data.store_title},
        "store_description" = ${data.store_description},
        "store_logo_data" = ${data.store_logo_data},
        "store_banner_data" = ${data.store_banner_data},
        "store_background_image_data" = ${data.store_background_image_data},
        "store_custom_html" = ${data.store_custom_html},
        "store_preset_state" = ${data.store_preset_state ? JSON.stringify(data.store_preset_state) : ''},
        "store_custom_full_mode" = ${data.store_custom_full_mode ? 1 : 0},
        "store_show_details" = ${data.store_show_details ? 1 : 0},
        "store_product_ids" = ${JSON.stringify(sanitizedProductIds)}
      WHERE "id" = ${auth.account_id}
    `;
    res.json({
      ...data,
      store_product_ids: sanitizedProductIds,
    });
  } catch (e) {
    next(e);
  }
});
}
