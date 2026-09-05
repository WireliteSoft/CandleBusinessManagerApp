import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

const WORKFLOW_STATUSES = ['new', 'custom_request', 'in_progress', 'awaiting_payment', 'order_shipped', 'completed', 'closed'] as const;
const PRIORITIES = ['none', 'normal', 'high', 'urgent'] as const;

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function contactRow(row: Record<string, unknown>) {
  return { ...row, is_read: Boolean(row.is_read) };
}

async function readObject(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

function emptyCounts() {
  return Object.fromEntries(WORKFLOW_STATUSES.map((status) => [status, { total: 0, urgent: 0 }])) as Record<(typeof WORKFLOW_STATUSES)[number], { total: number; urgent: number }>;
}

export async function handleProtectedContactMessagesRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const match = pathname.match(/^\/api\/teams\/contact-messages(?:\/([^/]+)(?:\/(read|workflow|ban-ip))?)?$/);
  if (!match) return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  const editAction = Boolean(match[2]) || request.method === 'DELETE';
  const permission = editAction ? 'teams_contacts_edit' : 'teams_contacts';
  if (!await canEditFeature(db, auth, permission)) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);
  const messageId = match[1] ? decodeURIComponent(match[1]).trim() : '';

  if (pathname === '/api/teams/contact-messages/counts' && request.method === 'GET') {
    const rows = await repository.all<{ workflow_status: string; count: number; urgent_count: number }>(
      `SELECT workflow_status, COUNT(*) AS count, SUM(CASE WHEN priority_level = 'urgent' THEN 1 ELSE 0 END) AS urgent_count
       FROM StoreContactMessage WHERE account_id = ? GROUP BY workflow_status`, [auth.accountId],
    );
    const counts = emptyCounts();
    for (const row of rows) {
      if (WORKFLOW_STATUSES.includes(row.workflow_status as (typeof WORKFLOW_STATUSES)[number])) {
        counts[row.workflow_status as (typeof WORKFLOW_STATUSES)[number]] = { total: Number(row.count), urgent: Number(row.urgent_count) };
      }
    }
    return json(counts);
  }

  if (pathname === '/api/teams/contact-messages' && request.method === 'GET') {
    const status = url.searchParams.get('status')?.trim().toLowerCase() || '';
    const bucket = url.searchParams.get('bucket')?.trim().toLowerCase() || '';
    let query = `SELECT id, name, email, street_address, city, state, zip, phone, message, ip_address, is_read, read_at,
      workflow_status, priority_level, admin_notes, created_at FROM StoreContactMessage WHERE account_id = ?`;
    const values: unknown[] = [auth.accountId];
    if (WORKFLOW_STATUSES.includes(status as (typeof WORKFLOW_STATUSES)[number])) {
      query += ' AND workflow_status = ?';
      values.push(status);
    } else if (bucket === 'new' || bucket === 'old') {
      query += ' AND is_read = ?';
      values.push(bucket === 'old' ? 1 : 0);
    }
    query += ' ORDER BY created_at DESC';
    return json((await repository.all<Record<string, unknown>>(query, values)).map(contactRow));
  }

  if (!messageId || messageId === 'counts') return null;
  const existing = await repository.first<{ id: string; ip_address: string }>(
    'SELECT id, ip_address FROM StoreContactMessage WHERE account_id = ? AND id = ?', [auth.accountId, messageId],
  );
  if (!existing) return json({ error: 'Contact message not found' }, { status: 404 });

  if (match[2] === 'read' && request.method === 'PUT') {
    const body = await readObject(request);
    if (!body || typeof body.is_read !== 'boolean') return json({ error: 'Invalid read state' }, { status: 400 });
    await repository.run('UPDATE StoreContactMessage SET is_read = ?, read_at = ? WHERE account_id = ? AND id = ?', [body.is_read ? 1 : 0, body.is_read ? new Date().toISOString() : null, auth.accountId, messageId]);
    return json({ ok: true });
  }
  if (match[2] === 'workflow' && request.method === 'PUT') {
    const body = await readObject(request);
    const workflowStatus = String(body?.workflow_status ?? '');
    const priority = String(body?.priority_level ?? '');
    const adminNotes = String(body?.admin_notes ?? '').trim();
    if (!WORKFLOW_STATUSES.includes(workflowStatus as (typeof WORKFLOW_STATUSES)[number]) || !PRIORITIES.includes(priority as (typeof PRIORITIES)[number]) || adminNotes.length > 5_000) return json({ error: 'Invalid workflow data' }, { status: 400 });
    const effectivePriority = workflowStatus === 'completed' || workflowStatus === 'closed' ? 'none' : priority;
    await repository.run('UPDATE StoreContactMessage SET workflow_status = ?, priority_level = ?, admin_notes = ? WHERE account_id = ? AND id = ?', [workflowStatus, effectivePriority, adminNotes, auth.accountId, messageId]);
    return json({ ok: true });
  }
  if (match[2] === 'ban-ip' && request.method === 'POST') {
    const ipAddress = String(existing.ip_address || '').trim().toLowerCase();
    if (!ipAddress) return json({ error: 'No IP address found for this message' }, { status: 400 });
    const body = await readObject(request);
    const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 300) : 'Spam contact message';
    const now = new Date().toISOString();
    await repository.run(
      `INSERT INTO IpBan (id, ip_address, reason, active, created_by_account_id, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?)
       ON CONFLICT(ip_address) DO UPDATE SET active = 1, reason = excluded.reason, created_by_account_id = excluded.created_by_account_id,
       created_by_user_id = excluded.created_by_user_id, updated_at = excluded.updated_at`,
      [crypto.randomUUID(), ipAddress, reason, auth.accountId, auth.userId, now, now],
    );
    return json({ ok: true, ip_address: ipAddress });
  }
  if (request.method === 'DELETE' && !match[2]) {
    await repository.run('DELETE FROM StoreContactMessage WHERE account_id = ? AND id = ?', [auth.accountId, messageId]);
    return new Response(null, { status: 204 });
  }
  return null;
}
