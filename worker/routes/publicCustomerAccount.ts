import { createCustomerSessionToken, hashCustomerPassword, resolveStoreCustomer } from '../lib/customerAuth';
import { createD1Repository } from '../lib/d1';

function json(body: unknown, init: ResponseInit = {}) { const headers = new Headers(init.headers); headers.set('content-type', 'application/json; charset=utf-8'); headers.set('cache-control', 'no-store'); return new Response(JSON.stringify(body), { ...init, headers }); }
async function objectBody(request: Request) { try { const value = await request.json(); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; } catch { return null; } }
function text(value: unknown, max: number) { const out = String(value ?? '').trim(); return out.length <= max ? out : null; }
function bool(value: unknown) { return typeof value === 'boolean' ? value : null; }
function date(value: unknown) { const out = String(value ?? '').trim(); return /^$|^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null; }
function profile(row: Record<string, unknown>, expiresAt: string) { return { id: row.customerId || row.id, name: row.name, email: row.email, phone: row.phone || '', marketing_opt_in: Boolean(row.marketingOptIn ?? row.marketing_opt_in), reminder_opt_in: Boolean(row.reminderOptIn ?? row.reminder_opt_in), birthday: row.birthday || '', anniversary: row.anniversary || '', occasion_reminder_opt_in: Boolean(row.occasionReminderOptIn ?? row.occasion_reminder_opt_in), expires_at: expiresAt }; }
function address(input: Record<string, unknown> | null) {
  const result = { label: text(input?.label, 60), recipient_name: text(input?.recipient_name, 120), street_address_1: text(input?.street_address_1, 200), street_address_2: text(input?.street_address_2, 200), city: text(input?.city, 120), state_region: text(input?.state_region, 120), postal_code: text(input?.postal_code, 30), country: text(input?.country, 120), phone: text(input?.phone, 40), is_default: bool(input?.is_default) };
  if (result.label === null || !result.recipient_name || result.recipient_name.length < 2 || !result.street_address_1 || !result.city || !result.state_region || !result.postal_code || !result.country || result.country.length < 2 || result.street_address_2 === null || result.phone === null || result.is_default === null) return null;
  return result;
}

export async function handlePublicCustomerAccountRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const path = new URL(request.url).pathname;
  const match = path.match(/^\/api\/public\/store\/([^/]+)\/customers(?:\/(me|rewards)|\/notifications\/([^/]+)\/read|\/addresses(?:\/([^/]+))?)$/);
  if (!match) return null;
  let slug = ''; try { slug = decodeURIComponent(match[1]).trim(); } catch { /* invalid */ }
  if (!slug) return json({ error: 'Invalid store slug' }, { status: 400 });
  const customer = await resolveStoreCustomer(db, request, slug);
  if (!customer) return json({ error: 'Unauthorized' }, { status: 401 });
  const repo = createD1Repository(db); const target = match[2] || ''; const notificationId = match[3] ? decodeURIComponent(match[3]).trim() : ''; const addressId = match[4] ? decodeURIComponent(match[4]).trim() : '';

  if (target === 'me' && request.method === 'PUT') {
    const input = await objectBody(request); const name = text(input?.name, 120); const phone = text(input?.phone, 40); const marketing = bool(input?.marketing_opt_in); const reminder = bool(input?.reminder_opt_in); const birthday = date(input?.birthday); const anniversary = date(input?.anniversary); const occasion = bool(input?.occasion_reminder_opt_in);
    if (!name || name.length < 2 || phone === null || marketing === null || reminder === null || birthday === null || anniversary === null || occasion === null) return json({ error: 'Invalid customer profile' }, { status: 400 });
    const now = new Date().toISOString(); await repo.run('UPDATE StoreCustomer SET name = ?, phone = ?, marketing_opt_in = ?, reminder_opt_in = ?, birthday = ?, anniversary = ?, occasion_reminder_opt_in = ?, updated_at = ? WHERE account_id = ? AND id = ?', [name, phone, marketing ? 1 : 0, reminder ? 1 : 0, birthday, anniversary, occasion ? 1 : 0, now, customer.accountId, customer.customerId]);
    return json({ customer: profile({ ...customer, name, phone, marketingOptIn: marketing, reminderOptIn: reminder, birthday, anniversary, occasionReminderOptIn: occasion }, customer.expiresAt) });
  }
  if (target === 'me' && request.method === 'DELETE') {
    const now = new Date().toISOString(); await repo.batch([
      { query: 'DELETE FROM StoreCustomerSession WHERE account_id = ? AND customer_id = ?', values: [customer.accountId, customer.customerId] },
      { query: 'DELETE FROM StoreCustomerAddress WHERE account_id = ? AND customer_id = ?', values: [customer.accountId, customer.customerId] },
      { query: 'DELETE FROM StoreCustomerCollection WHERE account_id = ? AND customer_id = ?', values: [customer.accountId, customer.customerId] },
      { query: 'UPDATE StoreCustomer SET name = ?, email = ?, password_hash = ?, phone = \'\', marketing_opt_in = 0, reminder_opt_in = 0, active = 0, updated_at = ? WHERE account_id = ? AND id = ?', values: ['Deleted customer', `deleted-${customer.customerId}@store.invalid`, hashCustomerPassword(createCustomerSessionToken()), now, customer.accountId, customer.customerId] },
    ]); return json({ deleted: true });
  }
  if (target === 'rewards' && request.method === 'GET') {
    const [giftCards, credits, notifications, membershipRows, balance, ledger, referral] = await Promise.all([
      repo.all<Record<string, unknown>>('SELECT id, code, initial_balance, balance, active, created_at FROM StoreGiftCard WHERE account_id = ? AND customer_id = ? ORDER BY updated_at DESC', [customer.accountId, customer.customerId]),
      repo.all<Record<string, unknown>>('SELECT id, credit_type, label, balance, active, created_at FROM StoreCustomerCredit WHERE account_id = ? AND customer_id = ? ORDER BY updated_at DESC', [customer.accountId, customer.customerId]),
      repo.all<Record<string, unknown>>('SELECT id, category, title, message, is_read, created_at FROM StoreCustomerNotification WHERE account_id = ? AND customer_id = ? ORDER BY created_at DESC LIMIT 100', [customer.accountId, customer.customerId]),
      repo.all<Record<string, unknown>>('SELECT m.status, m.ends_at, p.name, p.discount_percent, p.active AS program_active FROM StoreCustomerMembership m JOIN StoreMembershipProgram p ON p.account_id = m.account_id WHERE m.account_id = ? AND m.customer_id = ? ORDER BY m.updated_at DESC LIMIT 1', [customer.accountId, customer.customerId]),
      repo.first<{ points: number }>('SELECT points FROM StoreCustomerRewardBalance WHERE account_id = ? AND customer_id = ? LIMIT 1', [customer.accountId, customer.customerId]),
      repo.all<Record<string, unknown>>('SELECT id, points, source, note, created_at FROM StoreCustomerRewardLedger WHERE account_id = ? AND customer_id = ? ORDER BY created_at DESC LIMIT 100', [customer.accountId, customer.customerId]),
      repo.first<{ code: string }>("SELECT code FROM StoreCustomerReferral WHERE account_id = ? AND referrer_customer_id = ? AND status = 'available' LIMIT 1", [customer.accountId, customer.customerId]),
    ]);
    let referralCode = referral?.code; if (!referralCode) { referralCode = `KACHA-${createCustomerSessionToken().slice(0, 8).toUpperCase()}`; await repo.run("INSERT INTO StoreCustomerReferral (id, account_id, code, referrer_customer_id, status, created_at) VALUES (?, ?, ?, ?, 'available', ?)", [crypto.randomUUID(), customer.accountId, referralCode, customer.customerId, new Date().toISOString()]); }
    const membership = membershipRows[0]; return json({ gift_cards: giftCards.map((card) => ({ ...card, active: Boolean(card.active), reward_discount_percent: Number(card.initial_balance) >= 100 ? 10 : 5 })), credits: credits.map((credit) => ({ ...credit, active: Boolean(credit.active) })), notifications: notifications.map((notice) => ({ ...notice, is_read: Boolean(notice.is_read) })), reward_points: Number(balance?.points || 0), reward_ledger: ledger, referral_code: referralCode, membership: membership ? { active: Boolean(membership.program_active) && membership.status === 'active' && (!membership.ends_at || String(membership.ends_at) > new Date().toISOString()), name: membership.name, discount_percent: Number(membership.discount_percent || 0), ends_at: membership.ends_at || null } : null });
  }
  if (notificationId && request.method === 'PATCH') { await repo.run('UPDATE StoreCustomerNotification SET is_read = 1 WHERE account_id = ? AND customer_id = ? AND id = ?', [customer.accountId, customer.customerId, notificationId]); return json({ ok: true }); }
  if (path.endsWith('/addresses') && request.method === 'POST') {
    const data = address(await objectBody(request)); if (!data) return json({ error: 'Invalid address' }, { status: 400 }); const id = crypto.randomUUID(); const now = new Date().toISOString(); if (data.is_default) await repo.run('UPDATE StoreCustomerAddress SET is_default = 0, updated_at = ? WHERE account_id = ? AND customer_id = ?', [now, customer.accountId, customer.customerId]); await repo.run('INSERT INTO StoreCustomerAddress (id, account_id, customer_id, label, recipient_name, street_address_1, street_address_2, city, state_region, postal_code, country, phone, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, customer.accountId, customer.customerId, data.label, data.recipient_name, data.street_address_1, data.street_address_2, data.city, data.state_region, data.postal_code, data.country, data.phone, data.is_default ? 1 : 0, now, now]); return json({ id, ...data }, { status: 201 });
  }
  if (addressId && request.method === 'PUT') {
    const data = address(await objectBody(request)); if (!data) return json({ error: 'Invalid address' }, { status: 400 }); const existing = await repo.first<{ id: string }>('SELECT id FROM StoreCustomerAddress WHERE account_id = ? AND customer_id = ? AND id = ? LIMIT 1', [customer.accountId, customer.customerId, addressId]); if (!existing) return json({ error: 'Address not found' }, { status: 404 }); const now = new Date().toISOString(); if (data.is_default) await repo.run('UPDATE StoreCustomerAddress SET is_default = 0, updated_at = ? WHERE account_id = ? AND customer_id = ?', [now, customer.accountId, customer.customerId]); await repo.run('UPDATE StoreCustomerAddress SET label = ?, recipient_name = ?, street_address_1 = ?, street_address_2 = ?, city = ?, state_region = ?, postal_code = ?, country = ?, phone = ?, is_default = ?, updated_at = ? WHERE account_id = ? AND customer_id = ? AND id = ?', [data.label, data.recipient_name, data.street_address_1, data.street_address_2, data.city, data.state_region, data.postal_code, data.country, data.phone, data.is_default ? 1 : 0, now, customer.accountId, customer.customerId, addressId]); return json({ id: addressId, ...data });
  }
  if (addressId && request.method === 'DELETE') { const result = await repo.run('DELETE FROM StoreCustomerAddress WHERE account_id = ? AND customer_id = ? AND id = ?', [customer.accountId, customer.customerId, addressId]); if (!Number(result.meta.changes || 0)) return json({ error: 'Address not found' }, { status: 404 }); return json({ deleted: true }); }
  return null;
}
