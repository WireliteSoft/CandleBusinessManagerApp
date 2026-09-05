import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

const STRING_LIMITS: Record<string, number> = {
  supplier: 240, supplier_sku: 240, name: 240, scent_family: 120, top_notes: 2000,
  middle_notes: 2000, base_notes: 2000, vanillin_content: 160, soy_performance: 500,
  recommended_load: 160, usage_notes: 5000, source_url: 2000, source_attribution: 500,
};
const BOOLEAN_FIELDS = new Set(['phthalate_free', 'prop65_warning']);

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

async function readProfile(request: Request, partial: boolean) {
  try {
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const body = input as Record<string, unknown>;
    const output: Record<string, string | number | null> = {};
    for (const [field, limit] of Object.entries(STRING_LIMITS)) {
      if (!(field in body)) continue;
      const value = String(body[field] ?? '').trim();
      if (value.length > limit || (field === 'name' && !value)) return null;
      output[field] = value;
    }
    for (const field of BOOLEAN_FIELDS) {
      if (!(field in body)) continue;
      if (typeof body[field] !== 'boolean') return null;
      output[field] = body[field] ? 1 : 0;
    }
    if ('flashpoint_f' in body) {
      if (body.flashpoint_f === null || body.flashpoint_f === '') output.flashpoint_f = null;
      else {
        const flashpoint = Number(body.flashpoint_f);
        if (!Number.isFinite(flashpoint) || flashpoint < 0 || flashpoint > 2_000) return null;
        output.flashpoint_f = flashpoint;
      }
    }
    if (!partial && !('name' in output)) return null;
    return output;
  } catch {
    return null;
  }
}

export async function handleProtectedScentProfilesRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const match = new URL(request.url).pathname.match(/^\/api\/scent-profiles(?:\/([^/]+))?$/);
  if (!match) return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'supplies_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);
  const profileId = match[1] ? decodeURIComponent(match[1]).trim() : '';

  if (request.method === 'GET' && !profileId) {
    return json(await repository.all<Record<string, unknown>>('SELECT * FROM ScentProfile ORDER BY name ASC, created_at DESC'));
  }
  if (request.method === 'POST' && !profileId) {
    const profile = await readProfile(request, false);
    if (!profile) return json({ error: 'Invalid scent profile data' }, { status: 400 });
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const columns = ['id', ...Object.keys(profile), 'created_at', 'updated_at'];
    await repository.run(
      `INSERT INTO ScentProfile (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      [id, ...Object.values(profile), now, now],
    );
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM ScentProfile WHERE id = ?', [id]), { status: 201 });
  }
  if (!profileId) return null;
  if (request.method === 'PUT') {
    const profile = await readProfile(request, true);
    if (!profile || !Object.keys(profile).length) return json({ error: 'Invalid scent profile data' }, { status: 400 });
    const result = await repository.run(
      `UPDATE ScentProfile SET ${[...Object.keys(profile).map((column) => `"${column}" = ?`), '"updated_at" = ?'].join(', ')} WHERE id = ?`,
      [...Object.values(profile), new Date().toISOString(), profileId],
    );
    if (Number(result.meta.changes || 0) !== 1) return json({ error: 'Scent profile not found' }, { status: 404 });
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM ScentProfile WHERE id = ?', [profileId]));
  }
  if (request.method === 'DELETE') {
    const result = await repository.run('DELETE FROM ScentProfile WHERE id = ?', [profileId]);
    return Number(result.meta.changes || 0) === 1
      ? new Response(null, { status: 204 })
      : json({ error: 'Scent profile not found' }, { status: 404 });
  }
  return null;
}
