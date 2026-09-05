import { D1Repository } from '../lib/d1';

export interface ProductRow {
  id: string;
  account_id: string;
  name: string;
  description: string;
  price: number;
  quantity_in_stock: number;
  updated_at: string;
}

/**
 * Initial tenant-safe repository pattern. Every query receives accountId explicitly.
 */
export class CoreOperationsRepository {
  constructor(private readonly d1: D1Repository) {}

  listProducts(accountId: string): Promise<ProductRow[]> {
    return this.d1.all<ProductRow>(
      `SELECT id, account_id, name, description, price, quantity_in_stock, updated_at
       FROM Product WHERE account_id = ? ORDER BY updated_at DESC, name COLLATE NOCASE ASC`,
      [accountId],
    );
  }

  findProduct(accountId: string, productId: string): Promise<ProductRow | null> {
    return this.d1.first<ProductRow>(
      `SELECT id, account_id, name, description, price, quantity_in_stock, updated_at
       FROM Product WHERE account_id = ? AND id = ?`,
      [accountId, productId],
    );
  }
}
