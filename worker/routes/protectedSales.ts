import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository, type D1Result } from '../lib/d1';

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

async function readSale(request: Request) {
  const body = await readObject(request);
  if (!body) return null;
  const productId = String(body.product_id ?? '').trim();
  const employeeId = body.employee_id === null || body.employee_id === '' ? null : String(body.employee_id ?? '').trim();
  const quantity = Number(body.quantity);
  const salePrice = Number(body.sale_price);
  const totalAmount = Number(body.total_amount);
  const commissionAmount = Number(body.commission_amount);
  if (!productId || productId.length > 128 || (employeeId !== null && (!employeeId || employeeId.length > 128)) ||
    !Number.isInteger(quantity) || quantity < 1 || quantity > 100_000 ||
    ![salePrice, totalAmount, commissionAmount].every(Number.isFinite) || commissionAmount < 0) return null;
  return { productId, employeeId, quantity, salePrice, totalAmount, commissionAmount };
}

function employeeRow(row: Record<string, unknown> | null) {
  return row ? { ...row, active: Boolean(row.active) } : null;
}

function saleDetailsRow(row: Record<string, unknown>) {
  return {
    ...row,
    products: typeof row.products === 'string' ? JSON.parse(row.products) : row.products,
    employees: employeeRow(typeof row.employees === 'string' ? JSON.parse(row.employees) : row.employees as Record<string, unknown> | null),
  };
}

