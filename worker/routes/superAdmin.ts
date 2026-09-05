import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createD1Repository } from '../lib/d1';

type Config = { email?: string; password?: string };
type TableInfo = { name: string; pk: number };

const PLANS = new Set(['free', 'standard', 'pro', 'elite']);
const APPEAL_STATES = new Set(['open', 'in_review', 'resolved', 'rejected']);

function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

async function requestBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function pathId(value: string): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return '';
  }
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function equalSecrets(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizedEvidence(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 5);
}

function parseEvidence(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function validPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100000;
}

async function authenticated(request: Request, db: D1Database): Promise<boolean> {
  const token = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const row = await createD1Repository(db).first<{ id: string }>(
    'SELECT id FROM SuperAdminSession WHERE token = ? AND expires_at > ?',
    [token, new Date().toISOString()],
  );
  return Boolean(row);
}

async function accountRow(db: D1Database, accountId: string): Promise<Record<string, unknown> | null> {
  return createD1Repository(db).first<Record<string, unknown>>(
    `SELECT a.id, a.name, a.plan_tier, a.is_banned, a.ban_reason, a.access_disabled,
       a.disable_reason, a.created_at,
       (SELECT COUNT(*) FROM BanAppealTicket bt
        WHERE bt.account_id = a.id AND bt.status IN ('open', 'in_review')) AS active_appeal_count
     FROM Account a WHERE a.id = ?`,
    [accountId],
  );
}

async function tableMetadata(db: D1Database, table: string): Promise<{ columns: string[]; pkColumns: string[] } | null> {
  const tables = await createD1Repository(db).all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  if (!tables.some((row) => row.name === table)) return null;
  const info = await createD1Repository(db).all<TableInfo>(`PRAGMA table_info(${quoteIdentifier(table)})`);
  return {
    columns: info.map((column) => column.name),
    pkColumns: info.filter((column) => Number(column.pk) > 0).sort((a, b) => a.pk - b.pk).map((column) => column.name),
  };
}

