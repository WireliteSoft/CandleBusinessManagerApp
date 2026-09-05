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

function stringValue(value: unknown, max: number, required = false) {
  const result = String(value || '').trim();
  return (!required || result.length > 0) && result.length <= max ? result : null;
}

function emailValue(value: unknown) {
  const email = stringValue(value, 254, true)?.toLowerCase() || '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

async function readObject(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export async function handlePublicRequests(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db || request.method !== 'POST') return null;
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/public\/store\/([^/]+)\/(custom-scent-requests|contact)$/);
  if (!match) return null;

  const slug = decodeSegment(match[1]);
  const route = match[2];
  const body = await readObject(request);
  if (!slug || !body) return json({ error: 'Invalid request' }, { status: 400 });
  const repository = createD1Repository(db);
  const account = await repository.first<{ id: string; plan_tier: string }>(
    'SELECT id, plan_tier FROM Account WHERE lower(store_slug) = ? LIMIT 1',
    [slug.toLowerCase()],
  );
  if (!account || (route === 'custom-scent-requests' && account.plan_tier.toLowerCase() !== 'elite')) {
    return json({ error: 'Storefront not found' }, { status: 404 });
  }

  const name = stringValue(body.name, 120, true);
  const email = emailValue(body.email);
  if (!name || !email) return json({ error: 'Provide a name and valid email address.' }, { status: 400 });
  const now = new Date().toISOString();

  if (route === 'custom-scent-requests') {
    const setting = await repository.first<{ enabled: number }>(
      'SELECT enabled FROM StorefrontFeatureSetting WHERE account_id = ? AND feature_key = ?',
      [account.id, 'custom_scent'],
    );
    if (setting && !setting.enabled) return json({ error: 'This storefront feature is not available.' }, { status: 404 });
    const desiredNotes = stringValue(body.desired_notes, 1000) ?? '';
    const scentFamily = stringValue(body.scent_family, 120) ?? '';
    const occasion = stringValue(body.occasion, 160) ?? '';
    const details = stringValue(body.details, 4000) ?? '';
    await repository.run(
      `INSERT INTO StoreCustomScentRequest
       (id, account_id, name, email, desired_notes, scent_family, occasion, details, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
      [crypto.randomUUID(), account.id, name, email, desiredNotes, scentFamily, occasion, details, now, now],
    );
    return json({ submitted: true }, { status: 201 });
  }

  const message = stringValue(body.message, 4000, true);
  if (!message) return json({ error: 'Provide a message.' }, { status: 400 });
  const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || '';
  const recentThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recent = await repository.first<{ id: string }>(
    `SELECT id FROM StoreContactMessage WHERE account_id = ? AND created_at >= ?
     AND (email = ? OR (ip_address <> '' AND ip_address = ?)) LIMIT 1`,
    [account.id, recentThreshold, email, clientIp],
  );
  if (recent) return json({ error: 'Please wait before submitting another message.' }, { status: 429 });
  const streetAddress = stringValue(body.street_address, 200) ?? '';
  const city = stringValue(body.city, 120) ?? '';
  const state = stringValue(body.state, 80) ?? '';
  const zip = stringValue(body.zip, 40) ?? '';
  const phone = stringValue(body.phone, 60) ?? '';
  await repository.run(
    `INSERT INTO StoreContactMessage
     (id, account_id, name, email, street_address, city, state, zip, phone, message, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), account.id, name, email, streetAddress, city, state, zip, phone, message, clientIp, now],
  );
  return json({ submitted: true }, { status: 201 });
}
