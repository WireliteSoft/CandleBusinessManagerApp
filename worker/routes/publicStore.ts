import { createD1Repository } from '../lib/d1';

const GIFT_CARD_VALUES = Array.from({ length: 100 }, (_, index) => (index + 1) * 5);

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function parseProductIds(raw: unknown): string[] {
  try {
    const parsed = JSON.parse(String(raw || '[]'));
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return '';
  }
}

async function findEliteStore(db: D1Database, slug: string) {
  return createD1Repository(db).first<{
    id: string;
    name: string;
    plan_tier: string;
    store_slug: string;
    store_title: string;
    store_description: string;
    store_logo_data: string;
    store_banner_data: string;
    store_background_image_data: string;
    store_custom_html: string;
    store_custom_full_mode: number;
    store_show_details: number;
    store_product_ids: string;
  }>(
    `SELECT id, name, plan_tier, store_slug, store_title, store_description, store_logo_data,
       store_banner_data, store_background_image_data, store_custom_html, store_custom_full_mode,
       store_show_details, store_product_ids
     FROM Account WHERE lower(store_slug) = ? LIMIT 1`,
    [slug.toLowerCase()],
  );
}

async function ensureGiftCardProducts(db: D1Database, accountId: string) {
  const repository = createD1Repository(db);
  const now = new Date().toISOString();
  await repository.batch(
    GIFT_CARD_VALUES.map((value) => ({
      query: `INSERT OR IGNORE INTO Product
        (id, account_id, name, description, product_type, price, quantity_in_stock, cost_per_unit, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'gift_card', ?, 0, 0, ?, ?)`,
      values: [
        `system-gift-card-${value}`,
        accountId,
        `$${value} Digital Gift Card`,
        'A pre-made digital gift card. It is issued to the buyer after successful payment.',
        value,
        now,
        now,
      ],
    })),
  );
}

async function findStoreProducts(repository: ReturnType<typeof createD1Repository>, accountId: string, ids: string[]) {
  const products: Record<string, unknown>[] = [];
  // D1 has a bound-parameter limit, so the 100 standard gift cards cannot share one IN query.
  for (let start = 0; start < ids.length; start += 99) {
    const chunk = ids.slice(start, start + 99);
    products.push(...await repository.all<Record<string, unknown>>(
      `SELECT id, name, description, image_data, product_type, price, quantity_in_stock, scent_family,
       fragrance_notes, sweetness, scent_strength, warmth, freshness, season, mood, room, burn_time,
       wax_type, wick_type, batch_number, inspiration, making_process, limited_drop, drop_number,
       purchase_limit, upcoming_release, release_date, preorders_enabled, member_exclusive,
       member_early_access_days, subscriber_exclusive, subscriber_early_access_days
       FROM Product WHERE account_id = ? AND id IN (${chunk.map(() => '?').join(', ')})`,
      [accountId, ...chunk],
    ));
  }
  return products;
}

export async function handlePublicStoreRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;

  const url = new URL(request.url);
  if (request.method !== 'GET') return null;
  const match = url.pathname.match(/^\/api\/public\/store\/([^/]+)(?:\/products\/([^/]+)\/reviews|\/fragrance-oils)?$/);
  if (!match) return null;

  const slug = decodeSegment(match[1]);
  if (!slug) return json({ error: 'Invalid store slug' }, { status: 400 });
  const store = await findEliteStore(db, slug);
  if (!store || store.plan_tier.toLowerCase() !== 'elite') {
    return json({ error: 'Storefront not found' }, { status: 404 });
  }

  const repository = createD1Repository(db);
  const productId = match[2] ? decodeSegment(match[2]) : '';
  const isReviews = Boolean(productId);
  const isFragranceLibrary = url.pathname.endsWith('/fragrance-oils');

  if (isReviews) {
    const reviews = await repository.all<{
      id: string; rating: number; title: string; body: string; photo_data: string;
      verified_purchase: number; created_at: string; customer_name: string;
    }>(
      `SELECT r.id, r.rating, r.title, r.body, r.photo_data, r.verified_purchase, r.created_at,
       c.name AS customer_name
       FROM StoreProductReview r JOIN StoreCustomer c ON c.id = r.customer_id
       WHERE r.account_id = ? AND r.product_id = ? AND r.status = 'approved'
       ORDER BY r.created_at DESC`,
      [store.id, productId],
    );
    return json(reviews);
  }

  if (isFragranceLibrary) {
    const query = String(url.searchParams.get('q') || '').trim().slice(0, 120).toLowerCase();
    const rows = await repository.all<{
      id: string; name: string; image_url: string; source_url: string; variants_json: string; discontinued: number;
    }>(
      query
        ? `SELECT id, name, image_url, source_url, variants_json, discontinued FROM FragranceOilCatalog
           WHERE lower(name) LIKE ? ORDER BY name COLLATE NOCASE ASC LIMIT 500`
        : `SELECT id, name, image_url, source_url, variants_json, discontinued FROM FragranceOilCatalog
           ORDER BY name COLLATE NOCASE ASC LIMIT 500`,
      query ? [`%${query}%`] : [],
    );
    return json(rows.map((row) => {
      let variants: unknown[] = [];
      try { variants = JSON.parse(row.variants_json || '[]'); } catch { /* Invalid legacy JSON is treated as empty. */ }
      return { ...row, discontinued: Boolean(row.discontinued), variants };
    }));
  }

  await ensureGiftCardProducts(db, store.id);
  const selectedIds = [...parseProductIds(store.store_product_ids), ...GIFT_CARD_VALUES.map((value) => `system-gift-card-${value}`)];
  const uniqueIds = [...new Set(selectedIds)];
  const products = uniqueIds.length ? await findStoreProducts(repository, store.id, uniqueIds) : [];
  const productMap = new Map(products.map((product) => [String(product.id), product]));

  return json({
    account_name: store.name,
    store_slug: store.store_slug || '',
    store_title: store.store_title || store.name || '',
    store_description: store.store_description || '',
    store_logo_data: store.store_logo_data || '',
    store_banner_data: store.store_banner_data || '',
    store_background_image_data: store.store_background_image_data || '',
    store_custom_html: store.store_custom_html || '',
    store_custom_full_mode: Boolean(store.store_custom_full_mode),
    store_show_details: Boolean(store.store_show_details),
    products: uniqueIds.map((id) => productMap.get(id)).filter(Boolean),
  });
}
