import { createD1Repository } from '../lib/d1';

const GIFT_PACK_SIZES = new Set([4, 6, 8]);
const COLLECTION_SIZES = new Set([3, 4, 6, 12]);
const CANDLE_SIZES = new Set(['4 oz', '8 oz', '10 oz', '16 oz']);
const WICK_COUNTS = new Set(['1 wick', '2 wicks', '3 wicks']);
const WICK_TYPES = new Set(['Cotton wick', 'Wood wick']);

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

function parseItems(value: unknown) {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    const name = text(row.name, 160, true);
    const size = String(row.size || '');
    const wickCount = String(row.wickCount || '');
    const wickType = String(row.wickType || '');
    return name && CANDLE_SIZES.has(size) && WICK_COUNTS.has(wickCount) && WICK_TYPES.has(wickType)
      ? { name, size, wickCount, wickType }
      : null;
  });
  return items.every(Boolean) ? items : null;
}

export async function handlePublicPacksRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db || request.method !== 'POST') return null;
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/public\/store\/([^/]+)\/(gift-pack-requests|collection-requests)$/);
  if (!match) return null;
  const slug = decodeSegment(match[1]);
  const route = match[2];
  if (!slug) return json({ error: 'Invalid store slug' }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid');
    body = input as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid request' }, { status: 400 });
  }
  const name = text(body.name, 120, true);
  const customerEmail = email(body.email);
  const items = parseItems(body.items);
  if (!name || !customerEmail || !items) return json({ error: 'Invalid candle selection' }, { status: 400 });
  const repository = createD1Repository(db);
  const account = await repository.first<{ id: string; plan_tier: string }>(
    'SELECT id, plan_tier FROM Account WHERE lower(store_slug) = ? LIMIT 1', [slug.toLowerCase()],
  );
  if (!account || account.plan_tier.toLowerCase() !== 'elite') return json({ error: 'Storefront not found' }, { status: 404 });
  const now = new Date().toISOString();

  if (route === 'gift-pack-requests') {
    const packSize = Number(body.pack_size);
    if (!GIFT_PACK_SIZES.has(packSize) || items.length !== packSize) {
      return json({ error: 'Select the exact number of candles in the gift pack.' }, { status: 400 });
    }
    const recipientName = text(body.recipient_name, 120) ?? '';
    const giftMessage = text(body.gift_message, 1000) ?? '';
    await repository.run(
      `INSERT INTO StoreGiftPackRequest
       (id, account_id, name, email, recipient_name, gift_message, items_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
      [crypto.randomUUID(), account.id, name, customerEmail, recipientName, giftMessage, JSON.stringify(items), now, now],
    );
    return json({ submitted: true }, { status: 201 });
  }

  const collectionSize = Number(body.collection_size);
  const collectionName = text(body.collection_name, 120, true);
  const labelText = text(body.label_text, 160) ?? '';
  if (!collectionName || !COLLECTION_SIZES.has(collectionSize) || items.length !== collectionSize) {
    return json({ error: 'Select the exact number of candles in the collection.' }, { status: 400 });
  }
  await repository.run(
    `INSERT INTO StoreCollectionRequest
     (id, account_id, name, email, collection_name, label_text, collection_size, items_json, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
    [crypto.randomUUID(), account.id, name, customerEmail, collectionName, labelText, collectionSize, JSON.stringify(items), now, now],
  );
  return json({ submitted: true }, { status: 201 });
}
