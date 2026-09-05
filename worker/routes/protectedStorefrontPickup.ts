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

function validIso(value: unknown) {
  const result = String(value ?? '').trim();
  return result && !Number.isNaN(Date.parse(result)) ? result : null;
}

export async function handleProtectedStorefrontPickupRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const pathname = new URL(request.url).pathname;
  const slotMatch = pathname.match(/^\/api\/storefront\/pickup\/slots(?:\/([^/]+))?$/);
  const settings = pathname === '/api/storefront/pickup/settings';
  const overview = pathname === '/api/storefront/pickup';
  if (!slotMatch && !settings && !overview) return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'storefront_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);

  if (overview && request.method === 'GET') {
    const [current, slots] = await Promise.all([
      repository.first<{ instructions: string; cutoff_hours: number; active: number }>('SELECT instructions, cutoff_hours, active FROM StorePickupSettings WHERE account_id = ? LIMIT 1', [auth.accountId]),
      repository.all<Record<string, unknown>>('SELECT id, starts_at, capacity, active, created_at FROM StorePickupSlot WHERE account_id = ? ORDER BY starts_at ASC', [auth.accountId]),
    ]);
    return json({
      settings: current ? { ...current, active: Boolean(current.active) } : { instructions: '', cutoff_hours: 24, active: false },
      slots: slots.map((slot) => ({ ...slot, active: Boolean(slot.active) })),
    });
  }
  if (settings && request.method === 'PUT') {
    const body = await readObject(request);
    const instructions = typeof body?.instructions === 'string' ? body.instructions.trim() : null;
    const cutoffHours = Number(body?.cutoff_hours);
    if (!body || typeof body.active !== 'boolean' || instructions === null || instructions.length > 2_000 || !Number.isInteger(cutoffHours) || cutoffHours < 0 || cutoffHours > 168) return json({ error: 'Invalid pickup settings' }, { status: 400 });
    await repository.run(
      `INSERT INTO StorePickupSettings (id, account_id, instructions, cutoff_hours, active, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id) DO UPDATE SET instructions = excluded.instructions, cutoff_hours = excluded.cutoff_hours, active = excluded.active, updated_at = excluded.updated_at`,
      [crypto.randomUUID(), auth.accountId, instructions, cutoffHours, body.active ? 1 : 0, new Date().toISOString()],
    );
    return json({ updated: true });
  }
  const slotId = slotMatch?.[1] ? decodeURIComponent(slotMatch[1]).trim() : '';
  if (!slotId && request.method === 'POST') {
    const body = await readObject(request);
    const startsAt = validIso(body?.starts_at);
    const capacity = Number(body?.capacity);
    if (!startsAt || new Date(startsAt).getTime() <= Date.now() || !Number.isInteger(capacity) || capacity < 1 || capacity > 100) return json({ error: 'Invalid pickup slot' }, { status: 400 });
    const result = await repository.run(
      'INSERT INTO StorePickupSlot (id, account_id, starts_at, capacity, active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      [crypto.randomUUID(), auth.accountId, startsAt, capacity, new Date().toISOString()],
    );
    return Number(result.meta.changes || 0) === 1 ? json({ created: true }, { status: 201 }) : json({ error: 'Pickup slot already exists' }, { status: 409 });
  }
  if (slotId && request.method === 'PATCH') {
    const body = await readObject(request);
    if (!body || typeof body.active !== 'boolean') return json({ error: 'Invalid pickup slot status' }, { status: 400 });
    const result = await repository.run('UPDATE StorePickupSlot SET active = ? WHERE account_id = ? AND id = ?', [body.active ? 1 : 0, auth.accountId, slotId]);
    return Number(result.meta.changes || 0) === 1 ? json({ updated: true }) : json({ error: 'Pickup slot not found' }, { status: 404 });
  }
  return null;
}
