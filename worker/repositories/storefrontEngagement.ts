import { D1Repository } from '../lib/d1';

export class StorefrontEngagementRepository {
  constructor(private readonly d1: D1Repository) {}

  listActivePolls(accountId: string) {
    return this.d1.all<{ id: string; title: string; poll_type: string; options_json: string }>(
      `SELECT id, title, poll_type, options_json FROM StoreScentPoll
       WHERE account_id = ? AND active = 1 ORDER BY created_at DESC`,
      [accountId],
    );
  }

  listPublishedReviews(accountId: string, productId: string) {
    return this.d1.all<{ id: string; rating: number; title: string; body: string; created_at: string }>(
      `SELECT id, rating, title, body, created_at FROM StoreProductReview
       WHERE account_id = ? AND product_id = ? AND status = 'approved' ORDER BY created_at DESC`,
      [accountId, productId],
    );
  }
}