export async function handleProtectedSalesRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const pathname = new URL(request.url).pathname;
  const detailRoute = pathname === '/api/sales/details';
  const recordRoute = pathname === '/api/sales/record';
  const employeeMatch = pathname.match(/^\/api\/sales\/([^/]+)\/employee$/);
  const saleMatch = pathname.match(/^\/api\/sales\/([^/]+)$/);
  if (!detailRoute && !recordRoute && !employeeMatch && !saleMatch) return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'teams_employees_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);

  if (detailRoute && request.method === 'GET') {
    const rows = await repository.all<Record<string, unknown>>(
      `SELECT s.id, s.product_id, s.employee_id, s.quantity, s.sale_price, s.total_amount, s.commission_amount, s.sale_date, s.created_at,
        json_object('id', p.id, 'name', p.name, 'description', p.description, 'image_data', p.image_data, 'product_type', p.product_type,
          'scent_family', p.scent_family, 'fragrance_notes', p.fragrance_notes, 'sweetness', p.sweetness, 'scent_strength', p.scent_strength,
          'warmth', p.warmth, 'freshness', p.freshness, 'season', p.season, 'mood', p.mood, 'room', p.room, 'burn_time', p.burn_time,
          'wax_type', p.wax_type, 'wick_type', p.wick_type, 'batch_number', p.batch_number, 'inspiration', p.inspiration,
          'making_process', p.making_process, 'limited_drop', p.limited_drop, 'drop_number', p.drop_number, 'purchase_limit', p.purchase_limit,
          'upcoming_release', p.upcoming_release, 'release_date', p.release_date, 'preorders_enabled', p.preorders_enabled,
          'member_exclusive', p.member_exclusive, 'member_early_access_days', p.member_early_access_days,
          'subscriber_exclusive', p.subscriber_exclusive, 'subscriber_early_access_days', p.subscriber_early_access_days,
          'price', p.price, 'quantity_in_stock', p.quantity_in_stock, 'cost_per_unit', p.cost_per_unit, 'created_at', p.created_at, 'updated_at', p.updated_at) AS products,
        CASE WHEN e.id IS NULL THEN NULL ELSE json_object('id', e.id, 'name', e.name, 'email', e.email, 'address', e.address,
          'phone', e.phone, 'picture_data', e.picture_data, 'commission_rate', e.commission_rate, 'active', e.active, 'created_at', e.created_at) END AS employees
       FROM Sale s JOIN Product p ON p.id = s.product_id AND p.account_id = s.account_id
       LEFT JOIN Employee e ON e.id = s.employee_id AND e.account_id = s.account_id
       WHERE s.account_id = ? ORDER BY s.sale_date DESC`,
      [auth.accountId],
    );
    return json(rows.map(saleDetailsRow));
  }

  if (recordRoute && request.method === 'POST') {
    const sale = await readSale(request);
    if (!sale) return json({ error: 'Invalid sale data' }, { status: 400 });
    if (sale.employeeId) {
      const employee = await repository.first<{ id: string }>('SELECT id FROM Employee WHERE account_id = ? AND id = ?', [auth.accountId, sale.employeeId]);
      if (!employee) return json({ error: 'Employee not found' }, { status: 404 });
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const results = await repository.batch([
      {
        query: 'UPDATE Product SET quantity_in_stock = quantity_in_stock - ?, updated_at = ? WHERE account_id = ? AND id = ? AND quantity_in_stock >= ?',
        values: [sale.quantity, now, auth.accountId, sale.productId, sale.quantity],
      },
      {
        // changes() is evaluated after the guarded update in the same D1 batch transaction.
        query: 'INSERT INTO Sale (id, account_id, product_id, employee_id, quantity, sale_price, total_amount, commission_amount, sale_date, created_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1',
        values: [id, auth.accountId, sale.productId, sale.employeeId, sale.quantity, sale.salePrice, sale.totalAmount, sale.commissionAmount, now, now],
      },
    ]) as D1Result[];
    if (Number(results[1]?.meta.changes || 0) !== 1) {
      const product = await repository.first<{ id: string }>('SELECT id FROM Product WHERE account_id = ? AND id = ?', [auth.accountId, sale.productId]);
      return json({ error: product ? 'Not enough inventory' : 'Product not found' }, { status: product ? 400 : 404 });
    }
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM Sale WHERE account_id = ? AND id = ?', [auth.accountId, id]), { status: 201 });
  }

  if (employeeMatch && ['PATCH', 'POST', 'PUT'].includes(request.method)) {
    const saleId = decodeURIComponent(employeeMatch[1]).trim();
    const body = await readObject(request);
    const employeeId = body?.employee_id === null || body?.employee_id === '' ? null : String(body?.employee_id ?? '').trim();
    if (employeeId !== null && (!employeeId || employeeId.length > 128)) return json({ error: 'Invalid employee assignment' }, { status: 400 });
    const sale = await repository.first<{ id: string; total_amount: number }>('SELECT id, total_amount FROM Sale WHERE account_id = ? AND id = ?', [auth.accountId, saleId]);
    if (!sale) return json({ error: 'Sale not found' }, { status: 404 });
    let commissionAmount = 0;
    if (employeeId) {
      const employee = await repository.first<{ commission_rate: number }>('SELECT commission_rate FROM Employee WHERE account_id = ? AND id = ?', [auth.accountId, employeeId]);
      if (!employee) return json({ error: 'Employee not found' }, { status: 404 });
      commissionAmount = Number(sale.total_amount) * Number(employee.commission_rate);
    }
    await repository.run('UPDATE Sale SET employee_id = ?, commission_amount = ? WHERE account_id = ? AND id = ?', [employeeId, commissionAmount, auth.accountId, saleId]);
    return json(await repository.first<Record<string, unknown>>('SELECT * FROM Sale WHERE account_id = ? AND id = ?', [auth.accountId, saleId]));
  }

  if (saleMatch && request.method === 'DELETE') {
    const saleId = decodeURIComponent(saleMatch[1]).trim();
    const result = await repository.run('DELETE FROM Sale WHERE account_id = ? AND id = ?', [auth.accountId, saleId]);
    return Number(result.meta.changes || 0) === 1 ? new Response(null, { status: 204 }) : json({ error: 'Sale not found' }, { status: 404 });
  }
  return null;
}
