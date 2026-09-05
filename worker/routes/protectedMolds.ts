import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

async function readMold(request: Request, partial: boolean) {
  try {
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const body = input as Record<string, unknown>;
    const output: Record<string, string | number> = {};
    if ('name' in body) {
      const name = String(body.name ?? '').trim();
      if (!name || name.length > 240) return null;
      output.name = name;
    }
    if ('weight_oz' in body) {
      const weight = Number(body.weight_oz);
      if (!Number.isFinite(weight) || weight <= 0 || weight > 100_000) return null;
      output.weight_oz = weight;
    }
    if ('image_data' in body) {
      const image = String(body.image_data ?? '');
      if (image.length > 7_000_000) return null;
      output.image_data = image;
    }
    if (!partial && (!('name' in output) || !('weight_oz' in output))) return null;
    return output;
  } catch {
    return null;
  }
}

export async function handleProtectedMoldsRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const match = new URL(request.url).pathname.match(/^\/api\/molds(?:\/([^/]+))?$/);
  if (!match) return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'supplies_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);
  const moldId = match[1] ? decodeURIComponent(match[1]).trim() : '';

  if (request.method === 'GET' && !moldId) {
    return json(await repository.all<Record<string, unknown>>(
      'SELECT * FROM Mold WHERE account_id = ? ORDER BY name COLLATE NOCASE ASC, created_at DESC', [auth.accountId],
    ));
  }
  if (request.method === 'POST' && !moldId) {
    const mold = await readMold(request, false);
    if (!mold) return json({ error: 'Invalid mold data' }, { status: 400 });
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await repository.run(
      'INSERT INTO Mold (id, account_id, name, weight_oz, image_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, auth.accountId, mold.name, mold.weight_oz, mold.image_data || '', now, now],
    );
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM Mold WHERE account_id = ? AND id = ?', [auth.accountId, id]), { status: 201 });
  }
  if (!moldId) return null;
  if (request.method === 'PUT') {
    const mold = await readMold(request, true);
    if (!mold || !Object.keys(mold).length) return json({ error: 'Invalid mold data' }, { status: 400 });
    const result = await repository.run(
      `UPDATE Mold SET ${[...Object.keys(mold).map((field) => `"${field}" = ?`), '"updated_at" = ?'].join(', ')} WHERE account_id = ? AND id = ?`,
      [...Object.values(mold), new Date().toISOString(), auth.accountId, moldId],
    );
    if (Number(result.meta.changes || 0) !== 1) return json({ error: 'Mold not found' }, { status: 404 });
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM Mold WHERE account_id = ? AND id = ?', [auth.accountId, moldId]));
  }
  if (request.method === 'DELETE') {
    const result = await repository.run('DELETE FROM Mold WHERE account_id = ? AND id = ?', [auth.accountId, moldId]);
    return Number(result.meta.changes || 0) === 1
      ? new Response(null, { status: 204 })
      : json({ error: 'Mold not found' }, { status: 404 });
  }
  return null;
}
