import { createD1Repository } from '../lib/d1';

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function decodeSegment(value: string) {
  try { return decodeURIComponent(value).trim(); } catch { return ''; }
}

export async function handlePublicPickupRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db || request.method !== 'GET') return null;
  const match = new URL(request.url).pathname.match(/^\/api\/public\/store\/([^/]+)\/pickup$/);
  if (!match) return null;
  const slug = decodeSegment(match[1]);
  if (!slug) return json({ error: 'Invalid store slug' }, { status: 400 });
  const repository = createD1Repository(db);
  const store = await repository.first<{ id: string; plan_tier: string }>(
    'SELECT id, plan_tier FROM Account WHERE lower(store_slug) = ? LIMIT 1', [slug.toLowerCase()],
  );
  if (!store || store.plan_tier.toLowerCase() !== 'elite') return json({ error: 'Storefront not found' }, { status: 404 });
  const settings = await repository.first<{ active: number; instructions: string; cutoff_hours: number }>(
    'SELECT active, instructions, cutoff_hours FROM StorePickupSettings WHERE account_id = ? LIMIT 1', [store.id],
  );
  if (!settings || settings.active === 0) return json({ active: false, instructions: '', slots: [] });
  const cutoff = new Date(Date.now() + Number(settings.cutoff_hours || 24) * 3_600_000).toISOString();
  const slots = await repository.all<{ starts_at: string; capacity: number; reserved: number }>(
    `SELECT s.starts_at, s.capacity, COUNT(o.id) AS reserved FROM StorePickupSlot s
     LEFT JOIN StoreOrder o ON o.account_id = s.account_id AND o.pickup_slot_at = s.starts_at
       AND o.status NOT IN ('cancelled', 'refunded')
     WHERE s.account_id = ? AND s.active = 1 AND s.starts_at > ?
     GROUP BY s.id HAVING COUNT(o.id) < s.capacity ORDER BY s.starts_at ASC`, [store.id, cutoff],
  );
  return json({ active: true, instructions: settings.instructions || '', slots: slots.map((slot) => ({ ...slot, reserved: Number(slot.reserved || 0) })) });
}
