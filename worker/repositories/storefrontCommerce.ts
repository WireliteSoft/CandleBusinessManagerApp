import { D1Repository } from '../lib/d1';

export interface StoreOrderSummary {
  id: string;
  account_id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  total_amount: number;
  created_at: string;
}

export class StorefrontCommerceRepository {
  constructor(private readonly d1: D1Repository) {}

  listCustomerOrders(accountId: string, customerId: string): Promise<StoreOrderSummary[]> {
    return this.d1.all<StoreOrderSummary>(
      `SELECT id, account_id, order_number, status, payment_status, fulfillment_status, total_amount, created_at
       FROM StoreOrder WHERE account_id = ? AND customer_id = ? ORDER BY created_at DESC`,
      [accountId, customerId],
    );
  }

  findGiftCard(accountId: string, code: string): Promise<{ id: string; balance: number; active: number } | null> {
    return this.d1.first<{ id: string; balance: number; active: number }>(
      'SELECT id, balance, active FROM StoreGiftCard WHERE account_id = ? AND code = ?',
      [accountId, code],
    );
  }
}
