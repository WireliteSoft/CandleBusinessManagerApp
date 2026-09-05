import { createD1Repository } from './d1';

export async function awardReward(db: D1Database, accountId: string, customerId: string, points: number, source: string, referenceId: string, note: string) {
  if (!customerId || !Number.isInteger(points) || points === 0) return false;
  const repository = createD1Repository(db); const now = new Date().toISOString();
  const result = await repository.run(`INSERT OR IGNORE INTO StoreCustomerRewardLedger (id, account_id, customer_id, points, source, reference_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [crypto.randomUUID(), accountId, customerId, points, source, referenceId, note, now]);
  if (Number(result.meta.changes || 0) !== 1) return false;
  await repository.run(`INSERT INTO StoreCustomerRewardBalance (customer_id, account_id, points, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(customer_id) DO UPDATE SET points = points + excluded.points, updated_at = excluded.updated_at`, [customerId, accountId, points, now]);
  return true;
}
