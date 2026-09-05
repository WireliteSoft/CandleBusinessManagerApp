import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

async function readCartItem(request: Request) {
  try {
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const body = input as Record<string, unknown>;
    const supplyId = String(body.supply_id ?? '').trim();
    const quantity = Number(body.quantity);
    const notes = String(body.notes ?? '').trim();
    if (!supplyId || supplyId.length > 128 || !Number.isInteger(quantity) || quantity < 1 || quantity > 100_000 || notes.length > 5_000) return null;
    return { supplyId, quantity, notes };
  } catch {
    return null;
  }
}

export async function handleProtectedCartRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const match = new URL(request.url).pathname.match(/^\/api\/cart-items(?:\/([^/]+))?$/);
  if (!match) return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'supplies_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);
  const cartItemId = match[1] ? decodeURIComponent(match[1]).trim() : '';

  if (request.method === 'GET' && !cartItemId && new URL(request.url).pathname === '/api/cart-items/with-supplies') return null;
  if (request.method === 'GET' && !cartItemId) return null;
  if (request.method === 'GET' && cartItemId) return null;

  if (request.method === 'POST' && !cartItemId) {
    const item = await readCartItem(request);
    if (!item) return json({ error: 'Invalid cart item data' }, { status: 400 });
    const supply = await repository.first<{ id: string }>('SELECT id FROM Supply WHERE account_id = ? AND id = ?', [auth.accountId, item.supplyId]);
    if (!supply) return json({ error: 'Supply not found' }, { status: 404 });
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await repository.run(
      'INSERT INTO CartItem (id, account_id, supply_id, quantity, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, auth.accountId, item.supplyId, item.quantity, item.notes, createdAt],
    );
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM CartItem WHERE account_id = ? AND id = ?', [auth.accountId, id]), { status: 201 });
  }

  if (request.method === 'DELETE' && cartItemId) {
    const result = await repository.run('DELETE FROM CartItem WHERE account_id = ? AND id = ?', [auth.accountId, cartItemId]);
    return Number(result.meta.changes || 0) === 1
      ? new Response(null, { status: 204 })
      : json({ error: 'Cart item not found' }, { status: 404 });
  }
  if (request.method === 'DELETE' && !cartItemId) {
    await repository.run('DELETE FROM CartItem WHERE account_id = ?', [auth.accountId]);
    return new Response(null, { status: 204 });
  }
  return null;
}

export async function handleProtectedCartWithSuppliesRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db || request.method !== 'GET' || new URL(request.url).pathname !== '/api/cart-items/with-supplies') return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'supplies_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const rows = await createD1Repository(db).all<Record<string, unknown>>(
    `SELECT c.id, c.supply_id, c.quantity, c.notes, c.created_at,
      json_object('id', s.id, 'name', s.name, 'description', s.description, 'category', s.category,
        'cost_per_unit', s.cost_per_unit, 'quantity_in_stock', s.quantity_in_stock, 'unit_type', s.unit_type,
        'supplier', s.supplier, 'created_at', s.created_at, 'updated_at', s.updated_at) AS supplies
     FROM CartItem c JOIN Supply s ON s.id = c.supply_id AND s.account_id = c.account_id
     WHERE c.account_id = ? ORDER BY c.created_at DESC`,
    [auth.accountId],
  );
  return json(rows.map((row) => ({ ...row, supplies: typeof row.supplies === 'string' ? JSON.parse(row.supplies) : row.supplies })));
}
