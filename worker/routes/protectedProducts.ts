import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

const PRODUCT_TYPES = new Set(['physical', 'sample', 'bundle', 'custom', 'subscription', 'gift_card', 'service']);
const STRING_LIMITS: Record<string, number> = {
  name: 240, description: 10000, image_data: 7_000_000, product_type: 20, scent_family: 80,
  fragrance_notes: 500, sweetness: 40, scent_strength: 40, warmth: 40, freshness: 40, season: 80,
  mood: 80, room: 80, burn_time: 80, wax_type: 80, wick_type: 80, batch_number: 120,
  inspiration: 2000, making_process: 2000, drop_number: 120, release_date: 40,
};
const BOOLEAN_FIELDS = new Set(['limited_drop', 'upcoming_release', 'preorders_enabled', 'member_exclusive', 'subscriber_exclusive']);
const NUMBER_FIELDS = new Set(['price', 'cost_per_unit']);
const INTEGER_FIELDS = new Set(['quantity_in_stock', 'purchase_limit', 'member_early_access_days', 'subscriber_early_access_days']);

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

async function readProduct(request: Request, partial: boolean) {
  try {
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const body = input as Record<string, unknown>;
    const output: Record<string, string | number> = {};
    for (const [field, limit] of Object.entries(STRING_LIMITS)) {
      if (!(field in body)) continue;
      const value = String(body[field] ?? '').trim();
      if (value.length > limit || (field === 'name' && !value)) return null;
      if (field === 'product_type' && !PRODUCT_TYPES.has(value)) return null;
      output[field] = value;
    }
    for (const field of BOOLEAN_FIELDS) {
      if (!(field in body)) continue;
      if (typeof body[field] !== 'boolean') return null;
      output[field] = body[field] ? 1 : 0;
    }
    for (const field of NUMBER_FIELDS) {
      if (!(field in body)) continue;
      const value = Number(body[field]);
      if (!Number.isFinite(value)) return null;
      output[field] = value;
    }
    for (const field of INTEGER_FIELDS) {
      if (!(field in body)) continue;
      const value = Number(body[field]);
      const max = field.endsWith('access_days') ? 365 : field === 'purchase_limit' ? 10000 : Number.MAX_SAFE_INTEGER;
      if (!Number.isInteger(value) || value < 0 || value > max) return null;
      output[field] = value;
    }
    if (body.product_type === 'gift_card') {
      const value = Number(body.price);
      if (value < 5 || value > 500 || Math.round(value * 100) % 500 !== 0) return null;
    }
    const required = ['name', 'price', 'quantity_in_stock', 'cost_per_unit'];
    if (!partial && required.some((field) => !(field in output))) return null;
    return output;
  } catch {
    return null;
  }
}

export async function handleProtectedProductsRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/api\/products(?:\/([^/]+))?$/);
  if (!match || request.method === 'GET') return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'products_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);
  const productId = match[1] ? decodeURIComponent(match[1]).trim() : '';

  if (request.method === 'POST' && !productId) {
    const product = await readProduct(request, false);
    if (!product) return json({ error: 'Invalid product data' }, { status: 400 });
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const columns = ['id', 'account_id', ...Object.keys(product), 'created_at', 'updated_at'];
    await repository.run(
      `INSERT INTO Product (${columns.map((column) => `"${column}"`).join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      [id, auth.accountId, ...Object.values(product), now, now],
    );
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM Product WHERE account_id = ? AND id = ?', [auth.accountId, id]), { status: 201 });
  }

  if (!productId) return null;
  if (request.method === 'PUT') {
    const product = await readProduct(request, true);
    if (!product || !Object.keys(product).length) return json({ error: 'Invalid product data' }, { status: 400 });
    const assignments = [...Object.keys(product).map((column) => `"${column}" = ?`), '"updated_at" = ?'];
    const result = await repository.run(
      `UPDATE Product SET ${assignments.join(', ')} WHERE account_id = ? AND id = ?`,
      [...Object.values(product), new Date().toISOString(), auth.accountId, productId],
    );
    if (Number(result.meta.changes || 0) !== 1) return json({ error: 'Product not found' }, { status: 404 });
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM Product WHERE account_id = ? AND id = ?', [auth.accountId, productId]));
  }

  if (request.method === 'DELETE') {
    const result = await repository.run('DELETE FROM Product WHERE account_id = ? AND id = ?', [auth.accountId, productId]);
    return Number(result.meta.changes || 0) === 1
      ? new Response(null, { status: 204 })
      : json({ error: 'Product not found' }, { status: 404 });
  }
  return null;
}