export async function handleSuperAdminRequest(
  request: Request,
  db: D1Database | undefined,
  config: Config,
): Promise<Response | null> {
  if (!db) return null;

  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/superadmin/')) return null;
  const repo = createD1Repository(db);

  if (url.pathname === '/api/superadmin/login' && request.method === 'POST') {
    const data = await requestBody(request);
    const email = String(data?.email || '').trim().toLowerCase();
    const password = String(data?.password || '');
    if (!config.email || !config.password || !equalSecrets(email, config.email.toLowerCase()) || !equalSecrets(password, config.password)) {
      return json({ error: 'Invalid super admin credentials' }, { status: 401 });
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const token = randomBytes(32).toString('hex');
    await repo.run(
      'INSERT INTO SuperAdminSession (id, token, expires_at, created_at) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), token, expiresAt, now],
    );
    return json({ token, expires_at: expiresAt });
  }

  if (!await authenticated(request, db)) return json({ error: 'Unauthorized' }, { status: 401 });

  if (url.pathname === '/api/superadmin/accounts' && request.method === 'GET') {
    const accounts = await repo.all<Record<string, unknown>>(
      `SELECT a.id, a.name, a.plan_tier, a.is_banned, a.ban_reason, a.access_disabled,
         a.disable_reason, a.created_at,
         (SELECT COUNT(*) FROM BanAppealTicket bt
          WHERE bt.account_id = a.id AND bt.status IN ('open', 'in_review')) AS active_appeal_count
       FROM Account a ORDER BY a.created_at DESC`,
    );
    return json(accounts);
  }

  if (url.pathname === '/api/superadmin/billing-config') {
    if (request.method === 'GET') {
      const configRow = await repo.first<Record<string, unknown>>('SELECT * FROM BillingConfig WHERE id = ?', ['default']);
      return configRow ? json(configRow) : json({ error: 'Billing config not found' }, { status: 404 });
    }
    if (request.method === 'POST') {
      const data = await requestBody(request);
      const fields = ['standard_monthly_usd', 'standard_yearly_usd', 'pro_monthly_usd', 'pro_yearly_usd', 'elite_monthly_usd', 'elite_yearly_usd'];
      if (!data || fields.some((field) => !validPrice(data[field]))) return json({ error: 'Invalid billing prices' }, { status: 400 });
      const currency = String(data.currency || '').trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) return json({ error: 'Invalid billing currency' }, { status: 400 });
      const now = new Date().toISOString();
      await repo.run(
        `UPDATE BillingConfig SET standard_monthly_usd = ?, standard_yearly_usd = ?, pro_monthly_usd = ?,
         pro_yearly_usd = ?, elite_monthly_usd = ?, elite_yearly_usd = ?, currency = ?, updated_at = ? WHERE id = 'default'`,
        [...fields.map((field) => data[field]), currency, now],
      );
      return json(await repo.first<Record<string, unknown>>('SELECT * FROM BillingConfig WHERE id = ?', ['default']));
    }
  }

  if (url.pathname === '/api/superadmin/appeals/count' && request.method === 'GET') {
    const row = await repo.first<{ count: number }>("SELECT COUNT(*) AS count FROM BanAppealTicket WHERE status IN ('open', 'in_review')");
    return json({ count: Number(row?.count || 0) });
  }

  if (url.pathname === '/api/superadmin/appeals' && request.method === 'GET') {
    const accountId = String(url.searchParams.get('account_id') || '').trim();
    if (!accountId) return json([]);
    const tickets = await repo.all<Record<string, unknown>>(
      `SELECT t.*, a.ban_reason, a.ban_evidence_note, a.ban_evidence_image_data, a.ban_evidence_images_data
       FROM BanAppealTicket t LEFT JOIN Account a ON a.id = t.account_id
       WHERE t.account_id = ? ORDER BY t.updated_at DESC, t.created_at DESC`,
      [accountId],
    );
    return json(tickets.map((ticket) => ({ ...ticket, ban_evidence_images_data: parseEvidence(ticket.ban_evidence_images_data) })));
  }

  const accountUsers = url.pathname.match(/^\/api\/superadmin\/accounts\/([^/]+)\/users$/);
  if (accountUsers && request.method === 'GET') {
    const users = await repo.all<{ email: string; username: string; id: string }>(
      'SELECT id, email, username FROM AccountUser WHERE account_id = ? ORDER BY created_at DESC',
      [pathId(accountUsers[1])],
    );
    const rows = await Promise.all(users.map(async (user) => ({
      email: user.email || user.username,
      username: user.username || user.email,
      ip_address: (await repo.first<{ ip_address: string }>(
        "SELECT ip_address FROM AuthEvent WHERE account_user_id = ? AND event_type = 'login' ORDER BY created_at DESC LIMIT 1",
        [user.id],
      ))?.ip_address || '-',
    })));
    return json(rows);
  }

  const appealHistory = url.pathname.match(/^\/api\/superadmin\/accounts\/([^/]+)\/appeal-history$/);
  if (appealHistory && request.method === 'GET') {
    return json(await repo.all<Record<string, unknown>>(
      `SELECT h.id, h.ticket_id, h.ban_reason, h.appeal_status, h.completed_at,
         t.account_identifier, t.name, t.reason AS appeal_reason, t.details AS appeal_details
       FROM BanAppealHistory h JOIN BanAppealTicket t ON t.id = h.ticket_id
       WHERE h.account_id = ? ORDER BY h.completed_at DESC, h.created_at DESC`,
      [pathId(appealHistory[1])],
    ));
  }

  const moderation = url.pathname.match(/^\/api\/superadmin\/accounts\/([^/]+)\/(ban|disable|tier)$/);
  if (moderation && request.method === 'POST') {
    const accountId = pathId(moderation[1]);
    const action = moderation[2];
    const data = await requestBody(request);
    if (!await accountRow(db, accountId)) return json({ error: 'Account not found' }, { status: 404 });
    if (action === 'tier') {
      const tier = String(data?.tier || '');
      if (!PLANS.has(tier)) return json({ error: 'Invalid plan tier' }, { status: 400 });
      await repo.run('UPDATE Account SET plan_tier = ? WHERE id = ?', [tier, accountId]);
      return json(await accountRow(db, accountId));
    }
    const enabled = data?.value === true;
    const reason = String(data?.reason || '').trim();
    if (enabled && reason.length < 3) return json({ error: `A ${action} reason is required` }, { status: 400 });
    if (action === 'ban') {
      const evidence = normalizedEvidence(data?.evidence_images_data);
      const legacyEvidence = String(data?.evidence_image_data || '').trim();
      if (!evidence.length && legacyEvidence) evidence.push(legacyEvidence);
      await repo.run(
        `UPDATE Account SET is_banned = ?, ban_reason = ?, ban_evidence_note = ?,
         ban_evidence_image_data = ?, ban_evidence_images_data = ? WHERE id = ?`,
        [enabled ? 1 : 0, enabled ? reason : '', enabled ? String(data?.evidence_note || '').trim() : '', enabled ? evidence[0] || '' : '', enabled ? JSON.stringify(evidence) : '[]', accountId],
      );
    } else {
      await repo.run('UPDATE Account SET access_disabled = ?, disable_reason = ? WHERE id = ?', [enabled ? 1 : 0, enabled ? reason : '', accountId]);
    }
    return new Response(null, { status: 204 });
  }

  const accountDelete = url.pathname.match(/^\/api\/superadmin\/accounts\/([^/]+)$/);
  if (accountDelete && request.method === 'DELETE') {
    const accountId = pathId(accountDelete[1]);
    if (!await accountRow(db, accountId)) return json({ error: 'Account not found' }, { status: 404 });
    await repo.run('DELETE FROM Account WHERE id = ?', [accountId]);
    return new Response(null, { status: 204 });
  }

  const appeal = url.pathname.match(/^\/api\/superadmin\/appeals\/([^/]+)\/(messages|status)$/);
  if (appeal) {
    const ticketId = pathId(appeal[1]);
    const endpoint = appeal[2];
    if (endpoint === 'messages' && request.method === 'GET') {
      const ticket = await repo.first<Record<string, unknown>>(
        `SELECT t.*, a.ban_reason, a.ban_evidence_note, a.ban_evidence_image_data, a.ban_evidence_images_data
         FROM BanAppealTicket t LEFT JOIN Account a ON a.id = t.account_id WHERE t.id = ?`,
        [ticketId],
      );
      if (!ticket) return json({ error: 'Appeal ticket not found' }, { status: 404 });
      const messages = await repo.all<Record<string, unknown>>(
        'SELECT id, sender_type, sender_name, message, created_at FROM BanAppealMessage WHERE ticket_id = ? ORDER BY created_at',
        [ticketId],
      );
      return json({ ticket: { ...ticket, ban_evidence_images_data: parseEvidence(ticket.ban_evidence_images_data) }, messages });
    }
    if (endpoint === 'messages' && request.method === 'POST') {
      const ticket = await repo.first<{ status: string }>('SELECT status FROM BanAppealTicket WHERE id = ?', [ticketId]);
      if (!ticket) return json({ error: 'Appeal ticket not found' }, { status: 404 });
      if (ticket.status === 'resolved' || ticket.status === 'rejected') return json({ error: 'This appeal is closed' }, { status: 400 });
      const message = String((await requestBody(request))?.message || '').trim();
      if (!message || message.length > 5000) return json({ error: 'Invalid message' }, { status: 400 });
      const now = new Date().toISOString();
      const messageId = crypto.randomUUID();
      await repo.batch([
        { query: "INSERT INTO BanAppealMessage (id, ticket_id, sender_type, sender_name, message, created_at) VALUES (?, ?, 'admin', 'Admin', ?, ?)", values: [messageId, ticketId, message, now] },
        { query: 'UPDATE BanAppealTicket SET updated_at = ? WHERE id = ?', values: [now, ticketId] },
      ]);
      return json({ ok: true, id: messageId, created_at: now }, { status: 201 });
    }
    if (endpoint === 'status' && request.method === 'POST') {
      const status = String((await requestBody(request))?.status || '');
      if (!APPEAL_STATES.has(status)) return json({ error: 'Invalid appeal status' }, { status: 400 });
      const ticket = await repo.first<{ account_id: string | null; reason: string }>('SELECT account_id, reason FROM BanAppealTicket WHERE id = ?', [ticketId]);
      if (!ticket) return json({ error: 'Appeal ticket not found' }, { status: 404 });
      const now = new Date().toISOString();
      const statements = [{ query: 'UPDATE BanAppealTicket SET status = ?, updated_at = ? WHERE id = ?', values: [status, now, ticketId] }];
      if ((status === 'resolved' || status === 'rejected') && ticket.account_id) {
        statements.push({ query: `INSERT INTO BanAppealHistory (id, ticket_id, account_id, ban_reason, appeal_status, completed_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(ticket_id) DO UPDATE SET ban_reason = excluded.ban_reason, appeal_status = excluded.appeal_status, completed_at = excluded.completed_at, updated_at = excluded.updated_at`, values: [crypto.randomUUID(), ticketId, ticket.account_id, ticket.reason, status, now, now, now] });
        if (status === 'resolved') statements.push({ query: `UPDATE Account SET is_banned = 0, ban_reason = '', ban_evidence_note = '', ban_evidence_image_data = '',
          ban_evidence_images_data = '[]', access_disabled = 0, disable_reason = '' WHERE id = ?`, values: [ticket.account_id] });
      }
      await repo.batch(statements);
      return new Response(null, { status: 204 });
    }
  }

  if (url.pathname === '/api/superadmin/db/tables' && request.method === 'GET') {
    const tables = await repo.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    return json({ tables: tables.map((table) => table.name) });
  }

  if (url.pathname === '/api/superadmin/db/table' && request.method === 'GET') {
    const table = String(url.searchParams.get('table') || '').trim();
    const metadata = table ? await tableMetadata(db, table) : null;
    if (!metadata) return json({ error: 'Invalid table name' }, { status: 400 });
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 100)) || 100);
    const rows = await repo.all<Record<string, unknown>>(`SELECT * FROM ${quoteIdentifier(table)} LIMIT ?`, [limit]);
    return json({ source: 'master', account_id: null, table, columns: metadata.columns, pk_columns: metadata.pkColumns, rows, limit, offset: 0 });
  }

  const dbRow = url.pathname.match(/^\/api\/superadmin\/db\/table\/([^/]+)\/row$/);
  if (dbRow && (request.method === 'PUT' || request.method === 'DELETE')) {
    const table = pathId(dbRow[1]);
    const metadata = table ? await tableMetadata(db, table) : null;
    if (!metadata || !metadata.pkColumns.length) return json({ error: 'Table is not editable' }, { status: 400 });
    const data = await requestBody(request);
    const pk = data?.pk && typeof data.pk === 'object' ? data.pk as Record<string, unknown> : null;
    if (!pk || metadata.pkColumns.some((column) => !(column in pk))) return json({ error: 'Primary key values are required' }, { status: 400 });
    const where = metadata.pkColumns.map((column) => `${quoteIdentifier(column)} = ?`).join(' AND ');
    const pkValues = metadata.pkColumns.map((column) => pk[column]);
    if (request.method === 'DELETE') {
      await repo.run(`DELETE FROM ${quoteIdentifier(table)} WHERE ${where}`, pkValues);
      return new Response(null, { status: 204 });
    }
    const values = data?.values && typeof data.values === 'object' ? data.values as Record<string, unknown> : null;
    const updates = values ? Object.entries(values).filter(([column]) => metadata.columns.includes(column) && !metadata.pkColumns.includes(column)) : [];
    if (!updates.length) return json({ error: 'No editable columns supplied' }, { status: 400 });
    const set = updates.map(([column]) => `${quoteIdentifier(column)} = ?`).join(', ');
    await repo.run(`UPDATE ${quoteIdentifier(table)} SET ${set} WHERE ${where}`, [...updates.map(([, value]) => value), ...pkValues]);
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Super-admin endpoint not found' }, { status: 404 });
}
