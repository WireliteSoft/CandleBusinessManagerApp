import { request, requestPublic } from '../localDbCore';
import type {
  PublicStorefrontConfig,
  StoreContactMessageRecord,
  StoreContactMessageStatusCounts,
  StorefrontConfig,
  StorefrontProductSummary,
  StoreCustomerAddress,
  StoreCustomerOrderDetail,
  StoreCustomerOrderSummary,
  StoreCustomerProfile,
  StorefrontOrderRecord,
  StoreScentPollRecord,
  StoreCustomScentRequestRecord,
} from '../localDbTypes';

export function createStorefrontApi() {
  return {
    async getStorefront(): Promise<StorefrontConfig> {
      return request('/api/storefront');
    },

    async saveStorefront(data: StorefrontConfig): Promise<StorefrontConfig> {
      return request('/api/storefront', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async getPublicStorefront(slug: string): Promise<PublicStorefrontConfig> {
      return request(`/api/public/store/${encodeURIComponent(slug)}`);
    },

    async getStoreAlsoBought(slug: string, productId: string): Promise<StorefrontProductSummary[]> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}/also-bought`);
    },

    async createBackInStockAlert(slug: string, productId: string, email: string): Promise<{ subscribed: true }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}/back-in-stock-alerts`, {
        method: 'POST', body: JSON.stringify({ email }),
      });
    },

    async createWaitlistEntry(slug: string, productId: string, email: string): Promise<{ subscribed: true }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}/waitlist`, {
        method: 'POST', body: JSON.stringify({ email }),
      });
    },

    async getStoreLaunchTools(slug: string, visitorKey?: string): Promise<{ polls: StoreScentPollRecord[] }> {
      const query = visitorKey ? `?visitor_key=${encodeURIComponent(visitorKey)}` : '';
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/launch-tools${query}`);
    },
    async getStoreFragranceOils(slug: string, query = ''): Promise<Array<{ id: string; name: string; image_url: string; source_url: string; discontinued: boolean; variants: Array<{ sku: string; price: number; label: string }> }>> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/fragrance-oils${query ? `?q=${encodeURIComponent(query)}` : ''}`); },
    async voteStoreScentPoll(slug: string, pollId: string, option_name: string, visitor_key: string): Promise<{ voted: true }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/polls/${encodeURIComponent(pollId)}/votes`, { method: 'POST', body: JSON.stringify({ option_name, visitor_key }) });
    },
    async submitCustomScentRequest(slug: string, data: { name: string; email: string; desired_notes: string; scent_family: string; occasion: string; details: string }): Promise<{ submitted: true }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/custom-scent-requests`, { method: 'POST', body: JSON.stringify(data) });
    },
    async submitEventFavorRequest(slug: string, data: { name: string; email: string; quantity: number; vessel: string; scent: string; label_text: string; packaging: string; event_date: string; details: string }): Promise<{ submitted: true; estimate_amount: number }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/event-favor-requests`, { method: 'POST', body: JSON.stringify(data) }); },
    async getStorefrontEventFavors(): Promise<Array<{ id: string; name: string; email: string; quantity: number; vessel: string; scent: string; label_text: string; packaging: string; event_date: string; details: string; estimate_amount: number; status: 'new' | 'reviewing' | 'quoted' | 'accepted' | 'declined' | 'closed' }>> { return request('/api/storefront/event-favors'); },
    async getCustomOrderQuotes(): Promise<Array<{ id: string; customer_name: string; customer_email: string; title: string; details: string; revision: number; status: 'draft' | 'sent' | 'approved' | 'declined' | 'in_production' | 'complete'; total_amount: number; deposit_amount: number; deposit_paid: boolean; final_paid: boolean }>> { return request('/api/storefront/custom-order-quotes'); },
    async createCustomOrderQuote(data: { customer_name: string; customer_email: string; title: string; details: string; total_amount: number; deposit_amount: number }): Promise<{ id: string }> { return request('/api/storefront/custom-order-quotes', { method: 'POST', body: JSON.stringify(data) }); },
    async getPublicCustomOrderQuote(slug: string, code: string): Promise<{ title: string; details: string; revision: number; status: string; total_amount: number; deposit_amount: number; deposit_paid: boolean; final_paid: boolean }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/custom-order-quotes/${encodeURIComponent(code)}`); },
    async decidePublicCustomOrderQuote(slug: string, code: string, decision: 'approved' | 'declined'): Promise<{ updated: true }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/custom-order-quotes/${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify({ decision }) }); },
    async updateCustomOrderQuote(id: string, data: { status: 'draft' | 'sent' | 'approved' | 'declined' | 'in_production' | 'complete'; total_amount: number; deposit_amount: number; deposit_paid: boolean; final_paid: boolean; details: string }): Promise<{ updated: true }> { return request(`/api/storefront/custom-order-quotes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }); },
    async getStorefrontFeatureSettings(): Promise<Array<{ feature_key: 'custom_labels' | 'custom_scent' | 'event_favors' | 'refill_program'; enabled: boolean }>> { return request('/api/storefront/feature-settings'); },
    async getStorefrontPickup(): Promise<{ settings: { instructions: string; cutoff_hours: number; active: boolean }; slots: Array<{ id: string; starts_at: string; capacity: number; active: boolean }> }> { return request('/api/storefront/pickup'); }, async updateStorefrontPickupSettings(data: { instructions: string; cutoff_hours: number; active: boolean }) { return request('/api/storefront/pickup/settings', { method: 'PUT', body: JSON.stringify(data) }); }, async createStorefrontPickupSlot(data: { starts_at: string; capacity: number }) { return request('/api/storefront/pickup/slots', { method: 'POST', body: JSON.stringify(data) }); }, async updateStorefrontPickupSlot(id: string, active: boolean) { return request(`/api/storefront/pickup/slots/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ active }) }); },
    async getStorefrontWorkshops(): Promise<Array<{ id: string; starts_at: string; capacity: number; deposit_amount: number; active: boolean; booked: number }>> { return request('/api/storefront/workshops'); },
    async createStorefrontWorkshop(data: { starts_at: string; capacity: number; deposit_amount: number }): Promise<{ created: true }> { return request('/api/storefront/workshops', { method: 'POST', body: JSON.stringify(data) }); },
    async updateStorefrontWorkshop(id: string, active: boolean): Promise<{ updated: true }> { return request(`/api/storefront/workshops/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ active }) }); },
    async getStorefrontWorkshopBookings(): Promise<Array<{ id: string; slot_id: string; name: string; email: string; party_size: number; status: 'confirmed' | 'cancelled' | 'attended' | 'no_show'; payment_status: 'deposit_pending' | 'paid'; starts_at: string; deposit_amount: number }>> { return request('/api/storefront/workshop-bookings'); },
    async updateStorefrontWorkshopBooking(id: string, status: 'confirmed' | 'cancelled' | 'attended' | 'no_show'): Promise<{ updated: true }> { return request(`/api/storefront/workshop-bookings/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); },
    async getPublicWorkshops(slug: string): Promise<Array<{ id: string; starts_at: string; capacity: number; deposit_amount: number; booked: number }>> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/workshops`); },
    async bookPublicWorkshop(slug: string, id: string, data: { name: string; email: string; party_size: number }): Promise<{ booked: true }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/workshops/${encodeURIComponent(id)}/book`, { method: 'POST', body: JSON.stringify(data) }); },
    async submitWorkshopPartyRequest(slug: string, data: { name: string; email: string; event_type: 'birthday' | 'date_night' | 'bridal_party' | 'corporate' | 'other'; requested_date: string; party_size: number; details: string }): Promise<{ submitted: true }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/workshop-party-requests`, { method: 'POST', body: JSON.stringify(data) }); },
    async getStorefrontWorkshopPartyRequests(): Promise<Array<{ id: string; name: string; email: string; event_type: string; requested_date: string; party_size: number; details: string; status: 'new' | 'reviewing' | 'quoted' | 'confirmed' | 'declined' | 'closed'; admin_notes: string }>> { return request('/api/storefront/workshop-party-requests'); },
    async updateStorefrontWorkshopPartyRequest(id: string, data: { status: 'new' | 'reviewing' | 'quoted' | 'confirmed' | 'declined' | 'closed'; admin_notes: string }): Promise<{ updated: true }> { return request(`/api/storefront/workshop-party-requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }); },
    async getStorefrontRefillProgram(): Promise<{ active: boolean; discount_percent: number; eligibility_rules: string; return_instructions: string }> { return request('/api/storefront/refill-program'); },
    async updateStorefrontRefillProgram(data: { active: boolean; discount_percent: number; eligibility_rules: string; return_instructions: string }): Promise<{ updated: true }> { return request('/api/storefront/refill-program', { method: 'PUT', body: JSON.stringify(data) }); },
    async getStorefrontRefillRequests(): Promise<Array<{ id: string; name: string; email: string; product_name: string; scent: string; quantity: number; container_condition: string; details: string; status: 'new' | 'eligible' | 'received' | 'in_production' | 'ready' | 'completed' | 'declined' | 'issue'; container_received: boolean; discount_percent: number; staff_notes: string }>> { return request('/api/storefront/refill-requests'); },
    async updateStorefrontRefillRequest(id: string, data: { status: 'new' | 'eligible' | 'received' | 'in_production' | 'ready' | 'completed' | 'declined' | 'issue'; container_received: boolean; discount_percent: number; staff_notes: string }): Promise<{ updated: true }> { return request(`/api/storefront/refill-requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }); },
    async getPublicRefillProgram(slug: string): Promise<{ active: boolean; discount_percent: number; eligibility_rules: string; return_instructions: string }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/refill-program`); },
    async submitPublicRefillRequest(slug: string, data: { name: string; email: string; product_name: string; scent: string; quantity: number; container_condition: 'clean_intact' | 'minor_wear' | 'damaged'; details: string }): Promise<{ submitted: true; discount_percent: number }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/refill-requests`, { method: 'POST', body: JSON.stringify(data) }); },
    async updateStorefrontFeatureSetting(key: 'custom_labels' | 'custom_scent' | 'event_favors' | 'refill_program', enabled: boolean): Promise<{ updated: true }> { return request(`/api/storefront/feature-settings/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ enabled }) }); },
    async updateStorefrontEventFavor(id: string, data: { status: 'new' | 'reviewing' | 'quoted' | 'accepted' | 'declined' | 'closed'; quote_amount: number }): Promise<{ updated: true }> { return request(`/api/storefront/event-favors/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }); },
    async submitGiftPackRequest(slug: string, data: { name: string; email: string; recipient_name: string; gift_message: string; pack_size: number; items: Array<{ name: string; size: string; wickCount: string; wickType: string }> }): Promise<{ submitted: true }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/gift-pack-requests`, { method: 'POST', body: JSON.stringify(data) });
    },
    async saveStoreCustomerCollection(slug: string, token: string, data: { collection_name: string; label_text: string; collection_size: number; items: Array<{ name: string; size: string; wickCount: string; wickType: string }> }): Promise<{ saved: true }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/collections`, { method: 'POST', body: JSON.stringify(data) }, token);
    },
    async getStoreCustomerCollections(slug: string, token: string): Promise<Array<{ id: string; collection_name: string; label_text: string; collection_size: number; items: Array<{ name: string; size: string; wickCount: string; wickType: string }>; created_at: string }>> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/collections`, undefined, token);
    },
    async getStoreCustomerGallery(slug: string, token: string): Promise<{ collections: Array<{ id: string; title: string; details: string; image_data: string; source_type: 'collection' }>; custom_orders: Array<{ id: string; title: string; details: string; image_data: string; source_type: 'custom_order' }>; gallery: Array<{ id: string; source_type: string; source_id: string; title: string; image_data: string; details: string; status: 'pending' | 'approved' | 'rejected'; created_at: string }> }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/gallery`, undefined, token); },
    async submitStoreCustomerGallery(slug: string, token: string, data: { source_type: 'collection' | 'custom_order'; source_id: string; title: string; image_data?: string }): Promise<{ submitted: true }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/gallery`, { method: 'POST', body: JSON.stringify(data) }, token); },
    async getPublicStoreGallery(slug: string): Promise<Array<{ id: string; title: string; image_data: string; details: string; source_type: string; created_at: string; customer_name: string }>> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/gallery`); },
    async getPublicSubscriptionPlans(slug: string): Promise<Array<{ id: string; name: string; plan_type: string; description: string; candle_count: number; monthly_price: number; quarterly_price: number; monthly_delivery_day: number; quarterly_start_month: number }>> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/subscription-plans`); },
    async getPublicPickup(slug: string): Promise<{ active: boolean; instructions: string; slots: Array<{ starts_at: string; capacity: number; reserved: number }> }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/pickup`); },
    async getStoreCustomerSubscriptions(slug: string, token: string): Promise<Array<{ id: string; status: 'active' | 'paused' | 'cancelled' | 'pending_payment'; cadence: 'monthly' | 'quarterly'; shipping_address_id: string | null; next_shipment_at: string | null; skip_next: boolean; payment_status: string; plan_name: string; candle_count: number }>> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/subscriptions`, undefined, token); },
    async updateStoreCustomerSubscription(slug: string, token: string, id: string, data: { action: 'skip' | 'pause' | 'resume' | 'cancel' | 'address'; shipping_address_id?: string }): Promise<{ updated: true }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/subscriptions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }, token); },
    async createStoreGiftRegistry(slug: string, token: string, data: { title: string; event_date: string; message: string; product_ids: string[] }): Promise<{ id: string; share_code: string }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/registries`, { method: 'POST', body: JSON.stringify(data) }, token); },
    async getStoreGiftRegistries(slug: string, token: string): Promise<Array<{ id: string; share_code: string; title: string; event_date: string; message: string; item_count: number; active: boolean }>> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/registries`, undefined, token); },
    async getStoreCustomerFavorites(slug: string, token: string): Promise<Array<{ id: string; name: string; image_data: string; price: number; created_at: string }>> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/favorites`, undefined, token); },
    async saveStoreCustomerFavorite(slug: string, token: string, productId: string): Promise<{ saved: true }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/favorites/${encodeURIComponent(productId)}`, { method: 'POST' }, token); },
    async deleteStoreCustomerFavorite(slug: string, token: string, productId: string): Promise<{ deleted: true }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/favorites/${encodeURIComponent(productId)}`, { method: 'DELETE' }, token); },
    async getPublicGiftRegistry(slug: string, shareCode: string): Promise<{ title: string; event_date: string; message: string; products: StorefrontProductSummary[] }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/registries/${encodeURIComponent(shareCode)}`); },
    async getStoreProductReviews(slug: string, productId: string): Promise<Array<{ id: string; rating: number; title: string; body: string; photo_data: string; verified_purchase: boolean; customer_name: string; created_at: string }>> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}/reviews`); },
    async submitStoreProductReview(slug: string, token: string, data: { product_id: string; rating: number; title: string; body: string; photo_data?: string }): Promise<{ submitted: true; verified_purchase: boolean }> { return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/reviews`, { method: 'POST', body: JSON.stringify(data) }, token); },
    async getStoreCustomerRewards(slug: string, token: string): Promise<{ gift_cards: Array<{ id: string; code: string; initial_balance: number; balance: number; active: boolean; reward_discount_percent: number; created_at: string }>; credits: Array<{ id: string; credit_type: 'free_gift' | 'giveaway_balance'; label: string; balance: number; active: boolean; created_at: string }>; notifications: Array<{ id: string; category: string; title: string; message: string; is_read: boolean; created_at: string }>; reward_points: number; reward_ledger: Array<{ id: string; points: number; source: string; note: string; created_at: string }>; referral_code: string; membership: { active: boolean; name: string; discount_percent: number; ends_at: string | null } | null }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/rewards`, undefined, token);
    },
    async markStoreCustomerNotificationRead(slug: string, token: string, notificationId: string): Promise<{ ok: true }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH' }, token);
    },

    async getStoreCheckoutConfig(slug: string): Promise<{ currency: string; square_enabled: boolean; square_application_id: string; square_location_id: string; paypal_enabled: boolean; paypal_client_id: string }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/checkout-config`);
    },

    async submitPublicStoreContact(
      slug: string,
      data: {
        name: string;
        email: string;
        street_address: string;
        city: string;
        state: string;
        zip: string;
        phone: string;
        message: string;
      }
    ): Promise<{ ok: true }> {
      return request(`/api/public/store/${encodeURIComponent(slug)}/contact`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async registerStoreCustomer(slug: string, data: { name: string; email: string; password: string; password_confirm: string; referral_code?: string }): Promise<{ token: string; customer: StoreCustomerProfile }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/register`, {
        method: 'POST', body: JSON.stringify(data),
      });
    },

    async loginStoreCustomer(slug: string, data: { email: string; password: string }): Promise<{ token: string; customer: StoreCustomerProfile }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/login`, {
        method: 'POST', body: JSON.stringify(data),
      });
    },

    async getStoreCustomerMe(slug: string, token: string): Promise<{ customer: StoreCustomerProfile; addresses: StoreCustomerAddress[] }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/me`, undefined, token);
    },

    async updateStoreCustomerMe(slug: string, token: string, data: { name: string; phone: string; marketing_opt_in: boolean; reminder_opt_in: boolean; birthday: string; anniversary: string; occasion_reminder_opt_in: boolean }): Promise<{ customer: StoreCustomerProfile }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/me`, {
        method: 'PUT', body: JSON.stringify(data),
    }, token);
    },

    async deleteStoreCustomerMe(slug: string, token: string): Promise<{ deleted: true }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/me`, { method: 'DELETE' }, token);
    },

    async addStoreCustomerAddress(slug: string, token: string, data: Omit<StoreCustomerAddress, 'id'>): Promise<StoreCustomerAddress> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/addresses`, {
        method: 'POST', body: JSON.stringify(data),
      }, token);
    },

    async updateStoreCustomerAddress(slug: string, token: string, addressId: string, data: Omit<StoreCustomerAddress, 'id'>): Promise<StoreCustomerAddress> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/addresses/${encodeURIComponent(addressId)}`, {
        method: 'PUT', body: JSON.stringify(data),
      }, token);
    },

    async deleteStoreCustomerAddress(slug: string, token: string, addressId: string): Promise<{ deleted: true }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/customers/addresses/${encodeURIComponent(addressId)}`, { method: 'DELETE' }, token);
    },

    async getStoreCustomerOrders(slug: string, token: string): Promise<StoreCustomerOrderSummary[]> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/orders`, undefined, token);
    },
    async getStoreCustomerOrder(slug: string, token: string, orderId: string): Promise<StoreCustomerOrderDetail> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderId)}`, undefined, token);
    },
    async createStoreOrder(slug: string, token: string, data: { items: Array<{ product_id: string; quantity: number; customization?: { size: string; scent: string; wick: string; label: string; label_date?: string; label_message?: string; label_logo_data?: string; label_style?: 'classic' | 'minimal' | 'celebration'; label_approval_status?: 'pending_review' | 'approved' | 'changes_requested'; label_production_notes?: string; extras: string[] } }>; shipping_address_id?: string; delivery_method?: 'shipping' | 'pickup'; pickup_slot_at?: string; gift_card_code?: string; gift_card_terms_accepted?: boolean; gift_card_delivery_method?: 'digital' | 'physical'; customer_credit_id?: string; discount_code?: string }): Promise<{ order: { id: string; total_amount: number; currency: string; order_number: string; gift_card_discount_amount?: number; gift_card_applied_amount?: number; discount_code?: string; discount_code_amount?: number; payment_status?: string }; payment_required: boolean }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/orders`, { method: 'POST', body: JSON.stringify(data) }, token);
    },
    async payStoreOrderWithSquare(slug: string, token: string, order_id: string, source_id: string): Promise<{ paid: boolean }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/orders/pay/square`, { method: 'POST', body: JSON.stringify({ order_id, source_id }) }, token);
    },
    async createStorePayPalOrder(slug: string, token: string, order_id: string): Promise<{ order_id: string }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/orders/pay/paypal/create`, { method: 'POST', body: JSON.stringify({ order_id }) }, token);
    },
    async captureStorePayPalOrder(slug: string, token: string, order_id: string): Promise<{ paid: boolean }> {
      return requestPublic(`/api/public/store/${encodeURIComponent(slug)}/orders/pay/paypal/capture`, { method: 'POST', body: JSON.stringify({ order_id }) }, token);
    },

    async getStorefrontProducts(): Promise<StorefrontProductSummary[]> {
      return request('/api/storefront/products');
    },
    async getStorefrontLaunchTools(): Promise<{ polls: StoreScentPollRecord[]; requests: StoreCustomScentRequestRecord[] }> { return request('/api/storefront/launch-tools'); },
    async createStorefrontScentPoll(data: { title: string; poll_type: 'next_scent' | 'retired_scent'; options: string[] }): Promise<StoreScentPollRecord> { return request('/api/storefront/launch-tools/polls', { method: 'POST', body: JSON.stringify(data) }); },
    async updateStorefrontScentPoll(id: string, data: { active?: boolean; title?: string }): Promise<StoreScentPollRecord> { return request(`/api/storefront/launch-tools/polls/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }); },
    async updateStorefrontCustomScentRequest(id: string, data: { status: StoreCustomScentRequestRecord['status']; quote_amount: number; admin_notes: string }): Promise<{ ok: true }> { return request(`/api/storefront/launch-tools/requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }); },

    async getStorefrontOrders(): Promise<StorefrontOrderRecord[]> {
      return request('/api/storefront/orders');
    },
    async getStorefrontOrder(id: string): Promise<{ items: Array<{ id: string; product_name: string; customization_json: string }> }> { return request(`/api/storefront/orders/${encodeURIComponent(id)}`); },
    async reviewStorefrontOrderLabel(orderId: string, itemId: string, data: { label_approval_status: 'pending_review' | 'approved' | 'changes_requested'; label_production_notes: string }): Promise<{ updated: true; customization: Record<string, string> }> { return request(`/api/storefront/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/label-review`, { method: 'PATCH', body: JSON.stringify(data) }); },
    async getStorefrontGiftCards(): Promise<{ cards: Array<{ id: string; code: string; customer_id: string | null; customer_name?: string; customer_email?: string; initial_balance: number; balance: number; active: boolean; created_at: string }>; usages: Array<{ id: string; gift_card_id: string; gift_card_code: string; amount: number; balance_after: number; usage_type: string; note: string; created_at: string }>; credits: Array<{ id: string; customer_name: string; customer_email: string; credit_type: string; label: string; balance: number; active: boolean }> }> { return request('/api/storefront/gift-cards'); },
    async getStorefrontDiscountCodes(): Promise<{ codes: Array<{ id: string; code: string; discount_type: 'percent' | 'fixed'; discount_value: number; minimum_subtotal: number; starts_at: string | null; expires_at: string | null; usage_limit: number; usage_count: number; per_customer_limit: number; stack_with_mix: boolean; stack_with_gift_card: boolean; active: boolean; created_at: string }>; redemptions: Array<{ id: string; code: string; order_number: string; customer_email: string; amount: number; created_at: string }> }> { return request('/api/storefront/discount-codes'); },
    async createStorefrontDiscountCode(data: { code: string; discount_type: 'percent' | 'fixed'; discount_value: number; minimum_subtotal: number; starts_at?: string | null; expires_at?: string | null; usage_limit: number; per_customer_limit: number; stack_with_mix: boolean; stack_with_gift_card: boolean; active: boolean }) { return request('/api/storefront/discount-codes', { method: 'POST', body: JSON.stringify(data) }); },
    async updateStorefrontDiscountCode(id: string, data: { active?: boolean; expires_at?: string | null; usage_limit?: number; per_customer_limit?: number }) { return request(`/api/storefront/discount-codes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }); },
    async getStorefrontGallery(): Promise<Array<{ id: string; title: string; image_data: string; details: string; source_type: string; status: 'pending' | 'approved' | 'rejected'; customer_name: string; customer_email: string; created_at: string }>> { return request('/api/storefront/gallery'); },
    async moderateStorefrontGallery(id: string, status: 'approved' | 'rejected'): Promise<{ updated: true }> { return request(`/api/storefront/gallery/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); },
    async getStorefrontMembership(): Promise<{ program: { id: string; name: string; discount_percent: number; sample_product_id: string; active: boolean }; members: Array<{ id: string; customer_name: string; customer_email: string; status: 'active' | 'paused' | 'cancelled'; ends_at: string | null }>; samples: Array<{ id: string; name: string; quantity_in_stock: number }> }> { return request('/api/storefront/membership'); },
    async updateStorefrontMembershipProgram(data: { name: string; discount_percent: number; sample_product_id: string; active: boolean }) { return request('/api/storefront/membership/program', { method: 'PUT', body: JSON.stringify(data) }); },
    async enrollStorefrontMember(data: { customer_email: string; ends_at?: string | null }) { return request('/api/storefront/membership/members', { method: 'POST', body: JSON.stringify(data) }); },
    async updateStorefrontMember(id: string, status: 'active' | 'paused' | 'cancelled') { return request(`/api/storefront/membership/members/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); },
    async getStorefrontSubscriptionPlans() { return request<Array<{ id: string; name: string; plan_type: 'one_candle' | 'two_candle' | 'discovery' | 'seasonal' | 'candle_of_month'; description: string; candle_count: number; monthly_price: number; quarterly_price: number; active: boolean }>>('/api/storefront/subscriptions/plans'); },
    async createStorefrontSubscriptionPlan(data: { name: string; plan_type: 'one_candle' | 'two_candle' | 'discovery' | 'seasonal' | 'candle_of_month'; description: string; candle_count: number; monthly_price: number; quarterly_price: number; monthly_delivery_day?: number; quarterly_start_month?: number; active: boolean }) { return request('/api/storefront/subscriptions/plans', { method: 'POST', body: JSON.stringify(data) }); },
    async updateStorefrontSubscriptionPlan(id: string, active: boolean) { return request(`/api/storefront/subscriptions/plans/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ active }) }); },
    async getStorefrontSubscriptionFulfillment() { return request<Array<{ id: string; shipment_due_at: string; status: string; payment_status: string; staff_note: string; subscription_status: string; plan_name: string; customer_name: string; customer_email: string }>>('/api/storefront/subscriptions/fulfillment'); },
    async updateStorefrontSubscriptionFulfillment(id: string, data: { status: 'pending' | 'in_production' | 'ready' | 'shipped' | 'cancelled'; staff_note?: string }) { return request(`/api/storefront/subscriptions/fulfillment/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }); },
    async getStorefrontReviews(): Promise<Array<{ id: string; product_name: string; customer_name: string; rating: number; title: string; body: string; status: string; verified_purchase: boolean }>> { return request('/api/storefront/reviews'); },
    async moderateStorefrontReview(id: string, status: 'approved' | 'rejected'): Promise<{ updated: true }> { return request(`/api/storefront/reviews/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); },
    async awardStorefrontReward(data: { customer_email: string; points: number; source: 'referral' | 'birthday' | 'subscription' | 'goodwill'; note: string }): Promise<{ awarded: true }> { return request('/api/storefront/rewards', { method: 'POST', body: JSON.stringify(data) }); },
    async issueStorefrontGiftCard(data: { customer_email: string; amount: number; code?: string; note?: string }) { return request('/api/storefront/gift-cards', { method: 'POST', body: JSON.stringify(data) }); },
    async adjustStorefrontGiftCard(id: string, data: { amount: number; note: string; active?: boolean }) { return request(`/api/storefront/gift-cards/${encodeURIComponent(id)}/adjust`, { method: 'POST', body: JSON.stringify(data) }); },
    async addStorefrontCustomerCredit(data: { customer_email: string; amount: number; credit_type: 'free_gift' | 'giveaway_balance'; label: string }) { return request('/api/storefront/gift-cards/credits', { method: 'POST', body: JSON.stringify(data) }); },
    async deleteStorefrontOrder(orderId: string): Promise<{ deleted: true }> {
      return request(`/api/storefront/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' });
    },

    async updateStorefrontOrder(id: string, data: {
      status?: string;
      fulfillment_status?: string;
      payment_status?: string;
      tracking_number?: string;
      staff_note?: string;
    }): Promise<StorefrontOrderRecord> {
      return request(`/api/storefront/orders/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async refundStorefrontOrder(id: string): Promise<StorefrontOrderRecord & { refund_pending?: boolean }> {
      return request(`/api/storefront/orders/${encodeURIComponent(id)}/refund`, { method: 'POST' });
    },

    async getTeamContactMessages(params?: {
      bucket?: 'new' | 'old';
      status?:
        | 'new'
        | 'custom_request'
        | 'in_progress'
        | 'awaiting_payment'
        | 'order_shipped'
        | 'completed'
        | 'closed';
    }): Promise<StoreContactMessageRecord[]> {
      const search = new URLSearchParams();
      if (params?.bucket) search.set('bucket', params.bucket);
      if (params?.status) search.set('status', params.status);
      const suffix = search.toString();
      return request(`/api/teams/contact-messages${suffix ? `?${suffix}` : ''}`);
    },

    async getTeamContactMessageCounts(): Promise<StoreContactMessageStatusCounts> {
      return request('/api/teams/contact-messages/counts');
    },

    async deleteTeamContactMessage(id: string): Promise<void> {
      await request(`/api/teams/contact-messages/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },

    async setTeamContactMessageRead(id: string, is_read: boolean): Promise<void> {
      await request(`/api/teams/contact-messages/${encodeURIComponent(id)}/read`, {
        method: 'PUT',
        body: JSON.stringify({ is_read }),
      });
    },

    async updateTeamContactMessageWorkflow(
      id: string,
      workflow_status:
        | 'new'
        | 'custom_request'
        | 'in_progress'
        | 'awaiting_payment'
        | 'order_shipped'
        | 'completed'
        | 'closed',
      priority_level: 'none' | 'low' | 'normal' | 'high' | 'urgent',
      admin_notes: string
    ): Promise<void> {
      await request(`/api/teams/contact-messages/${encodeURIComponent(id)}/workflow`, {
        method: 'PUT',
        body: JSON.stringify({ workflow_status, priority_level, admin_notes }),
      });
    },

    async banTeamContactMessageIp(
      id: string,
      reason?: string
    ): Promise<{ ok: true; ip_address: string }> {
      return request(`/api/teams/contact-messages/${encodeURIComponent(id)}/ban-ip`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || '' }),
      });
    },

    async uploadStorefrontImage(dataUrl: string): Promise<string> {
      const payload = await request<{ url: string }>('/api/storefront/upload-image', {
        method: 'POST',
        body: JSON.stringify({ data_url: dataUrl }),
      });
      return payload.url;
    },

    async uploadStorefrontFont(
      dataUrl: string,
      fileName: string
    ): Promise<{ url: string; family: string; original_name: string }> {
      return request('/api/storefront/upload-font', {
        method: 'POST',
        body: JSON.stringify({ data_url: dataUrl, file_name: fileName }),
      });
    },
  };
}
