import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

const POLL_TYPES = new Set(['next_scent', 'retired_scent']);
const REQUEST_STATUSES = new Set(['new', 'reviewing', 'quoted', 'accepted', 'declined', 'closed']);

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function pollRow(row: Record<string, unknown> | null) {
  return row ? { ...row, active: Boolean(row.active), vote_count: Number(row.vote_count || 0) } : null;
}

async function readObject(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

async function pollWithVotes(repository: ReturnType<typeof createD1Repository>, accountId: string, id: string) {
  return pollRow(await repository.first<Record<string, unknown>>(
    `SELECT p.*, COUNT(v.id) AS vote_count FROM StoreScentPoll p
     LEFT JOIN StoreScentPollVote v ON v.account_id = p.account_id AND v.poll_id = p.id
     WHERE p.account_id = ? AND p.id = ? GROUP BY p.id`, [accountId, id],
  ));
}

export async function handleProtectedLaunchToolsRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const pathname = new URL(request.url).pathname;
  const pollMatch = pathname.match(/^\/api\/storefront\/launch-tools\/polls(?:\/([^/]+))?$/);
  const requestMatch = pathname.match(/^\/api\/storefront\/launch-tools\/requests\/([^/]+)$/);
  const overview = pathname === '/api/storefront/launch-tools';
  if (!overview && !pollMatch && !requestMatch) return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'storefront_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);

  if (overview && request.method === 'GET') {
    const [polls, requests] = await Promise.all([
      repository.all<Record<string, unknown>>(
        `SELECT p.*, COUNT(v.id) AS vote_count FROM StoreScentPoll p
         LEFT JOIN StoreScentPollVote v ON v.account_id = p.account_id AND v.poll_id = p.id
         WHERE p.account_id = ? GROUP BY p.id ORDER BY p.created_at DESC`, [auth.accountId],
      ),
      repository.all<Record<string, unknown>>(
        `SELECT * FROM StoreCustomScentRequest WHERE account_id = ?
         ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, created_at DESC`, [auth.accountId],
      ),
    ]);
    return json({ polls: polls.map((row) => pollRow(row)), requests });
  }

  if (pollMatch) {
    const pollId = pollMatch[1] ? decodeURIComponent(pollMatch[1]).trim() : '';
    if (request.method === 'POST' && !pollId) {
      const body = await readObject(request);
      const title = String(body?.title ?? '').trim();
      const pollType = String(body?.poll_type ?? 'next_scent');
      const rawOptions = Array.isArray(body?.options) ? body.options : [];
      const normalizedOptions = rawOptions.map((option) => String(option ?? '').trim());
      const options = [...new Set(normalizedOptions)];
      if (title.length < 3 || title.length > 180 || !POLL_TYPES.has(pollType) || rawOptions.length < 2 || rawOptions.length > 12 || normalizedOptions.some((option) => !option || option.length > 120) || options.length < 2) return json({ error: 'Invalid poll data' }, { status: 400 });
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await repository.run(
        'INSERT INTO StoreScentPoll (id, account_id, title, poll_type, options_json, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
        [id, auth.accountId, title, pollType, JSON.stringify(options), now, now],
      );
      return json(await pollWithVotes(repository, auth.accountId, id), { status: 201 });
    }
    if (request.method === 'PATCH' && pollId) {
      const existing = await repository.first<{ id: string; title: string; active: number }>('SELECT id, title, active FROM StoreScentPoll WHERE account_id = ? AND id = ?', [auth.accountId, pollId]);
      if (!existing) return json({ error: 'Poll not found' }, { status: 404 });
      const body = await readObject(request);
      if (!body || (body.active !== undefined && typeof body.active !== 'boolean') || (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length < 3 || body.title.trim().length > 180))) return json({ error: 'Invalid poll data' }, { status: 400 });
      if (!('active' in body) && !('title' in body)) return json({ error: 'No poll changes supplied' }, { status: 400 });
      await repository.run('UPDATE StoreScentPoll SET active = ?, title = ?, updated_at = ? WHERE account_id = ? AND id = ?', [body.active === undefined ? existing.active : body.active ? 1 : 0, body.title === undefined ? existing.title : body.title.trim(), new Date().toISOString(), auth.accountId, pollId]);
      return json(await pollWithVotes(repository, auth.accountId, pollId));
    }
  }

  if (requestMatch && request.method === 'PATCH') {
    const requestId = decodeURIComponent(requestMatch[1]).trim();
    const body = await readObject(request);
    const status = String(body?.status ?? '');
    const quoteAmount = Number(body?.quote_amount);
    const adminNotes = String(body?.admin_notes ?? '');
    if (!REQUEST_STATUSES.has(status) || !Number.isFinite(quoteAmount) || quoteAmount < 0 || quoteAmount > 100_000 || adminNotes.length > 4_000) return json({ error: 'Invalid custom scent request data' }, { status: 400 });
    const result = await repository.run('UPDATE StoreCustomScentRequest SET status = ?, quote_amount = ?, admin_notes = ?, updated_at = ? WHERE account_id = ? AND id = ?', [status, quoteAmount, adminNotes, new Date().toISOString(), auth.accountId, requestId]);
    return Number(result.meta.changes || 0) === 1 ? json({ ok: true }) : json({ error: 'Custom scent request not found' }, { status: 404 });
  }
  return null;
}
