import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';
import { awardReward } from '../lib/rewards';
const SOURCES = new Set(['referral', 'birthday', 'subscription', 'goodwill']);
function json(body: unknown, init: ResponseInit = {}) { const headers = new Headers(init.headers); headers.set('content-type', 'application/json; charset=utf-8'); headers.set('cache-control', 'no-store'); return new Response(JSON.stringify(body), { ...init, headers }); }
export async function handleProtectedStorefrontRewardsRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db || new URL(request.url).pathname !== '/api/storefront/rewards') return null; const auth = await resolveAuthContext(db, request); if (!auth) return json({ error: 'Unauthorized' }, { status: 401 }); if (!await canEditFeature(db, auth, 'storefront_edit')) return json({ error: 'Forbidden' }, { status: 403 }); if (request.method !== 'POST') return null;
  let body: Record<string, unknown> | null = null; try { const value = await request.json(); body = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; } catch { /* invalid */ }
  const email = String(body?.customer_email ?? '').trim().toLowerCase(); const points = Number(body?.points); const source = String(body?.source ?? ''); const note = String(body?.note ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320 || !Number.isInteger(points) || points < -10_000 || points > 10_000 || points === 0 || !SOURCES.has(source) || note.length < 2 || note.length > 500) return json({ error: 'Invalid reward data' }, { status: 400 });
  const customer = await createD1Repository(db).first<{ id: string }>('SELECT id FROM StoreCustomer WHERE account_id = ? AND lower(email) = ? AND active = 1 LIMIT 1', [auth.accountId, email]); if (!customer) return json({ error: 'Customer storefront account not found.' }, { status: 404 });
  await awardReward(db, auth.accountId, customer.id, points, source, `staff-${crypto.randomUUID()}`, note); return json({ awarded: true }, { status: 201 });
}
