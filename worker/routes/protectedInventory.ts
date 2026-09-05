import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

async function readObject(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

function string(body: Record<string, unknown>, field: string, max: number, required = false) {
  const value = String(body[field] ?? '').trim();
  return (!required || value.length > 0) && value.length <= max ? value : null;
}

function nonnegativeNumber(body: Record<string, unknown>, field: string, integer = false) {
  const value = Number(body[field]);
  return Number.isFinite(value) && value >= 0 && (!integer || Number.isInteger(value)) ? value : null;
}

async function supplyInput(request: Request, partial: boolean) {
  const body = await readObject(request);
  if (!body) return null;
  const output: Record<string, string | number> = {};
  const strings = { name: [240, true], description: [10000, false], category: [120, false], unit_type: [80, true], supplier: [240, false] } as const;
  for (const [field, [max, required]] of Object.entries(strings)) {
    if (!(field in body)) continue;
    const value = string(body, field, max, required);
    if (value === null) return null;
    output[field] = value;
  }
  for (const field of ['cost_per_unit', 'quantity_in_stock']) {
    if (!(field in body)) continue;
    const value = nonnegativeNumber(body, field, field === 'quantity_in_stock');
    if (value === null) return null;
    output[field] = value;
  }
  if (!partial && ['name', 'cost_per_unit', 'quantity_in_stock', 'unit_type'].some((field) => !(field in output))) return null;
  return output;
}

export async function handleProtectedInventoryRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const pathname = new URL(request.url).pathname;
  const supplyMatch = pathname.match(/^\/api\/supplies(?:\/([^/]+)(\/use-stock)?)?$/);
  const waxMatch = pathname.match(/^\/api\/wax-inventory\/([^/]+)$/);
  if (!supplyMatch && !waxMatch) return null;
  if (request.method === 'GET') return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'supplies_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);

  if (waxMatch && request.method === 'PUT') {
    const waxTypeId = decodeURIComponent(waxMatch[1]).trim();
    const body = await readObject(request);
    const waxName = body ? string(body, 'wax_name', 160, true) : null;
    const pounds = body ? nonnegativeNumber(body, 'pounds') : null;
    const totalPrice = body ? nonnegativeNumber(body, 'total_price') : null;
    if (!waxTypeId || !body || !waxName || pounds === null || totalPrice === null || typeof body.selected !== 'boolean') {
      return json({ error: 'Invalid wax inventory data' }, { status: 400 });
    }
    const now = new Date().toISOString();
    await repository.run(
      `INSERT INTO WaxInventory (id, account_id, wax_type_id, wax_name, pounds, total_price, selected, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id, wax_type_id) DO UPDATE SET wax_name = excluded.wax_name, pounds = excluded.pounds,
       total_price = excluded.total_price, selected = excluded.selected, updated_at = excluded.updated_at`,
      [crypto.randomUUID(), auth.accountId, waxTypeId, waxName, pounds, totalPrice, body.selected ? 1 : 0, now, now],
    );
    return json(await repository.first<Record<string, unknown>>(
      'SELECT * FROM WaxInventory WHERE account_id = ? AND wax_type_id = ?', [auth.accountId, waxTypeId],
    ));
  }

  if (!supplyMatch) return null;
  const supplyId = supplyMatch[1] ? decodeURIComponent(supplyMatch[1]).trim() : '';
  if (request.method === 'POST' && !supplyId) {
    const supply = await supplyInput(request, false);
    if (!supply) return json({ error: 'Invalid supply data' }, { status: 400 });
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const columns = ['id', 'account_id', ...Object.keys(supply), 'created_at', 'updated_at'];
    await repository.run(
      `INSERT INTO Supply (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      [id, auth.accountId, ...Object.values(supply), now, now],
    );
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM Supply WHERE account_id = ? AND id = ?', [auth.accountId, id]), { status: 201 });
  }
  if (!supplyId) return null;

  if (request.method === 'PUT') {
    const supply = await supplyInput(request, true);
    if (!supply || !Object.keys(supply).length) return json({ error: 'Invalid supply data' }, { status: 400 });
    const result = await repository.run(
      `UPDATE Supply SET ${[...Object.keys(supply).map((field) => `"${field}" = ?`), '"updated_at" = ?'].join(', ')}
       WHERE account_id = ? AND id = ?`,
      [...Object.values(supply), new Date().toISOString(), auth.accountId, supplyId],
    );
    if (Number(result.meta.changes || 0) !== 1) return json({ error: 'Supply not found' }, { status: 404 });
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM Supply WHERE account_id = ? AND id = ?', [auth.accountId, supplyId]));
  }
  if (request.method === 'POST' && supplyMatch[2] === '/use-stock') {
    const body = await readObject(request);
    const amount = body ? nonnegativeNumber(body, 'amount', true) : null;
    if (amount === null || amount < 1) return json({ error: 'Invalid stock amount' }, { status: 400 });
    const result = await repository.run(
      `UPDATE Supply SET quantity_in_stock = quantity_in_stock - ?, updated_at = ?
       WHERE account_id = ? AND id = ? AND quantity_in_stock >= ?`,
      [amount, new Date().toISOString(), auth.accountId, supplyId, amount],
    );
    if (Number(result.meta.changes || 0) !== 1) {
      const exists = await repository.first<{ id: string }>('SELECT id FROM Supply WHERE account_id = ? AND id = ?', [auth.accountId, supplyId]);
      return json({ error: exists ? 'Not enough stock' : 'Supply not found' }, { status: exists ? 400 : 404 });
    }
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM Supply WHERE account_id = ? AND id = ?', [auth.accountId, supplyId]));
  }
  if (request.method === 'DELETE') {
    const result = await repository.run('DELETE FROM Supply WHERE account_id = ? AND id = ?', [auth.accountId, supplyId]);
    return Number(result.meta.changes || 0) === 1 ? new Response(null, { status: 204 }) : json({ error: 'Supply not found' }, { status: 404 });
  }
  return null;
}
