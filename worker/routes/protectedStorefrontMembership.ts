import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

const MEMBER_STATUSES = new Set(['active', 'paused', 'cancelled']);
function json(body: unknown, init: ResponseInit = {}) { const headers = new Headers(init.headers); headers.set('content-type', 'application/json; charset=utf-8'); headers.set('cache-control', 'no-store'); return new Response(JSON.stringify(body), { ...init, headers }); }
async function readObject(request: Request) { try { const value = await request.json(); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; } catch { return null; } }
function email(value: unknown) { const result = String(value ?? '').trim().toLowerCase(); return result.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : null; }

async function notify(repository: ReturnType<typeof createD1Repository>, accountId: string, customerId: string, title: string, message: string) {
  await repository.run('INSERT INTO StoreCustomerNotification (id, account_id, customer_id, category, title, message, is_read, created_at) VALUES (?, ?, ?, \'membership\', ?, ?, 0, ?)', [crypto.randomUUID(), accountId, customerId, title, message, new Date().toISOString()]);
}

export async function handleProtectedStorefrontMembershipRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const pathname = new URL(request.url).pathname;
  const memberMatch = pathname.match(/^\/api\/storefront\/membership\/members(?:\/([^/]+))?$/);
  const program = pathname === '/api/storefront/membership/program'; const overview = pathname === '/api/storefront/membership';
  if (!memberMatch && !program && !overview) return null;
  const auth = await resolveAuthContext(db, request); if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'storefront_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);
  if (overview && request.method === 'GET') {
    const [current, members, samples] = await Promise.all([
      repository.first<Record<string, unknown>>('SELECT * FROM StoreMembershipProgram WHERE account_id = ? LIMIT 1', [auth.accountId]),
      repository.all<Record<string, unknown>>(`SELECT m.*, c.name AS customer_name, c.email AS customer_email FROM StoreCustomerMembership m JOIN StoreCustomer c ON c.account_id = m.account_id AND c.id = m.customer_id WHERE m.account_id = ? ORDER BY CASE m.status WHEN 'active' THEN 0 ELSE 1 END, m.updated_at DESC`, [auth.accountId]),
      repository.all<Record<string, unknown>>(`SELECT id, name, quantity_in_stock FROM Product WHERE account_id = ? AND product_type = 'sample' ORDER BY name COLLATE NOCASE`, [auth.accountId]),
    ]);
    return json({ program: current ? { ...current, active: Boolean(current.active) } : { id: 'default', name: 'Candle Club', discount_percent: 0, sample_product_id: '', active: false }, members, samples });
  }
  if (program && request.method === 'PUT') {
    const body = await readObject(request); const name = typeof body?.name === 'string' ? body.name.trim() : ''; const discount = Number(body?.discount_percent); const sampleId = typeof body?.sample_product_id === 'string' ? body.sample_product_id.trim() : '';
    if (!body || name.length < 2 || name.length > 120 || !Number.isFinite(discount) || discount < 0 || discount > 100 || sampleId.length > 120 || typeof body.active !== 'boolean') return json({ error: 'Invalid membership program' }, { status: 400 });
    if (sampleId) { const sample = await repository.first<{ id: string }>('SELECT id FROM Product WHERE account_id = ? AND id = ? AND product_type = \'sample\' LIMIT 1', [auth.accountId, sampleId]); if (!sample) return json({ error: 'Choose a sample product for the member benefit.' }, { status: 400 }); }
    const now = new Date().toISOString(); await repository.run(`INSERT INTO StoreMembershipProgram (id, account_id, name, discount_percent, sample_product_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET name = excluded.name, discount_percent = excluded.discount_percent, sample_product_id = excluded.sample_product_id, active = excluded.active, updated_at = excluded.updated_at`, [crypto.randomUUID(), auth.accountId, name, discount, sampleId, body.active ? 1 : 0, now, now]);
    const updated = await repository.first<Record<string, unknown>>('SELECT * FROM StoreMembershipProgram WHERE account_id = ? LIMIT 1', [auth.accountId]); return json({ ...updated, active: Boolean(updated?.active) });
  }
  const memberId = memberMatch?.[1] ? decodeURIComponent(memberMatch[1]).trim() : '';
  if (!memberId && request.method === 'POST') {
    const body = await readObject(request); const customerEmail = email(body?.customer_email); const endsAt = body?.ends_at === null || body?.ends_at === undefined ? null : String(body.ends_at).trim();
    if (!customerEmail || (endsAt && Number.isNaN(Date.parse(endsAt)))) return json({ error: 'Invalid member data' }, { status: 400 });
    const customer = await repository.first<{ id: string }>('SELECT id FROM StoreCustomer WHERE account_id = ? AND lower(email) = ? AND active = 1 LIMIT 1', [auth.accountId, customerEmail]); if (!customer) return json({ error: 'Customer storefront account not found.' }, { status: 404 });
    const now = new Date().toISOString(); await repository.run(`INSERT INTO StoreCustomerMembership (id, account_id, customer_id, status, started_at, ends_at, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?, ?, ?) ON CONFLICT(account_id, customer_id) DO UPDATE SET status = 'active', started_at = excluded.started_at, ends_at = excluded.ends_at, updated_at = excluded.updated_at`, [crypto.randomUUID(), auth.accountId, customer.id, now, endsAt, now, now]);
    await notify(repository, auth.accountId, customer.id, 'Membership activated', 'Your storefront membership is active. Member discounts, samples, exclusive scents, and eligible early access are now available.'); return json({ enrolled: true }, { status: 201 });
  }
  if (memberId && request.method === 'PATCH') {
    const body = await readObject(request); const status = String(body?.status ?? ''); if (!MEMBER_STATUSES.has(status)) return json({ error: 'Invalid membership status' }, { status: 400 });
    const member = await repository.first<{ customer_id: string }>('SELECT customer_id FROM StoreCustomerMembership WHERE account_id = ? AND id = ? LIMIT 1', [auth.accountId, memberId]); if (!member) return json({ error: 'Membership not found' }, { status: 404 });
    await repository.run('UPDATE StoreCustomerMembership SET status = ?, updated_at = ? WHERE account_id = ? AND id = ?', [status, new Date().toISOString(), auth.accountId, memberId]); await notify(repository, auth.accountId, member.customer_id, `Membership ${status}`, `Your storefront membership is now ${status}.`); return json({ updated: true });
  }
  return null;
}
