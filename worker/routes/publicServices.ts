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

function text(value: unknown, max: number, required = false) {
  const result = String(value || '').trim();
  return (!required || result.length > 0) && result.length <= max ? result : null;
}

function email(value: unknown) {
  const result = text(value, 254, true)?.toLowerCase() || '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : null;
}

async function body(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

async function findEliteAccount(db: D1Database, slug: string) {
  return createD1Repository(db).first<{ id: string; plan_tier: string }>(
    'SELECT id, plan_tier FROM Account WHERE lower(store_slug) = ? LIMIT 1', [slug.toLowerCase()],
  );
}

async function refillEnabled(repository: ReturnType<typeof createD1Repository>, accountId: string) {
  const setting = await repository.first<{ enabled: number }>(
    'SELECT enabled FROM StorefrontFeatureSetting WHERE account_id = ? AND feature_key = ?', [accountId, 'refill_program'],
  );
  const program = await repository.first<{ active: number; discount_percent: number; eligibility_rules: string; return_instructions: string }>(
    `SELECT active, discount_percent, eligibility_rules, return_instructions FROM StoreRefillProgram
     WHERE account_id = ? LIMIT 1`, [accountId],
  );
  const current = program || {
    active: 1,
    discount_percent: 10,
    eligibility_rules: 'Clean, undamaged containers from this storefront are eligible for refill.',
    return_instructions: 'Return the cleaned, empty container to the store for inspection.',
  };
  return { enabled: (!setting || Boolean(setting.enabled)) && Boolean(current.active), program: current };
}

export async function handlePublicServicesRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const url = new URL(request.url);
  const quoteMatch = url.pathname.match(/^\/api\/public\/store\/([^/]+)\/custom-order-quotes\/([^/]+)$/);
  if (quoteMatch) {
    const slug = decodeSegment(quoteMatch[1]);
    const shareCode = decodeSegment(quoteMatch[2]);
    if (!slug || !shareCode || shareCode.length > 120) return json({ error: 'Invalid quote link' }, { status: 400 });
    const account = await findEliteAccount(db, slug);
    if (!account || account.plan_tier.toLowerCase() !== 'elite') return json({ error: 'Storefront not found' }, { status: 404 });
    const repository = createD1Repository(db);
    if (request.method === 'GET') {
      const quote = await repository.first<Record<string, unknown>>(
        `SELECT title, details, revision, status, total_amount, deposit_amount, deposit_paid, final_paid
         FROM StoreCustomOrderQuote WHERE account_id = ? AND share_code = ? LIMIT 1`, [account.id, shareCode],
      );
      return quote ? json({ ...quote, deposit_paid: Boolean(quote.deposit_paid), final_paid: Boolean(quote.final_paid) }) : json({ error: 'Quote not found' }, { status: 404 });
    }
    if (request.method === 'PATCH') {
      const input = await body(request);
      const decision = String(input?.decision ?? '');
      if (decision !== 'approved' && decision !== 'declined') return json({ error: 'Invalid quote decision' }, { status: 400 });
      const result = await repository.run(
        `UPDATE StoreCustomOrderQuote SET status = ?, updated_at = ?
         WHERE account_id = ? AND share_code = ? AND status IN ('draft', 'sent')`,
        [decision, new Date().toISOString(), account.id, shareCode],
      );
      return Number(result.meta.changes || 0) === 1 ? json({ updated: true }) : json({ error: 'This quote can no longer be changed' }, { status: 409 });
    }
    return null;
  }
  const match = url.pathname.match(/^\/api\/public\/store\/([^/]+)\/(workshops|refill-program|refill-requests|event-favor-requests|workshop-party-requests)(?:\/([^/]+)\/book)?$/);
  if (!match) return null;
  const slug = decodeSegment(match[1]);
  const route = match[2];
  const workshopId = match[3] ? decodeSegment(match[3]) : '';
  if (!slug) return json({ error: 'Invalid store slug' }, { status: 400 });
  const account = await findEliteAccount(db, slug);
  if (!account || account.plan_tier.toLowerCase() !== 'elite') return json({ error: 'Storefront not found' }, { status: 404 });
  const repository = createD1Repository(db);

  if (route === 'workshops' && !workshopId && request.method === 'GET') {
    const rows = await repository.all<{ id: string; starts_at: string; capacity: number; deposit_amount: number; booked: number }>(
      `SELECT s.id, s.starts_at, s.capacity, s.deposit_amount, COALESCE(SUM(b.party_size), 0) AS booked
       FROM StoreWorkshopSlot s LEFT JOIN StoreWorkshopBooking b
       ON b.slot_id = s.id AND b.account_id = s.account_id AND b.status <> 'cancelled'
       WHERE s.account_id = ? AND s.active = 1 AND s.starts_at > ?
       GROUP BY s.id HAVING COALESCE(SUM(b.party_size), 0) < s.capacity ORDER BY s.starts_at ASC`,
      [account.id, new Date().toISOString()],
    );
    return json(rows.map((row) => ({ ...row, booked: Number(row.booked) })));
  }

  if (route === 'workshops' && workshopId && request.method === 'POST') {
    const input = await body(request);
    const name = text(input?.name, 120, true);
    const customerEmail = email(input?.email);
    const partySize = Number(input?.party_size);
    if (!name || !customerEmail || !Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
      return json({ error: 'Invalid workshop booking' }, { status: 400 });
    }
    const result = await repository.run(
      `INSERT INTO StoreWorkshopBooking (id, account_id, slot_id, name, email, party_size, status, payment_status, created_at)
       SELECT ?, ?, s.id, ?, ?, ?, 'confirmed', 'deposit_pending', ? FROM StoreWorkshopSlot s
       WHERE s.account_id = ? AND s.id = ? AND s.active = 1
       AND (SELECT COALESCE(SUM(b.party_size), 0) FROM StoreWorkshopBooking b
            WHERE b.account_id = s.account_id AND b.slot_id = s.id AND b.status <> 'cancelled') + ? <= s.capacity`,
      [crypto.randomUUID(), account.id, name, customerEmail, partySize, new Date().toISOString(), account.id, workshopId, partySize],
    );
    if (Number(result.meta.changes || 0) !== 1) {
      return json({ error: 'This workshop no longer has enough space.' }, { status: 409 });
    }
    return json({ booked: true }, { status: 201 });
  }

  if (route === 'refill-program' && request.method === 'GET') {
    const refill = await refillEnabled(repository, account.id);
    if (!refill.enabled) return json({ error: 'This storefront feature is not available.' }, { status: 404 });
    return json(refill.program);
  }

  if (route === 'refill-requests' && request.method === 'POST') {
    const input = await body(request);
    const name = text(input?.name, 120, true);
    const customerEmail = email(input?.email);
    const productName = text(input?.product_name, 180, true);
    const scent = text(input?.scent, 180) ?? '';
    const quantity = Number(input?.quantity);
    const condition = text(input?.container_condition, 40, true);
    const details = text(input?.details, 4000) ?? '';
    if (!name || !customerEmail || !productName || !Number.isInteger(quantity) || quantity < 1 || quantity > 24
      || !['clean_intact', 'minor_wear', 'damaged'].includes(condition || '')) {
      return json({ error: 'Invalid refill request' }, { status: 400 });
    }
    const refill = await refillEnabled(repository, account.id);
    if (!refill.enabled) return json({ error: 'This storefront feature is not available.' }, { status: 404 });
    await repository.run(
      `INSERT INTO StoreRefillRequest
       (id, account_id, name, email, product_name, scent, quantity, container_condition, details, discount_percent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), account.id, name, customerEmail, productName, scent, quantity, condition, details,
        Number(refill.program.discount_percent), new Date().toISOString(), new Date().toISOString()],
    );
    return json({ submitted: true, discount_percent: Number(refill.program.discount_percent) }, { status: 201 });
  }

  if (route === 'event-favor-requests' && request.method === 'POST') {
    const input = await body(request);
    const name = text(input?.name, 120, true);
    const customerEmail = email(input?.email);
    const quantity = Number(input?.quantity);
    const vessel = text(input?.vessel, 120, true);
    const scent = text(input?.scent, 240, true);
    const labelText = text(input?.label_text, 240) ?? '';
    const packaging = text(input?.packaging, 120) ?? '';
    const eventDate = text(input?.event_date, 40) ?? '';
    const details = text(input?.details, 2_000) ?? '';
    if (!name || !customerEmail || !Number.isInteger(quantity) || quantity < 12 || quantity > 5_000 || !vessel || !scent) {
      return json({ error: 'Invalid event favor request' }, { status: 400 });
    }
    const setting = await repository.first<{ enabled: number }>(
      'SELECT enabled FROM StorefrontFeatureSetting WHERE account_id = ? AND feature_key = ?', [account.id, 'event_favors'],
    );
    if (setting && setting.enabled === 0) return json({ error: 'This storefront feature is not available.' }, { status: 404 });
    const estimateAmount = Number((quantity * 8).toFixed(2));
    const now = new Date().toISOString();
    await repository.run(
      `INSERT INTO StoreEventFavorRequest
       (id, account_id, name, email, quantity, vessel, scent, label_text, packaging, event_date, details, estimate_amount, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
      [crypto.randomUUID(), account.id, name, customerEmail, quantity, vessel, scent, labelText, packaging, eventDate, details, estimateAmount, now, now],
    );
    return json({ submitted: true, estimate_amount: estimateAmount }, { status: 201 });
  }

  if (route === 'workshop-party-requests' && request.method === 'POST') {
    const input = await body(request);
    const name = text(input?.name, 120, true);
    const customerEmail = email(input?.email);
    const eventType = text(input?.event_type, 40, true);
    const requestedDate = text(input?.requested_date, 40) ?? '';
    const partySize = Number(input?.party_size);
    const details = text(input?.details, 4_000) ?? '';
    if (!name || !customerEmail || !['birthday', 'date_night', 'bridal_party', 'corporate', 'other'].includes(eventType || '')
      || !Number.isInteger(partySize) || partySize < 2 || partySize > 100) {
      return json({ error: 'Invalid workshop party request' }, { status: 400 });
    }
    const now = new Date().toISOString();
    await repository.run(
      `INSERT INTO StoreWorkshopPartyRequest
       (id, account_id, name, email, event_type, requested_date, party_size, details, status, admin_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', '', ?, ?)`,
      [crypto.randomUUID(), account.id, name, customerEmail, eventType, requestedDate, partySize, details, now, now],
    );
    return json({ submitted: true }, { status: 201 });
  }

  return null;
}
