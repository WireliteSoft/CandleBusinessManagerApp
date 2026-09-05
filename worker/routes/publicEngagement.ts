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

async function findEliteAccount(db: D1Database, slug: string) {
  return createD1Repository(db).first<{ id: string; plan_tier: string }>(
    'SELECT id, plan_tier FROM Account WHERE lower(store_slug) = ? LIMIT 1',
    [slug.toLowerCase()],
  );
}

async function readVoteBody(request: Request) {
  try {
    const body = await request.json() as { option_name?: unknown; visitor_key?: unknown };
    const optionName = String(body.option_name || '').trim();
    const visitorKey = String(body.visitor_key || '').trim();
    if (!optionName || optionName.length > 120 || visitorKey.length < 16 || visitorKey.length > 160) return null;
    return { optionName, visitorKey };
  } catch {
    return null;
  }
}

export async function handlePublicEngagementRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;

  const url = new URL(request.url);
  const launchMatch = url.pathname.match(/^\/api\/public\/store\/([^/]+)\/launch-tools$/);
  const voteMatch = url.pathname.match(/^\/api\/public\/store\/([^/]+)\/polls\/([^/]+)\/votes$/);
  if (!launchMatch && !voteMatch) return null;

  const slug = decodeSegment((launchMatch || voteMatch)![1]);
  if (!slug) return json({ error: 'Invalid store slug' }, { status: 400 });
  const account = await findEliteAccount(db, slug);
  if (!account || account.plan_tier.toLowerCase() !== 'elite') {
    return json({ error: 'Storefront not found' }, { status: 404 });
  }

  const repository = createD1Repository(db);
  if (launchMatch && request.method === 'GET') {
    const visitorKey = String(url.searchParams.get('visitor_key') || '').trim().slice(0, 160);
    const polls = await repository.all<{ id: string; title: string; poll_type: string; options_json: string; vote_count: number }>(
      `SELECT p.id, p.title, p.poll_type, p.options_json, COUNT(v.id) AS vote_count
       FROM StoreScentPoll p LEFT JOIN StoreScentPollVote v ON v.poll_id = p.id AND v.account_id = p.account_id
       WHERE p.account_id = ? AND p.active = 1 GROUP BY p.id ORDER BY p.created_at DESC`,
      [account.id],
    );
    const optionCounts = await repository.all<{ poll_id: string; option_name: string; count: number }>(
      `SELECT poll_id, option_name, COUNT(*) AS count FROM StoreScentPollVote
       WHERE account_id = ? GROUP BY poll_id, option_name`,
      [account.id],
    );
    const visitorVotes = visitorKey.length >= 16
      ? await repository.all<{ poll_id: string; option_name: string }>(
        'SELECT poll_id, option_name FROM StoreScentPollVote WHERE account_id = ? AND visitor_key = ?',
        [account.id, visitorKey],
      )
      : [];
    const counts = new Map(optionCounts.map((row) => [`${row.poll_id}:${row.option_name}`, Number(row.count)]));
    const selected = new Map(visitorVotes.map((row) => [row.poll_id, row.option_name]));
    return json({ polls: polls.map((poll) => {
      let options: unknown[] = [];
      try { options = JSON.parse(poll.options_json || '[]'); } catch { /* Bad legacy data is empty. */ }
      return {
        id: poll.id,
        title: poll.title,
        poll_type: poll.poll_type,
        vote_count: Number(poll.vote_count),
        voted_option: selected.get(poll.id) || '',
        options: Array.isArray(options) ? options.map((option) => ({
          name: String(option), votes: counts.get(`${poll.id}:${String(option)}`) || 0,
        })) : [],
      };
    }) });
  }

  if (voteMatch && request.method === 'POST') {
    const pollId = decodeSegment(voteMatch[2]);
    const vote = await readVoteBody(request);
    if (!pollId || !vote) return json({ error: 'Invalid vote submission' }, { status: 400 });
    const poll = await repository.first<{ options_json: string }>(
      'SELECT options_json FROM StoreScentPoll WHERE account_id = ? AND id = ? AND active = 1',
      [account.id, pollId],
    );
    if (!poll) return json({ error: 'Poll not found' }, { status: 404 });
    let options: unknown[] = [];
    try { options = JSON.parse(poll.options_json || '[]'); } catch { /* Invalid options do not accept votes. */ }
    if (!Array.isArray(options) || !options.map(String).includes(vote.optionName)) {
      return json({ error: 'Invalid poll option' }, { status: 400 });
    }
    await repository.run(
      `INSERT INTO StoreScentPollVote (id, account_id, poll_id, visitor_key, option_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id, poll_id, visitor_key)
       DO UPDATE SET option_name = excluded.option_name, created_at = excluded.created_at`,
      [crypto.randomUUID(), account.id, pollId, vote.visitorKey, vote.optionName, new Date().toISOString()],
    );
    return json({ voted: true }, { status: 201 });
  }

  return null;
}
