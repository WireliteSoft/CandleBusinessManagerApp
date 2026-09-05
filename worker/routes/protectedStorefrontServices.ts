import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

const WORKSHOP_BOOKING_STATUSES = new Set(['confirmed', 'cancelled', 'attended', 'no_show']);
const PARTY_REQUEST_STATUSES = new Set(['new', 'reviewing', 'quoted', 'confirmed', 'declined', 'closed']);
const REFILL_REQUEST_STATUSES = new Set(['new', 'eligible', 'received', 'in_production', 'ready', 'completed', 'declined', 'issue']);
const QUOTE_STATUSES = new Set(['draft', 'sent', 'approved', 'declined', 'in_production', 'complete']);

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function text(value: unknown, max: number, required = false) {
  const result = String(value ?? '').trim();
  return (!required || result.length > 0) && result.length <= max ? result : null;
}

function email(value: unknown) {
  const result = text(value, 254, true)?.toLowerCase() || '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : null;
}

function amount(value: unknown, maximum: number) {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 && result <= maximum ? result : null;
}

function validIso(value: unknown) {
  const result = String(value ?? '').trim();
  return result && !Number.isNaN(Date.parse(result)) ? result : null;
}

function boolRow(row: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, keys.includes(key) ? Boolean(value) : value]));
}

