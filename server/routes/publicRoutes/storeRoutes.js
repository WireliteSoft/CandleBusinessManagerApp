import { findAccountByStoreSlug, requireStoreSlug } from './shared.js';

const DEFAULT_GIFT_CARD_VALUES = Array.from({ length: 100 }, (_, index) => (index + 1) * 5);

async function ensureDefaultGiftCardProducts(accountPrisma) {
  const now = new Date().toISOString();
  for (const value of DEFAULT_GIFT_CARD_VALUES) {
    const id = `system-gift-card-${value}`;
    await accountPrisma.$executeRaw`
      INSERT OR IGNORE INTO "Product" ("id", "name", "description", "image_data", "product_type", "price", "quantity_in_stock", "cost_per_unit", "created_at", "updated_at")
      VALUES (${id}, ${`$${value} Digital Gift Card`}, ${'A pre-made digital gift card. It is issued to the buyer after successful payment.'}, ${''}, ${'gift_card'}, ${value}, ${0}, ${0}, ${now}, ${now})
    `;
  }
}

export function registerPublicStoreRoutes(app, context) {
  const {
    masterPrisma,
    getAccountPrisma,
    parseOrThrow,
    z,
    parseStringArrayJson,
    getClientIp,
    publicStoreContactInput,
    randomUUID,
  } = context;

  app.get('/api/public/store/:slug', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;

      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') {
        res.status(404).json({ error: 'Storefront not found' });
        return;
      }

      const accountPrisma = await getAccountPrisma(account.id);
      await ensureDefaultGiftCardProducts(accountPrisma);
      const selectedProductIds = [...parseStringArrayJson(account.store_product_ids), ...DEFAULT_GIFT_CARD_VALUES.map((value) => `system-gift-card-${value}`)];
      const productsUnordered =
        selectedProductIds.length > 0
          ? await accountPrisma.product.findMany({
              where: { id: { in: selectedProductIds } },
              select: {
                id: true,
                name: true,
                description: true,
                image_data: true,
                product_type: true,
                price: true,
                quantity_in_stock: true,
                scent_family: true, fragrance_notes: true, sweetness: true, scent_strength: true, warmth: true, freshness: true, season: true, mood: true, room: true, burn_time: true, wax_type: true, wick_type: true, batch_number: true, inspiration: true, making_process: true, limited_drop: true, drop_number: true, purchase_limit: true, upcoming_release: true, release_date: true, preorders_enabled: true, member_exclusive: true, member_early_access_days: true, subscriber_exclusive: true, subscriber_early_access_days: true,
              },
            })
          : [];
      const productMap = new Map(productsUnordered.map((product) => [product.id, product]));
      const products = selectedProductIds
        .map((id) => productMap.get(id))
        .filter((product) => Boolean(product));

      res.json({
        account_name: account.name,
        store_slug: account.store_slug || '',
        store_title: account.store_title || account.name || '',
        store_description: account.store_description || '',
        store_logo_data: account.store_logo_data || '',
        store_banner_data: account.store_banner_data || '',
        store_background_image_data: account.store_background_image_data || '',
        store_custom_html: account.store_custom_html || '',
        store_custom_full_mode: Boolean(account.store_custom_full_mode),
        store_show_details: Boolean(account.store_show_details ?? 1),
        products,
      });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/public/store/:slug/registries/:shareCode', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug); if (!slug) return;
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; }
      const accountPrisma = await getAccountPrisma(account.id);
      const registries = await accountPrisma.$queryRaw`SELECT "id", "title", "event_date", "message" FROM "StoreGiftRegistry" WHERE "share_code" = ${req.params.shareCode} AND "active" = 1 LIMIT 1`;
      const registry = registries[0]; if (!registry) { res.status(404).json({ error: 'Gift registry not found' }); return; }
      const products = await accountPrisma.$queryRaw`SELECT p."id", p."name", p."description", p."image_data", p."product_type", p."price", p."quantity_in_stock" FROM "StoreGiftRegistryItem" i JOIN "Product" p ON p."id" = i."product_id" WHERE i."registry_id" = ${registry.id}`;
      res.json({ ...registry, products });
    } catch (error) { next(error); }
  });

  app.get('/api/public/store/:slug/products/:productId/reviews', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug); if (!slug) return;
      const account = await findAccountByStoreSlug(masterPrisma, slug); if (!account) { res.status(404).json({ error: 'Storefront not found' }); return; }
      const db = await getAccountPrisma(account.id);
      const reviews = await db.$queryRaw`SELECT r."id", r."rating", r."title", r."body", r."photo_data", r."verified_purchase", r."created_at", c."name" AS "customer_name" FROM "StoreProductReview" r JOIN "StoreCustomer" c ON c."id" = r."customer_id" WHERE r."product_id" = ${req.params.productId} AND r."status" = 'approved' ORDER BY r."created_at" DESC`;
      res.json(reviews);
    } catch (error) { next(error); }
  });

  app.get('/api/public/store/:slug/products/:productId/also-bought', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') {
        res.status(404).json({ error: 'Storefront not found' });
        return;
      }
      const accountPrisma = await getAccountPrisma(account.id);
      const visibleProductIds = new Set(parseStringArrayJson(account.store_product_ids));
      if (!visibleProductIds.has(req.params.productId)) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      const rows = await accountPrisma.$queryRaw`
        SELECT companion."product_id" AS "product_id", COUNT(DISTINCT purchase."order_id") AS "order_count"
        FROM "StoreOrderItem" purchase
        JOIN "StoreOrder" orders ON orders."id" = purchase."order_id"
        JOIN "StoreOrderItem" companion ON companion."order_id" = purchase."order_id"
        WHERE purchase."product_id" = ${req.params.productId}
          AND companion."product_id" <> ${req.params.productId}
          AND orders."payment_status" = 'paid'
          AND orders."status" NOT IN ('cancelled', 'refunded')
        GROUP BY companion."product_id"
        ORDER BY "order_count" DESC, companion."product_id" ASC
        LIMIT 12
      `;
      const rankedIds = rows.map((row) => String(row.product_id)).filter((id) => visibleProductIds.has(id));
      if (!rankedIds.length) {
        res.json([]);
        return;
      }
      const products = await accountPrisma.product.findMany({
        where: { id: { in: rankedIds }, quantity_in_stock: { gt: 0 } },
        select: {
          id: true, name: true, description: true, image_data: true, product_type: true, price: true, quantity_in_stock: true,
          scent_family: true, fragrance_notes: true, sweetness: true, scent_strength: true, warmth: true,
          freshness: true, season: true, mood: true, room: true, burn_time: true, wax_type: true,
          wick_type: true, batch_number: true, inspiration: true, making_process: true, limited_drop: true, drop_number: true, purchase_limit: true, upcoming_release: true, release_date: true, preorders_enabled: true,
        },
      });
      const productMap = new Map(products.map((product) => [product.id, product]));
      res.json(rankedIds.map((id) => productMap.get(id)).filter(Boolean).slice(0, 3));
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/public/store/:slug/products/:productId/back-in-stock-alerts', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const data = parseOrThrow(z.object({ email: z.string().trim().email().max(254) }), req.body);
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') {
        res.status(404).json({ error: 'Storefront not found' });
        return;
      }
      const selectedProductIds = new Set(parseStringArrayJson(account.store_product_ids));
      if (!selectedProductIds.has(req.params.productId)) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      const accountPrisma = await getAccountPrisma(account.id);
      const product = await accountPrisma.product.findUnique({ where: { id: req.params.productId }, select: { id: true, quantity_in_stock: true } });
      if (!product || Number(product.quantity_in_stock) > 0) {
        res.status(409).json({ error: 'This product is currently in stock.' });
        return;
      }
      const now = new Date().toISOString();
      await accountPrisma.$executeRaw`
        INSERT INTO "StoreBackInStockAlert" ("id", "product_id", "email", "status", "created_at", "updated_at")
        VALUES (${randomUUID()}, ${product.id}, ${data.email.toLowerCase()}, ${'active'}, ${now}, ${now})
        ON CONFLICT("product_id", "email") DO UPDATE SET "status" = 'active', "notified_at" = NULL, "updated_at" = ${now}
      `;
      res.status(201).json({ subscribed: true });
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/public/store/:slug/products/:productId/waitlist', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const data = parseOrThrow(z.object({ email: z.string().trim().email().max(254) }), req.body);
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') {
        res.status(404).json({ error: 'Storefront not found' });
        return;
      }
      const selectedProductIds = new Set(parseStringArrayJson(account.store_product_ids));
      if (!selectedProductIds.has(req.params.productId)) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      const accountPrisma = await getAccountPrisma(account.id);
      const product = await accountPrisma.product.findUnique({ where: { id: req.params.productId }, select: { id: true, upcoming_release: true } });
      if (!product?.upcoming_release) {
        res.status(409).json({ error: 'This product is not currently accepting waitlist signups.' });
        return;
      }
      const now = new Date().toISOString();
      await accountPrisma.$executeRaw`
        INSERT INTO "StoreWaitlistEntry" ("id", "product_id", "email", "status", "created_at", "updated_at")
        VALUES (${randomUUID()}, ${product.id}, ${data.email.toLowerCase()}, ${'active'}, ${now}, ${now})
        ON CONFLICT("product_id", "email") DO UPDATE SET "status" = 'active', "notified_at" = NULL, "updated_at" = ${now}
      `;
      res.status(201).json({ subscribed: true });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/public/store/:slug/launch-tools', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') {
        res.status(404).json({ error: 'Storefront not found' });
        return;
      }
      const accountPrisma = await getAccountPrisma(account.id);
      const visitorKey = typeof req.query.visitor_key === 'string' && req.query.visitor_key.trim().length >= 16 ? req.query.visitor_key.trim().slice(0, 160) : '';
      const polls = await accountPrisma.$queryRaw`
        SELECT p."id", p."title", p."poll_type", p."options_json", COUNT(v."id") AS "vote_count"
        FROM "StoreScentPoll" p
        LEFT JOIN "StoreScentPollVote" v ON v."poll_id" = p."id"
        WHERE p."active" = 1
        GROUP BY p."id"
        ORDER BY p."created_at" DESC
      `;
      const pollOptions = await accountPrisma.$queryRaw`SELECT "poll_id", "option_name", COUNT(*) AS "count" FROM "StoreScentPollVote" GROUP BY "poll_id", "option_name"`;
      const visitorVotes = visitorKey ? await accountPrisma.$queryRaw`SELECT "poll_id", "option_name" FROM "StoreScentPollVote" WHERE "visitor_key" = ${visitorKey}` : [];
      const counts = new Map(pollOptions.map((row) => [`${row.poll_id}:${row.option_name}`, Number(row.count || 0)]));
      const votedOptions = new Map(visitorVotes.map((vote) => [String(vote.poll_id), String(vote.option_name)]));
      res.json({ polls: polls.map((poll) => {
        let options = [];
        try { options = JSON.parse(String(poll.options_json || '[]')); } catch { options = []; }
        return { id: poll.id, title: poll.title, poll_type: poll.poll_type, vote_count: Number(poll.vote_count || 0), voted_option: votedOptions.get(String(poll.id)) || '', options: Array.isArray(options) ? options.map((option) => ({ name: String(option), votes: counts.get(`${poll.id}:${String(option)}`) || 0 })) : [] };
      }) });
    } catch (e) { next(e); }
  });

  app.get('/api/public/store/:slug/fragrance-oils', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; }
      const query = String(req.query.q || '').trim().slice(0, 120).toLowerCase();
      const accountPrisma = await getAccountPrisma(account.id);
      const rows = query ? await accountPrisma.$queryRaw`SELECT "id", "name", "image_url", "source_url", "variants_json", "discontinued" FROM "FragranceOilCatalog" WHERE lower("name") LIKE ${`%${query}%`} ORDER BY "name" ASC LIMIT 500` : await accountPrisma.$queryRaw`SELECT "id", "name", "image_url", "source_url", "variants_json", "discontinued" FROM "FragranceOilCatalog" ORDER BY "name" ASC LIMIT 500`;
      res.json(rows.map((row) => ({ ...row, discontinued: Boolean(row.discontinued), variants: (() => { try { return JSON.parse(String(row.variants_json || '[]')); } catch { return []; } })() })));
    } catch (e) { next(e); }
  });

  app.post('/api/public/store/:slug/polls/:pollId/votes', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const data = parseOrThrow(z.object({ option_name: z.string().trim().min(1).max(120), visitor_key: z.string().trim().min(16).max(160) }), req.body);
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; }
      const accountPrisma = await getAccountPrisma(account.id);
      const polls = await accountPrisma.$queryRaw`SELECT "options_json" FROM "StoreScentPoll" WHERE "id" = ${req.params.pollId} AND "active" = 1 LIMIT 1`;
      if (!polls[0]) { res.status(404).json({ error: 'Poll not found' }); return; }
      let options = [];
      try { options = JSON.parse(String(polls[0].options_json || '[]')); } catch { options = []; }
      if (!Array.isArray(options) || !options.map(String).includes(data.option_name)) { res.status(400).json({ error: 'Invalid poll option' }); return; }
      const now = new Date().toISOString();
      await accountPrisma.$executeRaw`INSERT INTO "StoreScentPollVote" ("id", "poll_id", "visitor_key", "option_name", "created_at") VALUES (${randomUUID()}, ${req.params.pollId}, ${data.visitor_key}, ${data.option_name}, ${now}) ON CONFLICT("poll_id", "visitor_key") DO UPDATE SET "option_name" = ${data.option_name}, "created_at" = ${now}`;
      res.status(201).json({ voted: true });
    } catch (e) { next(e); }
  });

  app.post('/api/public/store/:slug/custom-scent-requests', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const data = parseOrThrow(z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(254), desired_notes: z.string().trim().max(1000).optional().default(''), scent_family: z.string().trim().max(120).optional().default(''), occasion: z.string().trim().max(160).optional().default(''), details: z.string().trim().max(4000).optional().default('') }), req.body);
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; }
      const accountPrisma = await getAccountPrisma(account.id);
      const setting = await accountPrisma.$queryRaw`SELECT "enabled" FROM "StorefrontFeatureSetting" WHERE "feature_key" = ${'custom_scent'} LIMIT 1`;
      if (setting[0] && !setting[0].enabled) { res.status(404).json({ error: 'This storefront feature is not available.' }); return; }
      const now = new Date().toISOString();
      await accountPrisma.$executeRaw`INSERT INTO "StoreCustomScentRequest" ("id", "name", "email", "desired_notes", "scent_family", "occasion", "details", "status", "created_at", "updated_at") VALUES (${randomUUID()}, ${data.name}, ${data.email.toLowerCase()}, ${data.desired_notes}, ${data.scent_family}, ${data.occasion}, ${data.details}, ${'new'}, ${now}, ${now})`;
      res.status(201).json({ submitted: true });
    } catch (e) { next(e); }
  });

  app.get('/api/public/store/:slug/workshops', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; }
      const db = await getAccountPrisma(account.id);
      const workshops = await db.$queryRaw`SELECT s."id", s."starts_at", s."capacity", s."deposit_amount", COALESCE(SUM(b."party_size"), 0) AS "booked" FROM "StoreWorkshopSlot" s LEFT JOIN "StoreWorkshopBooking" b ON b."slot_id" = s."id" AND b."status" <> 'cancelled' WHERE s."active" = 1 AND s."starts_at" > ${new Date().toISOString()} GROUP BY s."id" HAVING COALESCE(SUM(b."party_size"), 0) < s."capacity" ORDER BY s."starts_at" ASC`;
      res.json(workshops.map((workshop) => ({ ...workshop, booked: Number(workshop.booked) })));
    } catch (error) { next(error); }
  });
  app.post('/api/public/store/:slug/workshops/:id/book', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; }
      const data = parseOrThrow(z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(254), party_size: z.number().int().min(1).max(20) }), req.body);
      const db = await getAccountPrisma(account.id);
      await db.$transaction(async (tx) => {
        const slot = (await tx.$queryRaw`SELECT * FROM "StoreWorkshopSlot" WHERE "id" = ${req.params.id} AND "active" = 1 LIMIT 1`)[0];
        const booked = await tx.$queryRaw`SELECT COALESCE(SUM("party_size"), 0) AS "count" FROM "StoreWorkshopBooking" WHERE "slot_id" = ${req.params.id} AND "status" <> 'cancelled'`;
        if (!slot || Number(booked[0]?.count || 0) + data.party_size > Number(slot.capacity)) { const error = new Error('This workshop no longer has enough space.'); error.status = 409; throw error; }
        await tx.$executeRaw`INSERT INTO "StoreWorkshopBooking" ("id", "slot_id", "name", "email", "party_size") VALUES (${randomUUID()}, ${req.params.id}, ${data.name}, ${data.email.toLowerCase()}, ${data.party_size})`;
      });
      res.status(201).json({ booked: true });
    } catch (error) { next(error); }
  });
  app.post('/api/public/store/:slug/workshop-party-requests', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; }
      const data = parseOrThrow(z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(254), event_type: z.enum(['birthday', 'date_night', 'bridal_party', 'corporate', 'other']), requested_date: z.string().max(40).default(''), party_size: z.number().int().min(4).max(100), details: z.string().trim().max(4000).default('') }), req.body);
      const db = await getAccountPrisma(account.id); const now = new Date().toISOString();
      await db.$executeRaw`INSERT INTO "StoreWorkshopPartyRequest" ("id", "name", "email", "event_type", "requested_date", "party_size", "details", "created_at", "updated_at") VALUES (${randomUUID()}, ${data.name}, ${data.email.toLowerCase()}, ${data.event_type}, ${data.requested_date}, ${data.party_size}, ${data.details}, ${now}, ${now})`;
      res.status(201).json({ submitted: true });
    } catch (error) { next(error); }
  });
  app.get('/api/public/store/:slug/refill-program', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; }
      const db = await getAccountPrisma(account.id);
      const setting = await db.$queryRaw`SELECT "enabled" FROM "StorefrontFeatureSetting" WHERE "feature_key" = ${'refill_program'} LIMIT 1`;
      if (setting[0] && !setting[0].enabled) { res.status(404).json({ error: 'This storefront feature is not available.' }); return; }
      const program = await db.$queryRaw`SELECT * FROM "StoreRefillProgram" WHERE "id" = 'default' LIMIT 1`;
      const current = program[0] || { active: true, discount_percent: 10, eligibility_rules: 'Clean, undamaged containers from this storefront are eligible for refill.', return_instructions: 'Return the cleaned, empty container to the store for inspection.' };
      if (!current.active) { res.status(404).json({ error: 'This storefront feature is not available.' }); return; }
      res.json(current);
    } catch (error) { next(error); }
  });
  app.post('/api/public/store/:slug/refill-requests', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; }
      const data = parseOrThrow(z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(254), product_name: z.string().trim().min(1).max(180), scent: z.string().trim().max(180).default(''), quantity: z.number().int().min(1).max(24), container_condition: z.enum(['clean_intact', 'minor_wear', 'damaged']), details: z.string().trim().max(4000).default('') }), req.body);
      const db = await getAccountPrisma(account.id);
      const setting = await db.$queryRaw`SELECT "enabled" FROM "StorefrontFeatureSetting" WHERE "feature_key" = ${'refill_program'} LIMIT 1`;
      const program = await db.$queryRaw`SELECT * FROM "StoreRefillProgram" WHERE "id" = 'default' LIMIT 1`;
      const current = program[0] || { active: true, discount_percent: 10 };
      if ((setting[0] && !setting[0].enabled) || !current.active) { res.status(404).json({ error: 'This storefront feature is not available.' }); return; }
      const now = new Date().toISOString();
      await db.$executeRaw`INSERT INTO "StoreRefillRequest" ("id", "name", "email", "product_name", "scent", "quantity", "container_condition", "details", "discount_percent", "created_at", "updated_at") VALUES (${randomUUID()}, ${data.name}, ${data.email.toLowerCase()}, ${data.product_name}, ${data.scent}, ${data.quantity}, ${data.container_condition}, ${data.details}, ${Number(current.discount_percent)}, ${now}, ${now})`;
      res.status(201).json({ submitted: true, discount_percent: Number(current.discount_percent) });
    } catch (error) { next(error); }
  });

  app.post('/api/public/store/:slug/event-favor-requests', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug); if (!slug) return; const account = await findAccountByStoreSlug(masterPrisma, slug); if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; }
      const data = parseOrThrow(z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(254), quantity: z.number().int().min(12).max(5000), vessel: z.string().trim().min(1).max(120), scent: z.string().trim().min(1).max(240), label_text: z.string().trim().max(240).default(''), packaging: z.string().trim().max(120).default(''), event_date: z.string().max(40).default(''), details: z.string().max(2000).default('') }), req.body);
      const estimate = Number((data.quantity * 8).toFixed(2)); const db = await getAccountPrisma(account.id); const setting = await db.$queryRaw`SELECT "enabled" FROM "StorefrontFeatureSetting" WHERE "feature_key" = ${'event_favors'} LIMIT 1`; if (setting[0] && !setting[0].enabled) { res.status(404).json({ error: 'This storefront feature is not available.' }); return; } const now = new Date().toISOString();
      await db.$executeRaw`INSERT INTO "StoreEventFavorRequest" ("id", "name", "email", "quantity", "vessel", "scent", "label_text", "packaging", "event_date", "details", "estimate_amount", "status", "created_at", "updated_at") VALUES (${randomUUID()}, ${data.name}, ${data.email.toLowerCase()}, ${data.quantity}, ${data.vessel}, ${data.scent}, ${data.label_text}, ${data.packaging}, ${data.event_date}, ${data.details}, ${estimate}, ${'new'}, ${now}, ${now})`;
      res.status(201).json({ submitted: true, estimate_amount: estimate });
    } catch (error) { next(error); }
  });

  app.get('/api/public/store/:slug/custom-order-quotes/:code', async (req, res, next) => { try { const slug = requireStoreSlug(res, req.params.slug); if (!slug) return; const account = await findAccountByStoreSlug(masterPrisma, slug); if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; } const db = await getAccountPrisma(account.id); const rows = await db.$queryRaw`SELECT "title", "details", "revision", "status", "total_amount", "deposit_amount", "deposit_paid", "final_paid" FROM "StoreCustomOrderQuote" WHERE "share_code" = ${req.params.code} LIMIT 1`; if (!rows[0]) { res.status(404).json({ error: 'Quote not found' }); return; } res.json(rows[0]); } catch (error) { next(error); } });
  app.patch('/api/public/store/:slug/custom-order-quotes/:code', async (req, res, next) => { try { const data = parseOrThrow(z.object({ decision: z.enum(['approved', 'declined']) }), req.body); const slug = requireStoreSlug(res, req.params.slug); if (!slug) return; const account = await findAccountByStoreSlug(masterPrisma, slug); if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; } const db = await getAccountPrisma(account.id); const changed = await db.$executeRaw`UPDATE "StoreCustomOrderQuote" SET "status" = ${data.decision}, "updated_at" = ${new Date().toISOString()} WHERE "share_code" = ${req.params.code} AND "status" IN ('draft', 'sent')`; if (!changed) { res.status(409).json({ error: 'This quote can no longer be changed' }); return; } res.json({ updated: true }); } catch (error) { next(error); } });

  app.post('/api/public/store/:slug/gift-pack-requests', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;
      const data = parseOrThrow(z.object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(254),
        recipient_name: z.string().trim().max(120).optional().default(''),
        gift_message: z.string().trim().max(1000).optional().default(''),
        pack_size: z.union([z.literal(4), z.literal(6), z.literal(8)]),
        items: z.array(z.object({ name: z.string().trim().min(1).max(160), size: z.enum(['4 oz', '8 oz', '10 oz', '16 oz']), wickCount: z.enum(['1 wick', '2 wicks', '3 wicks']), wickType: z.enum(['Cotton wick', 'Wood wick']) })).min(4).max(8),
      }), req.body);
      if (data.items.length !== data.pack_size) { res.status(400).json({ error: 'Select the exact number of candles in the gift pack.' }); return; }
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; }
      const accountPrisma = await getAccountPrisma(account.id);
      const now = new Date().toISOString();
      await accountPrisma.$executeRaw`INSERT INTO "StoreGiftPackRequest" ("id", "name", "email", "recipient_name", "gift_message", "items_json", "status", "created_at", "updated_at") VALUES (${randomUUID()}, ${data.name}, ${data.email.toLowerCase()}, ${data.recipient_name}, ${data.gift_message}, ${JSON.stringify(data.items)}, ${'new'}, ${now}, ${now})`;
      res.status(201).json({ submitted: true });
    } catch (e) { next(e); }
  });

  app.post('/api/public/store/:slug/collection-requests', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug); if (!slug) return;
      const data = parseOrThrow(z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(254), collection_name: z.string().trim().min(1).max(120), label_text: z.string().trim().max(160).optional().default(''), collection_size: z.union([z.literal(3), z.literal(4), z.literal(6), z.literal(12)]), items: z.array(z.object({ name: z.string().trim().min(1).max(160), size: z.enum(['4 oz', '8 oz', '10 oz', '16 oz']), wickCount: z.enum(['1 wick', '2 wicks', '3 wicks']), wickType: z.enum(['Cotton wick', 'Wood wick']) })).min(3).max(12) }), req.body);
      if (data.items.length !== data.collection_size) { res.status(400).json({ error: 'Select the exact number of candles in the collection.' }); return; }
      const account = await findAccountByStoreSlug(masterPrisma, slug); if (!account || String(account.plan_tier || '').toLowerCase() !== 'elite') { res.status(404).json({ error: 'Storefront not found' }); return; }
      const accountPrisma = await getAccountPrisma(account.id); const now = new Date().toISOString();
      await accountPrisma.$executeRaw`INSERT INTO "StoreCollectionRequest" ("id", "name", "email", "collection_name", "label_text", "collection_size", "items_json", "status", "created_at", "updated_at") VALUES (${randomUUID()}, ${data.name}, ${data.email.toLowerCase()}, ${data.collection_name}, ${data.label_text}, ${data.collection_size}, ${JSON.stringify(data.items)}, ${'new'}, ${now}, ${now})`;
      res.status(201).json({ submitted: true });
    } catch (e) { next(e); }
  });

  app.post('/api/public/store/:slug/contact', async (req, res, next) => {
    try {
      const slug = requireStoreSlug(res, req.params.slug);
      if (!slug) return;

      const data = parseOrThrow(publicStoreContactInput, req.body);
      const account = await findAccountByStoreSlug(masterPrisma, slug);
      if (!account?.id) {
        res.status(404).json({ error: 'Storefront not found' });
        return;
      }

      const accountPrisma = await getAccountPrisma(account.id);
      const clientIp = getClientIp(req);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const recentRows = await accountPrisma.$queryRaw`
        SELECT "id"
        FROM "StoreContactMessage"
        WHERE "created_at" >= ${tenMinutesAgo}
          AND ("email" = ${data.email} OR "ip_address" = ${clientIp})
        ORDER BY "created_at" DESC
        LIMIT 1
      `;
      if (recentRows[0]?.id) {
        const error = new Error('Please wait 10 minutes before sending another message.');
        error.status = 429;
        throw error;
      }
      await accountPrisma.$executeRaw`
        INSERT INTO "StoreContactMessage" (
          "id", "name", "email", "street_address", "city", "state", "zip", "phone", "message", "ip_address", "is_read", "read_at", "workflow_status", "priority_level", "created_at"
        ) VALUES (
          ${randomUUID()},
          ${data.name},
          ${data.email},
          ${data.street_address},
          ${data.city},
          ${data.state},
          ${data.zip},
          ${data.phone},
          ${data.message},
          ${clientIp},
          ${0},
          ${null},
          ${'new'},
          ${'normal'},
          ${new Date().toISOString()}
        )
      `;
      res.status(201).json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
}
