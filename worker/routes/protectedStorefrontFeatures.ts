import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

const FEATURE_KEYS = new Set(['custom_labels', 'custom_scent', 'event_favors', 'refill_program']);
const EVENT_FAVOR_STATUSES = new Set(['new', 'reviewing', 'quoted', 'accepted', 'declined', 'closed']);

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

function settingRow(row: Record<string, unknown>) {
  return { ...row, enabled: Boolean(row.enabled) };
}

export async function handleProtectedStorefrontFeaturesRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const pathname = new URL(request.url).pathname;
  const settingMatch = pathname.match(/^\/api\/storefront\/feature-settings(?:\/([^/]+))?$/);
  const eventFavorMatch = pathname.match(/^\/api\/storefront\/event-favors(?:\/([^/]+))?$/);
  if (!settingMatch && !eventFavorMatch) return null;

  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'storefront_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);

  if (settingMatch) {
    const key = settingMatch[1] ? decodeURIComponent(settingMatch[1]).trim() : '';
    if (!key && request.method === 'GET') {
      const rows = await repository.all<Record<string, unknown>>(
        'SELECT feature_key, enabled, updated_at FROM StorefrontFeatureSetting WHERE account_id = ? ORDER BY feature_key ASC', [auth.accountId],
      );
      return json(rows.map(settingRow));
    }
    if (key && request.method === 'PUT') {
      const body = await readObject(request);
      if (!FEATURE_KEYS.has(key) || !body || typeof body.enabled !== 'boolean') return json({ error: 'Invalid feature setting' }, { status: 400 });
      await repository.run(
        `INSERT INTO StorefrontFeatureSetting (account_id, feature_key, enabled, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(account_id, feature_key) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`,
        [auth.accountId, key, body.enabled ? 1 : 0, new Date().toISOString()],
      );
      return json({ updated: true });
    }
    return null;
  }

  const requestId = eventFavorMatch?.[1] ? decodeURIComponent(eventFavorMatch[1]).trim() : '';
  if (!requestId && request.method === 'GET') {
    const rows = await repository.all<Record<string, unknown>>(
      `SELECT * FROM StoreEventFavorRequest WHERE account_id = ?
       ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, created_at DESC`, [auth.accountId],
    );
    return json(rows);
  }
  if (requestId && request.method === 'PATCH') {
    const body = await readObject(request);
    const status = String(body?.status ?? '');
    const quoteAmount = Number(body?.quote_amount);
    if (!EVENT_FAVOR_STATUSES.has(status) || !Number.isFinite(quoteAmount) || quoteAmount < 0 || quoteAmount > 100_000) {
      return json({ error: 'Invalid event favor update' }, { status: 400 });
    }
    const result = await repository.run(
      'UPDATE StoreEventFavorRequest SET status = ?, estimate_amount = ?, updated_at = ? WHERE account_id = ? AND id = ?',
      [status, quoteAmount, new Date().toISOString(), auth.accountId, requestId],
    );
    return Number(result.meta.changes || 0) === 1 ? json({ updated: true }) : json({ error: 'Event favor request not found' }, { status: 404 });
  }
  return null;
}
