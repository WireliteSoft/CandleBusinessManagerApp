export const ORDER_RESERVATION_MINUTES = 30;

export function mixMatchDiscountPercent(quantity: number) {
  if (quantity >= 12) return 0.6;
  if (quantity >= 6) return 0.4;
  if (quantity >= 3) return 0.2;
  return 0;
}

export function money(value: number) { return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100; }

export function reservationExpiry(now = Date.now()) { return new Date(now + ORDER_RESERVATION_MINUTES * 60_000).toISOString(); }

export function orderNumber(now = new Date()) { return `CM-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()}`; }

export async function expireUnpaidReservations(repository: { run(query: string, values?: unknown[]): Promise<unknown> }, accountId: string, now = new Date().toISOString()) {
  await repository.run("UPDATE StoreOrder SET status = 'cancelled', fulfillment_status = 'cancelled', staff_note = CASE WHEN staff_note = '' THEN 'Payment reservation expired.' ELSE staff_note END, updated_at = ? WHERE account_id = ? AND status = 'awaiting_payment' AND payment_status = 'unpaid' AND reservation_expires_at IS NOT NULL AND reservation_expires_at <= ?", [now, accountId, now]);
}