async function readObject(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

export async function handleProtectedStorefrontServicesRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const pathname = new URL(request.url).pathname;
  const workshopMatch = pathname.match(/^\/api\/storefront\/workshops(?:\/([^/]+))?$/);
  const bookingMatch = pathname.match(/^\/api\/storefront\/workshop-bookings(?:\/([^/]+))?$/);
  const partyMatch = pathname.match(/^\/api\/storefront\/workshop-party-requests(?:\/([^/]+))?$/);
  const refillProgram = pathname === '/api/storefront/refill-program';
  const refillMatch = pathname.match(/^\/api\/storefront\/refill-requests(?:\/([^/]+))?$/);
  const quoteMatch = pathname.match(/^\/api\/storefront\/custom-order-quotes(?:\/([^/]+))?$/);
  if (!workshopMatch && !bookingMatch && !partyMatch && !refillProgram && !refillMatch && !quoteMatch) return null;

  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'storefront_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);

  if (workshopMatch) {
    const id = workshopMatch[1] ? decodeURIComponent(workshopMatch[1]).trim() : '';
    if (!id && request.method === 'GET') {
      const rows = await repository.all<Record<string, unknown>>(
        `SELECT s.*, COALESCE(SUM(b.party_size), 0) AS booked FROM StoreWorkshopSlot s
         LEFT JOIN StoreWorkshopBooking b ON b.account_id = s.account_id AND b.slot_id = s.id AND b.status <> 'cancelled'
         WHERE s.account_id = ? GROUP BY s.id ORDER BY s.starts_at ASC`, [auth.accountId],
      );
      return json(rows.map((row) => ({ ...boolRow(row, ['active']), booked: Number(row.booked || 0) })));
    }
    if (!id && request.method === 'POST') {
      const body = await readObject(request);
      const startsAt = validIso(body?.starts_at);
      const capacity = Number(body?.capacity);
      const depositAmount = amount(body?.deposit_amount, 10_000);
      if (!startsAt || !Number.isInteger(capacity) || capacity < 1 || capacity > 100 || depositAmount === null) return json({ error: 'Invalid workshop slot' }, { status: 400 });
      const result = await repository.run(
        `INSERT INTO StoreWorkshopSlot (id, account_id, starts_at, capacity, deposit_amount, active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`, [crypto.randomUUID(), auth.accountId, startsAt, capacity, depositAmount, new Date().toISOString()],
      );
      return Number(result.meta.changes || 0) === 1 ? json({ created: true }, { status: 201 }) : json({ error: 'Workshop slot already exists' }, { status: 409 });
    }
    if (id && request.method === 'PATCH') {
      const body = await readObject(request);
      if (!body || typeof body.active !== 'boolean') return json({ error: 'Invalid workshop status' }, { status: 400 });
      const result = await repository.run('UPDATE StoreWorkshopSlot SET active = ? WHERE account_id = ? AND id = ?', [body.active ? 1 : 0, auth.accountId, id]);
      return Number(result.meta.changes || 0) === 1 ? json({ updated: true }) : json({ error: 'Workshop slot not found' }, { status: 404 });
    }
    return null;
  }

  if (bookingMatch) {
    const id = bookingMatch[1] ? decodeURIComponent(bookingMatch[1]).trim() : '';
    if (!id && request.method === 'GET') {
      const rows = await repository.all<Record<string, unknown>>(
        `SELECT b.*, s.starts_at, s.deposit_amount FROM StoreWorkshopBooking b
         JOIN StoreWorkshopSlot s ON s.account_id = b.account_id AND s.id = b.slot_id
         WHERE b.account_id = ? ORDER BY s.starts_at ASC, b.created_at ASC`, [auth.accountId],
      );
      return json(rows);
    }
    if (id && request.method === 'PATCH') {
      const body = await readObject(request);
      const status = String(body?.status ?? '');
      if (!WORKSHOP_BOOKING_STATUSES.has(status)) return json({ error: 'Invalid workshop booking status' }, { status: 400 });
      const result = await repository.run('UPDATE StoreWorkshopBooking SET status = ? WHERE account_id = ? AND id = ?', [status, auth.accountId, id]);
      return Number(result.meta.changes || 0) === 1 ? json({ updated: true }) : json({ error: 'Workshop booking not found' }, { status: 404 });
    }
    return null;
  }

  if (partyMatch) {
    const id = partyMatch[1] ? decodeURIComponent(partyMatch[1]).trim() : '';
    if (!id && request.method === 'GET') {
      return json(await repository.all<Record<string, unknown>>(
        `SELECT * FROM StoreWorkshopPartyRequest WHERE account_id = ?
         ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, requested_date ASC, created_at DESC`, [auth.accountId],
      ));
    }
    if (id && request.method === 'PATCH') {
      const body = await readObject(request);
      const status = String(body?.status ?? '');
      const notes = text(body?.admin_notes, 4_000) ?? '';
      if (!PARTY_REQUEST_STATUSES.has(status)) return json({ error: 'Invalid party request update' }, { status: 400 });
      const result = await repository.run('UPDATE StoreWorkshopPartyRequest SET status = ?, admin_notes = ?, updated_at = ? WHERE account_id = ? AND id = ?', [status, notes, new Date().toISOString(), auth.accountId, id]);
      return Number(result.meta.changes || 0) === 1 ? json({ updated: true }) : json({ error: 'Party request not found' }, { status: 404 });
    }
    return null;
  }

  if (refillProgram) {
    if (request.method === 'GET') {
      let program = await repository.first<Record<string, unknown>>('SELECT * FROM StoreRefillProgram WHERE account_id = ? LIMIT 1', [auth.accountId]);
      if (!program) {
        const now = new Date().toISOString();
        await repository.run(
          `INSERT INTO StoreRefillProgram (id, account_id, active, discount_percent, eligibility_rules, return_instructions, updated_at)
           VALUES (?, ?, 1, 10, ?, ?, ?)`,
          [crypto.randomUUID(), auth.accountId, 'Clean, undamaged containers from this storefront are eligible for refill.', 'Return the cleaned, empty container to the store for inspection.', now],
        );
        program = await repository.first<Record<string, unknown>>('SELECT * FROM StoreRefillProgram WHERE account_id = ? LIMIT 1', [auth.accountId]);
      }
      return json(boolRow(program!, ['active']));
    }
    if (request.method === 'PUT') {
      const body = await readObject(request);
      const discountPercent = amount(body?.discount_percent, 100);
      const eligibilityRules = text(body?.eligibility_rules, 3_000, true);
      const returnInstructions = text(body?.return_instructions, 3_000, true);
      if (!body || typeof body.active !== 'boolean' || discountPercent === null || !eligibilityRules || !returnInstructions) return json({ error: 'Invalid refill program' }, { status: 400 });
      await repository.run(
        `INSERT INTO StoreRefillProgram (id, account_id, active, discount_percent, eligibility_rules, return_instructions, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET active = excluded.active, discount_percent = excluded.discount_percent,
         eligibility_rules = excluded.eligibility_rules, return_instructions = excluded.return_instructions, updated_at = excluded.updated_at`,
        [crypto.randomUUID(), auth.accountId, body.active ? 1 : 0, discountPercent, eligibilityRules, returnInstructions, new Date().toISOString()],
      );
      return json({ updated: true });
    }
    return null;
  }

  if (refillMatch) {
    const id = refillMatch[1] ? decodeURIComponent(refillMatch[1]).trim() : '';
    if (!id && request.method === 'GET') {
      const rows = await repository.all<Record<string, unknown>>(
        `SELECT * FROM StoreRefillRequest WHERE account_id = ?
         ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'received' THEN 1 WHEN 'in_production' THEN 2 ELSE 3 END, created_at DESC`, [auth.accountId],
      );
      return json(rows.map((row) => boolRow(row, ['container_received'])));
    }
    if (id && request.method === 'PATCH') {
      const body = await readObject(request);
      const status = String(body?.status ?? '');
      const discountPercent = amount(body?.discount_percent, 100);
      const notes = text(body?.staff_notes, 4_000) ?? '';
      if (!body || !REFILL_REQUEST_STATUSES.has(status) || typeof body.container_received !== 'boolean' || discountPercent === null) return json({ error: 'Invalid refill request update' }, { status: 400 });
      const result = await repository.run(
        `UPDATE StoreRefillRequest SET status = ?, container_received = ?, discount_percent = ?, staff_notes = ?, updated_at = ?
         WHERE account_id = ? AND id = ?`, [status, body.container_received ? 1 : 0, discountPercent, notes, new Date().toISOString(), auth.accountId, id],
      );
      return Number(result.meta.changes || 0) === 1 ? json({ updated: true }) : json({ error: 'Refill request not found' }, { status: 404 });
    }
    return null;
  }

  const id = quoteMatch?.[1] ? decodeURIComponent(quoteMatch[1]).trim() : '';
  if (!id && request.method === 'GET') {
    const rows = await repository.all<Record<string, unknown>>('SELECT * FROM StoreCustomOrderQuote WHERE account_id = ? ORDER BY updated_at DESC', [auth.accountId]);
    return json(rows.map((row) => boolRow(row, ['deposit_paid', 'final_paid'])));
  }
  if (!id && request.method === 'POST') {
    const body = await readObject(request);
    const customerName = text(body?.customer_name, 120, true);
    const customerEmail = email(body?.customer_email);
    const title = text(body?.title, 160, true);
    const details = text(body?.details, 4_000) ?? '';
    const totalAmount = amount(body?.total_amount, 100_000);
    const depositAmount = amount(body?.deposit_amount, 100_000);
    if (!customerName || !customerEmail || !title || title.length < 2 || totalAmount === null || depositAmount === null || depositAmount > totalAmount) return json({ error: 'Invalid custom order quote' }, { status: 400 });
    const id = crypto.randomUUID();
    const shareCode = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
    const now = new Date().toISOString();
    await repository.run(
      `INSERT INTO StoreCustomOrderQuote
       (id, account_id, share_code, customer_name, customer_email, title, details, revision, status, total_amount, deposit_amount, deposit_paid, final_paid, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'sent', ?, ?, 0, 0, ?, ?)`,
      [id, auth.accountId, shareCode, customerName, customerEmail, title, details, totalAmount, depositAmount, now, now],
    );
    return json({ id, share_code: shareCode }, { status: 201 });
  }
  if (id && request.method === 'PATCH') {
    const body = await readObject(request);
    const status = String(body?.status ?? '');
    const totalAmount = amount(body?.total_amount, 100_000);
    const depositAmount = amount(body?.deposit_amount, 100_000);
    const details = text(body?.details, 4_000) ?? '';
    if (!body || !QUOTE_STATUSES.has(status) || totalAmount === null || depositAmount === null || depositAmount > totalAmount || typeof body.deposit_paid !== 'boolean' || typeof body.final_paid !== 'boolean') return json({ error: 'Invalid custom order quote update' }, { status: 400 });
    const result = await repository.run(
      `UPDATE StoreCustomOrderQuote SET status = ?, total_amount = ?, deposit_amount = ?, deposit_paid = ?, final_paid = ?,
       details = ?, revision = revision + 1, updated_at = ? WHERE account_id = ? AND id = ?`,
      [status, totalAmount, depositAmount, body.deposit_paid ? 1 : 0, body.final_paid ? 1 : 0, details, new Date().toISOString(), auth.accountId, id],
    );
    return Number(result.meta.changes || 0) === 1 ? json({ updated: true }) : json({ error: 'Custom order quote not found' }, { status: 404 });
  }
  return null;
}
