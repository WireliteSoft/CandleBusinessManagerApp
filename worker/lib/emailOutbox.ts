import type { D1Repository } from './d1';

export type EmailOutboxMessage = { eventId: string };
export type EmailDeliveryConfig = { deliveryUrl?: string; deliveryToken?: string };
export type EmailOutboxQueue = { send(message: EmailOutboxMessage): Promise<void> };

export async function enqueueStoreEmail(repo: D1Repository, queue: EmailOutboxQueue | undefined, event: { accountId: string; eventType: string; recipient: string; subject: string; body: string; now?: string }) {
  const id = crypto.randomUUID();
  const now = event.now || new Date().toISOString();
  await repo.run(
    "INSERT INTO StoreEmailEvent (id, account_id, event_type, recipient, subject, body, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)",
    [id, event.accountId, event.eventType, event.recipient, event.subject, event.body, now, now],
  );
  if (queue) {
    try { await queue.send({ eventId: id }); } catch { /* The durable pending record can be replayed after a queue outage. */ }
  }
  return id;
}

export async function deliverStoreEmail(db: D1Database | undefined, message: EmailOutboxMessage, config: EmailDeliveryConfig) {
  if (!db) throw new Error('D1 binding is not configured');
  const url = String(config.deliveryUrl || '').trim();
  if (!url) throw new Error('EMAIL_DELIVERY_URL is not configured');
  const event = await db.prepare("SELECT id, account_id, event_type, recipient, subject, body FROM StoreEmailEvent WHERE id = ? AND status = 'pending' LIMIT 1").bind(message.eventId).first<Record<string, unknown>>();
  if (!event) return;
  const headers = new Headers({ 'content-type': 'application/json' });
  const token = String(config.deliveryToken || '').trim(); if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(event) });
  if (!response.ok) throw new Error(`Email delivery returned ${response.status}`);
  const now = new Date().toISOString();
  await db.prepare("UPDATE StoreEmailEvent SET status = 'sent', sent_at = ?, error_message = '', updated_at = ? WHERE id = ? AND status = 'pending'").bind(now, now, message.eventId).run();
}
