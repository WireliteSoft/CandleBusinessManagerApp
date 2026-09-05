import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

const STRING_LIMITS: Record<string, number> = {
  batch_date: 40, batch_name: 240, wax_type: 120, container_type: 240, container_size: 120,
  fragrance_oil: 240, wick_type: 120, wick_size: 120, vessel: 240, notes: 10_000,
};
const NONNEGATIVE_NUMBERS = new Set([
  'wax_weight_oz', 'fragrance_load', 'pour_temp_f', 'room_temp_f', 'room_humidity',
  'pricing_wax_cost', 'pricing_wax_weight_lb', 'pricing_fragrance_used_oz', 'pricing_fragrance_cost_used',
  'pricing_fill_per_candle_oz', 'pricing_jar_cost_each', 'pricing_wick_cost_each', 'pricing_label_cost_each',
  'pricing_other_cost_each', 'pricing_labor_overhead_each', 'pricing_material_cost_per_candle',
  'pricing_total_cost_per_candle', 'pricing_wholesale_suggestion', 'pricing_retail_suggestion', 'pricing_premium_suggestion',
]);
const INTEGER_FIELDS = new Set(['candles_amount', 'wick_count']);
const CREATE_DEFAULTS: Record<string, string | number> = {
  candles_amount: 1, wax_type: '', container_type: '', container_size: '', fragrance_oil: '', wick_type: '', wick_size: '',
  wick_count: 1, vessel: '', pour_temp_f: 0, room_temp_f: 0, room_humidity: 0,
  pricing_wax_cost: 0, pricing_wax_weight_lb: 0, pricing_fragrance_used_oz: 0, pricing_fragrance_cost_used: 0,
  pricing_fill_per_candle_oz: 0, pricing_jar_cost_each: 0, pricing_wick_cost_each: 0, pricing_label_cost_each: 0,
  pricing_other_cost_each: 0, pricing_labor_overhead_each: 0, pricing_material_cost_per_candle: 0,
  pricing_total_cost_per_candle: 0, pricing_wholesale_suggestion: 0, pricing_retail_suggestion: 0,
  pricing_premium_suggestion: 0, pricing_cogs_source: 'total', pricing_price_source: 'retail', notes: '', outcome: 'pending',
};

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

async function readBatchLog(request: Request, partial: boolean) {
  try {
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const body = input as Record<string, unknown>;
    const output: Record<string, string | number> = {};
    for (const [field, max] of Object.entries(STRING_LIMITS)) {
      if (!(field in body)) continue;
      const value = String(body[field] ?? '').trim();
      if (value.length > max || ((field === 'batch_date' || field === 'batch_name') && !value)) return null;
      output[field] = value;
    }
    for (const field of NONNEGATIVE_NUMBERS) {
      if (!(field in body)) continue;
      const value = Number(body[field]);
      const maximum = field === 'fragrance_load' || field === 'room_humidity' ? 100 : 10_000_000;
      if (!Number.isFinite(value) || value < 0 || value > maximum) return null;
      output[field] = value;
    }
    for (const field of INTEGER_FIELDS) {
      if (!(field in body)) continue;
      const value = Number(body[field]);
      if (!Number.isInteger(value) || value < (field === 'wick_count' ? 1 : 0) || value > 100_000) return null;
      output[field] = value;
    }
    if ('pricing_cogs_source' in body) {
      if (body.pricing_cogs_source !== 'total') return null;
      output.pricing_cogs_source = 'total';
    }
    if ('pricing_price_source' in body) {
      const source = String(body.pricing_price_source);
      if (!['wholesale', 'retail', 'premium'].includes(source)) return null;
      output.pricing_price_source = source;
    }
    if ('outcome' in body) {
      const outcome = String(body.outcome);
      if (!['pending', 'pass', 'fail'].includes(outcome)) return null;
      output.outcome = outcome;
    }
    if (!partial && ['batch_date', 'batch_name', 'wax_weight_oz', 'fragrance_load'].some((field) => !(field in output))) return null;
    return partial ? output : { ...CREATE_DEFAULTS, ...output };
  } catch {
    return null;
  }
}

export async function handleProtectedBatchLogsRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const match = new URL(request.url).pathname.match(/^\/api\/batch-logs(?:\/([^/]+))?$/);
  if (!match) return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'batches_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);
  const batchLogId = match[1] ? decodeURIComponent(match[1]).trim() : '';

  if (request.method === 'GET' && !batchLogId) {
    return json(await repository.all<Record<string, unknown>>(
      'SELECT * FROM BatchLog WHERE account_id = ? ORDER BY batch_date DESC, created_at DESC', [auth.accountId],
    ));
  }
  if (request.method === 'POST' && !batchLogId) {
    const batchLog = await readBatchLog(request, false);
    if (!batchLog) return json({ error: 'Invalid batch log data' }, { status: 400 });
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const columns = ['id', 'account_id', ...Object.keys(batchLog), 'created_at', 'updated_at'];
    await repository.run(
      `INSERT INTO BatchLog (${columns.map((field) => `"${field}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      [id, auth.accountId, ...Object.values(batchLog), now, now],
    );
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM BatchLog WHERE account_id = ? AND id = ?', [auth.accountId, id]), { status: 201 });
  }
  if (!batchLogId) return null;
  if (request.method === 'GET') {
    const batchLog = await repository.first<Record<string, unknown>>('SELECT * FROM BatchLog WHERE account_id = ? AND id = ?', [auth.accountId, batchLogId]);
    return batchLog ? json(batchLog) : json({ error: 'Batch log not found' }, { status: 404 });
  }
  if (request.method === 'PUT') {
    const batchLog = await readBatchLog(request, true);
    if (!batchLog || !Object.keys(batchLog).length) return json({ error: 'Invalid batch log data' }, { status: 400 });
    const result = await repository.run(
      `UPDATE BatchLog SET ${[...Object.keys(batchLog).map((field) => `"${field}" = ?`), '"updated_at" = ?'].join(', ')} WHERE account_id = ? AND id = ?`,
      [...Object.values(batchLog), new Date().toISOString(), auth.accountId, batchLogId],
    );
    if (Number(result.meta.changes || 0) !== 1) return json({ error: 'Batch log not found' }, { status: 404 });
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM BatchLog WHERE account_id = ? AND id = ?', [auth.accountId, batchLogId]));
  }
  if (request.method === 'DELETE') {
    const result = await repository.run('DELETE FROM BatchLog WHERE account_id = ? AND id = ?', [auth.accountId, batchLogId]);
    return Number(result.meta.changes || 0) === 1 ? new Response(null, { status: 204 }) : json({ error: 'Batch log not found' }, { status: 404 });
  }
  return null;
}
