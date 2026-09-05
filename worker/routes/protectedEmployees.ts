import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function employeeRow(row: Record<string, unknown> | null) {
  return row ? { ...row, active: Boolean(row.active) } : null;
}

async function readEmployee(request: Request, partial: boolean) {
  try {
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const body = input as Record<string, unknown>;
    const output: Record<string, string | number> = {};
    const strings = { name: 240, email: 320, address: 2000, phone: 80, picture_data: 7_000_000 } as const;
    for (const [field, max] of Object.entries(strings)) {
      if (!(field in body)) continue;
      const value = String(body[field] ?? '').trim();
      if (value.length > max || ((field === 'name' || field === 'email') && !value)) return null;
      if (field === 'email' && !EMAIL_PATTERN.test(value)) return null;
      output[field] = value;
    }
    if ('commission_rate' in body) {
      const commissionRate = Number(body.commission_rate);
      if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 1) return null;
      output.commission_rate = commissionRate;
    }
    if ('active' in body) {
      if (typeof body.active !== 'boolean') return null;
      output.active = body.active ? 1 : 0;
    }
    if (!partial && ['name', 'email', 'commission_rate', 'active'].some((field) => !(field in output))) return null;
    return output;
  } catch {
    return null;
  }
}

export async function handleProtectedEmployeesRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/api\/employees(?:\/([^/]+))?$/);
  if (!match) return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'teams_employees_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);
  const employeeId = match[1] ? decodeURIComponent(match[1]).trim() : '';

  if (request.method === 'GET' && pathname === '/api/employees') {
    const rows = await repository.all<Record<string, unknown>>('SELECT * FROM Employee WHERE account_id = ? ORDER BY created_at DESC', [auth.accountId]);
    return json(rows.map(employeeRow));
  }
  if (request.method === 'GET' && pathname === '/api/employees/active') {
    const rows = await repository.all<Record<string, unknown>>(
      'SELECT * FROM Employee WHERE account_id = ? AND active = 1 ORDER BY name COLLATE NOCASE ASC', [auth.accountId],
    );
    return json(rows.map(employeeRow));
  }
  if (request.method === 'POST' && !employeeId) {
    const employee = await readEmployee(request, false);
    if (!employee) return json({ error: 'Invalid employee data' }, { status: 400 });
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const columns = ['id', 'account_id', ...Object.keys(employee), 'created_at'];
    await repository.run(
      `INSERT INTO Employee (${columns.map((field) => `"${field}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      [id, auth.accountId, ...Object.values(employee), now],
    );
    return json(employeeRow(await repository.first<Record<string, unknown>>('SELECT * FROM Employee WHERE account_id = ? AND id = ?', [auth.accountId, id])), { status: 201 });
  }
  if (!employeeId || employeeId === 'active') return null;
  if (request.method === 'PUT') {
    const employee = await readEmployee(request, true);
    if (!employee || !Object.keys(employee).length) return json({ error: 'Invalid employee data' }, { status: 400 });
    const result = await repository.run(
      `UPDATE Employee SET ${Object.keys(employee).map((field) => `"${field}" = ?`).join(', ')} WHERE account_id = ? AND id = ?`,
      [...Object.values(employee), auth.accountId, employeeId],
    );
    if (Number(result.meta.changes || 0) !== 1) return json({ error: 'Employee not found' }, { status: 404 });
    return json(employeeRow(await repository.first<Record<string, unknown>>('SELECT * FROM Employee WHERE account_id = ? AND id = ?', [auth.accountId, employeeId])));
  }
  if (request.method === 'DELETE') {
    const result = await repository.run('DELETE FROM Employee WHERE account_id = ? AND id = ?', [auth.accountId, employeeId]);
    return Number(result.meta.changes || 0) === 1
      ? new Response(null, { status: 204 })
      : json({ error: 'Employee not found' }, { status: 404 });
  }
  return null;
}
