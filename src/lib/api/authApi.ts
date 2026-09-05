import { request } from '../localDbCore';
import type {
  AccountBillingProfile,
  AccountUserRecord,
  AccountUsageSummary,
  AuthUser,
  BanAppealInput,
  BanAppealMessage,
  BanAppealTicket,
  BillingPurchaseHistoryRecord,
  BillingPlansResponse,
  BillingTierQuote,
  JoinRequestRecord,
  RolePermissions,
  TeamRoleRecord,
} from '../localDbTypes';

type BillingCheckoutMethod = 'free' | 'card' | 'apple_pay' | 'google_pay' | 'paypal';
type BillingTermsAcceptance = {
  billing_terms_version: string;
  billing_terms_accepted_at: string;
};

export function createAuthApi() {
  return {
    async getAuthBootstrapStatus(): Promise<{ has_accounts: boolean }> {
      return request('/api/auth/bootstrap-status');
    },

    async registerAccount(data: {
      name: string;
      email: string;
      password: string;
      password_confirm: string;
    }): Promise<{ token: string; user: AuthUser }> {
      return request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async login(data: {
      identifier: string;
      password: string;
    }): Promise<{ token: string; user: AuthUser }> {
      return request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async logout(): Promise<void> {
      await request('/api/auth/logout', { method: 'POST' });
    },

    async getAuthMe(): Promise<AuthUser> {
      return request('/api/auth/me');
    },

    async getBillingPlans(): Promise<BillingPlansResponse> {
      return request('/api/billing/plans');
    },

    async getAccountBillingProfile(): Promise<AccountBillingProfile> {
      return request('/api/account/billing-profile');
    },

    async updateAccountBillingProfile(data: Omit<AccountBillingProfile, 'account_id' | 'created_at' | 'updated_at'>): Promise<AccountBillingProfile> {
      return request('/api/account/billing-profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async getAccountPurchaseHistory(): Promise<BillingPurchaseHistoryRecord[]> {
      return request('/api/account/purchase-history');
    },

    async getAccountUsageSummary(): Promise<AccountUsageSummary> {
      return request('/api/account/usage-summary');
    },

    async selectBillingTier(
      tier: 'free' | 'standard' | 'pro' | 'elite'
    ): Promise<{ ok: true; plan_tier: 'free' | 'standard' | 'pro' | 'elite' }> {
      return request('/api/billing/select-tier', {
        method: 'POST',
        body: JSON.stringify({ tier }),
      });
    },

    async createBillingCheckout(
      tier: 'free' | 'standard' | 'pro' | 'elite',
      billing_cycle: 'monthly' | 'yearly',
      payment_method: BillingCheckoutMethod,
      source_id?: string,
      billingTerms?: BillingTermsAcceptance
    ): Promise<{
      provider: 'square' | 'paypal' | 'internal';
      url: string;
      session_id: string;
      quote: BillingTierQuote;
      plan_tier: 'free' | 'standard' | 'pro' | 'elite' | null;
    }> {
      return request('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          tier,
          billing_cycle,
          payment_method,
          source_id,
          billing_terms_version: billingTerms?.billing_terms_version,
          billing_terms_accepted_at: billingTerms?.billing_terms_accepted_at,
        }),
      });
    },

    async createBillingPayPalOrder(
      tier: 'free' | 'standard' | 'pro' | 'elite',
      billing_cycle: 'monthly' | 'yearly',
      billingTerms: BillingTermsAcceptance
    ): Promise<{ order_id: string }> {
      return request('/api/billing/paypal/create-order', {
        method: 'POST',
        body: JSON.stringify({
          tier,
          billing_cycle,
          billing_terms_version: billingTerms.billing_terms_version,
          billing_terms_accepted_at: billingTerms.billing_terms_accepted_at,
        }),
      });
    },

    async captureBillingPayPalOrder(orderId: string): Promise<{
      paid: boolean;
      plan_tier: 'free' | 'standard' | 'pro' | 'elite' | null;
      status: string | null;
    }> {
      return request('/api/billing/paypal/capture-order', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId }),
      });
    },

    async getBillingCheckoutStatus(
      sessionId: string
    ): Promise<{
      paid: boolean;
      plan_tier: 'free' | 'standard' | 'pro' | 'elite' | null;
      payment_status: string;
      status: string | null;
      target_tier: 'free' | 'standard' | 'pro' | 'elite' | null;
    }> {
      return request(`/api/billing/checkout-session-status?session_id=${encodeURIComponent(sessionId)}`);
    },

    async requestTeamAccess(data: {
      account_name: string;
      join_code: string;
      name: string;
      email: string;
      password: string;
      password_confirm: string;
    }): Promise<{ ok: true; message: string }> {
      return request('/api/auth/request-access', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async submitBanAppeal(
      data: BanAppealInput
    ): Promise<{ ok: true; ticket_id: string; access_key: string }> {
      return request('/api/appeals', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async getOpenAppealByIdentifier(identifier: string): Promise<{
      exists: boolean;
      ticket_id?: string;
      access_key?: string;
      status?: 'open' | 'in_review' | 'resolved' | 'rejected';
    }> {
      return request(`/api/appeals/open?identifier=${encodeURIComponent(identifier)}`);
    },

    async getAppealChat(
      ticketId: string,
      accessKey: string
    ): Promise<{ ticket: BanAppealTicket; messages: BanAppealMessage[] }> {
      return request(`/api/appeals/${ticketId}?key=${encodeURIComponent(accessKey)}`);
    },

    async sendAppealMessage(ticketId: string, accessKey: string, message: string): Promise<void> {
      await request(`/api/appeals/${ticketId}/messages?key=${encodeURIComponent(accessKey)}`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    },

    async claimAppealAutoLogin(
      ticketId: string,
      accessKey: string
    ): Promise<{ token: string; user: AuthUser }> {
      return request(`/api/appeals/${ticketId}/auto-login?key=${encodeURIComponent(accessKey)}`, {
        method: 'POST',
      });
    },

    async getAccountUsers(): Promise<AccountUserRecord[]> {
      return request('/api/auth/users');
    },

    async createAccountUser(data: {
      name: string;
      email: string;
      password: string;
      role?: string;
    }): Promise<AccountUserRecord> {
      return request('/api/auth/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async deleteAccountUser(id: string): Promise<void> {
      await request(`/api/auth/users/${id}`, { method: 'DELETE' });
    },

    async getJoinRequests(): Promise<JoinRequestRecord[]> {
      return request('/api/auth/join-requests');
    },

    async approveJoinRequest(id: string): Promise<void> {
      await request(`/api/auth/join-requests/${id}/approve`, { method: 'POST' });
    },

    async rejectJoinRequest(id: string): Promise<void> {
      await request(`/api/auth/join-requests/${id}/reject`, { method: 'POST' });
    },

    async getRolePermissions(): Promise<{ role: string; permissions: RolePermissions }> {
      return request('/api/auth/permissions');
    },

    async getTeamRoles(): Promise<TeamRoleRecord[]> {
      return request('/api/auth/roles');
    },

    async createTeamRole(name: string): Promise<{ name: string }> {
      return request('/api/auth/roles', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    },

    async updateTeamRolePermissions(roleName: string, permissions: RolePermissions): Promise<void> {
      await request(`/api/auth/roles/${encodeURIComponent(roleName)}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      });
    },

    async deleteTeamRole(roleName: string): Promise<void> {
      await request(`/api/auth/roles/${encodeURIComponent(roleName)}`, {
        method: 'DELETE',
      });
    },

    async regenerateJoinCode(): Promise<{ join_code: string }> {
      return request('/api/auth/join-code/regenerate', { method: 'POST' });
    },
  };
}
