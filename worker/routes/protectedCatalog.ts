import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export async function handleProtectedCatalogRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db || request.method !== 'GET') return null;
  const pathname = new URL(request.url).pathname;
  const route = pathname === '/api/products'
    ? { table: 'Product', permission: 'products_edit', orderBy: 'created_at DESC' }
    : pathname === '/api/supplies'
      ? { table: 'Supply', permission: 'supplies_edit', orderBy: 'created_at DESC' }
      : pathname === '/api/supplies/by-name'
        ? { table: 'Supply', permission: 'supplies_edit', orderBy: 'name COLLATE NOCASE ASC' }
        : pathname === '/api/wax-inventory'
          ? { table: 'WaxInventory', permission: 'supplies_edit', orderBy: 'wax_name COLLATE NOCASE ASC' }
          : null;
  if (!route) return null;

  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, route.permission)) return json({ error: 'Forbidden' }, { status: 403 });

  const rows = await createD1Repository(db).all<Record<string, unknown>>(
    `SELECT * FROM "${route.table}" WHERE account_id = ? ORDER BY ${route.orderBy}`,
    [auth.accountId],
  );
  return json(rows);
}
