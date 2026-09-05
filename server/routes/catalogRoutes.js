import { sendStoreEmail } from '../lib/storeEmail.js';

export function registerCatalogRoutes(app, context) {
  const {
    z,
    prisma,
    parseOrThrow,
    toRowDates,
    normalizeHttpUrl,
    extractMetaContent,
    extractFirstImgSrc,
  requireFeatureEdit,
  randomUUID,
  productInput,
  supplyInput,
  waxInventoryInput,
  scentProfileInput,
  useStockInput,
  } = context;

app.get('/api/link-preview', async (req, res, next) => {
  try {
    const parsed = parseOrThrow(z.object({ url: z.string().min(1) }), req.query);
    const pageUrl = normalizeHttpUrl(parsed.url);
    if (!pageUrl) {
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CandleBusinessLinkPreview/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        res.json({ imageUrl: null });
        return;
      }

      const html = await response.text();
      const candidate =
        extractMetaContent(html, 'og:image') ||
        extractMetaContent(html, 'twitter:image') ||
        extractFirstImgSrc(html);

      if (!candidate) {
        res.json({ imageUrl: null });
        return;
      }

      const absolute = new URL(candidate, pageUrl).toString();
      res.json({ imageUrl: absolute });
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    next(e);
  }
});

app.use('/api/products', requireFeatureEdit('products_edit'));
app.use('/api/supplies', requireFeatureEdit('supplies_edit'));
app.use('/api/wax-inventory', requireFeatureEdit('supplies_edit'));
app.use('/api/scent-profiles', requireFeatureEdit('supplies_edit'));
app.use('/api/cart-items', requireFeatureEdit('supplies_edit'));
app.use('/api/molds', requireFeatureEdit('supplies_edit'));
app.use('/api/recipes', requireFeatureEdit('recipes_edit'));
app.use('/api/recipe-ingredients', requireFeatureEdit('recipes_edit'));
app.use('/api/batch-logs', requireFeatureEdit('batches_edit'));
app.use('/api/storefront', requireFeatureEdit('storefront_edit'));
app.use('/api/auth/users', requireFeatureEdit('teams_access_edit'));
app.use('/api/auth/join-requests', requireFeatureEdit('teams_access_edit'));
app.use('/api/auth/join-code/regenerate', requireFeatureEdit('teams_access_edit'));
app.use('/api/auth/roles', requireFeatureEdit('teams_roles_edit'));
app.use('/api/employees', requireFeatureEdit('teams_employees_edit'));
app.use('/api/sales', requireFeatureEdit('teams_employees_edit'));

app.get('/api/products', async (_req, res, next) => {
  try {
    const rows = await prisma.product.findMany({ orderBy: { created_at: 'desc' } });
    res.json(toRowDates(rows));
  } catch (e) {
    next(e);
  }
});

app.post('/api/products', async (req, res, next) => {
  try {
    const data = parseOrThrow(productInput, req.body);
    const row = await prisma.product.create({ data });
    res.status(201).json(toRowDates(row));
  } catch (e) {
    next(e);
  }
});

app.put('/api/products/:id', async (req, res, next) => {
  try {
    const data = parseOrThrow(productInput.partial(), req.body);
    const before = await prisma.product.findUnique({ where: { id: req.params.id }, select: { quantity_in_stock: true, upcoming_release: true } });
    const row = await prisma.product.update({ where: { id: req.params.id }, data });
    if (Number(before?.quantity_in_stock || 0) <= 0 && Number(row.quantity_in_stock) > 0) {
      const alerts = await prisma.$queryRaw`
        SELECT "id", "email" FROM "StoreBackInStockAlert"
        WHERE "product_id" = ${row.id} AND "status" = 'active'
      `;
      const now = new Date().toISOString();
      for (const alert of alerts) {
        await prisma.$executeRaw`UPDATE "StoreBackInStockAlert" SET "status" = 'notified', "notified_at" = ${now}, "updated_at" = ${now} WHERE "id" = ${alert.id} AND "status" = 'active'`;
        await sendStoreEmail(prisma, randomUUID, { eventType: 'back_in_stock', recipient: String(alert.email), subject: `${row.name} is back in stock`, text: `${row.name} is back in stock. Visit your store to order while inventory is available.` });
      }
    }
    if (before?.upcoming_release && !row.upcoming_release && Number(row.quantity_in_stock) > 0) {
      const waitlistEntries = await prisma.$queryRaw`
        SELECT "id", "email" FROM "StoreWaitlistEntry"
        WHERE "product_id" = ${row.id} AND "status" = 'active'
      `;
      const now = new Date().toISOString();
      for (const entry of waitlistEntries) {
        await prisma.$executeRaw`UPDATE "StoreWaitlistEntry" SET "status" = 'notified', "notified_at" = ${now}, "updated_at" = ${now} WHERE "id" = ${entry.id} AND "status" = 'active'`;
        await sendStoreEmail(prisma, randomUUID, { eventType: 'waitlist_release', recipient: String(entry.email), subject: `${row.name} is now available`, text: `${row.name} is now available. Visit the store to order while inventory is available.` });
      }
    }
    res.json(toRowDates(row));
  } catch (e) {
    next(e);
  }
});

app.delete('/api/products/:id', async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.get('/api/supplies', async (_req, res, next) => {
  try {
    const rows = await prisma.supply.findMany({ orderBy: { created_at: 'desc' } });
    res.json(toRowDates(rows));
  } catch (e) {
    next(e);
  }
});

app.get('/api/supplies/by-name', async (_req, res, next) => {
  try {
    const rows = await prisma.supply.findMany({ orderBy: { name: 'asc' } });
    res.json(toRowDates(rows));
  } catch (e) {
    next(e);
  }
});

app.get('/api/wax-inventory', async (_req, res, next) => {
  try {
    const rows = await prisma.waxInventory.findMany({ orderBy: { wax_name: 'asc' } });
    res.json(toRowDates(rows));
  } catch (e) {
    next(e);
  }
});

app.put('/api/wax-inventory/:waxTypeId', async (req, res, next) => {
  try {
    const data = parseOrThrow(waxInventoryInput, {
      ...req.body,
      wax_type_id: req.params.waxTypeId,
    });
    const row = await prisma.waxInventory.upsert({
      where: { wax_type_id: req.params.waxTypeId },
      update: {
        wax_name: data.wax_name,
        pounds: data.pounds,
        total_price: data.total_price,
        selected: data.selected,
      },
      create: {
        wax_type_id: data.wax_type_id,
        wax_name: data.wax_name,
        pounds: data.pounds,
        total_price: data.total_price,
        selected: data.selected,
      },
    });
    res.json(toRowDates(row));
  } catch (e) {
    next(e);
  }
});

app.get('/api/scent-profiles', async (_req, res, next) => {
  try {
    const rows = await prisma.scentProfile.findMany({ orderBy: [{ name: 'asc' }, { created_at: 'desc' }] });
    res.json(toRowDates(rows));
  } catch (e) {
    next(e);
  }
});

app.post('/api/scent-profiles', async (req, res, next) => {
  try {
    const data = parseOrThrow(scentProfileInput, req.body);
    const row = await prisma.scentProfile.create({ data });
    res.status(201).json(toRowDates(row));
  } catch (e) {
    next(e);
  }
});

app.put('/api/scent-profiles/:id', async (req, res, next) => {
  try {
    const data = parseOrThrow(scentProfileInput.partial(), req.body);
    const row = await prisma.scentProfile.update({ where: { id: req.params.id }, data });
    res.json(toRowDates(row));
  } catch (e) {
    next(e);
  }
});

app.delete('/api/scent-profiles/:id', async (req, res, next) => {
  try {
    await prisma.scentProfile.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.post('/api/supplies', async (req, res, next) => {
  try {
    const data = parseOrThrow(supplyInput, req.body);
    const row = await prisma.supply.create({ data });
    res.status(201).json(toRowDates(row));
  } catch (e) {
    next(e);
  }
});

app.put('/api/supplies/:id', async (req, res, next) => {
  try {
    const data = parseOrThrow(supplyInput.partial(), req.body);
    const row = await prisma.supply.update({ where: { id: req.params.id }, data });
    res.json(toRowDates(row));
  } catch (e) {
    next(e);
  }
});

app.delete('/api/supplies/:id', async (req, res, next) => {
  try {
    await prisma.supply.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.post('/api/supplies/:id/use-stock', async (req, res, next) => {
  try {
    const { amount } = parseOrThrow(useStockInput, req.body);
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.supply.findUnique({ where: { id: req.params.id } });
      if (!current) {
        const error = new Error('Supply not found');
        error.status = 404;
        throw error;
      }
      if (current.quantity_in_stock < amount) {
        const error = new Error('Not enough stock');
        error.status = 400;
        throw error;
      }

      return tx.supply.update({
        where: { id: req.params.id },
        data: { quantity_in_stock: current.quantity_in_stock - amount },
      });
    });

    res.json(toRowDates(updated));
  } catch (e) {
    next(e);
  }
});

app.get('/api/cart-items/with-supplies', async (_req, res, next) => {
  try {
    const rows = await prisma.cartItem.findMany({
      orderBy: { created_at: 'desc' },
      include: { supply: true },
    });
    const mapped = rows.map((row) => ({
      id: row.id,
      supply_id: row.supply_id,
      quantity: row.quantity,
      notes: row.notes,
      created_at: row.created_at,
      supplies: row.supply,
    }));
    res.json(toRowDates(mapped));
  } catch (e) {
    next(e);
  }
});

app.post('/api/cart-items', async (req, res, next) => {
  try {
    const data = parseOrThrow(
      z.object({
        supply_id: z.string().min(1),
        quantity: z.number().int().positive(),
        notes: z.string().optional().default(''),
      }),
      req.body
    );
    const row = await prisma.cartItem.create({ data });
    res.status(201).json(toRowDates(row));
  } catch (e) {
    next(e);
  }
});

app.delete('/api/cart-items/:id', async (req, res, next) => {
  try {
    await prisma.cartItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

app.delete('/api/cart-items', async (_req, res, next) => {
  try {
    await prisma.cartItem.deleteMany();
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
}
