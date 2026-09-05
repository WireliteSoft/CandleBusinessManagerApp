export const SUPERADMIN_TOKEN_STORAGE_KEY = 'candles.superadminToken.v1';
export const CUSTOM_REASON_VALUE = '__custom_reason__';

export type AccountRow = {
  id: string;
  name: string;
  plan_tier: 'free' | 'standard' | 'pro' | 'elite';
  is_banned: boolean;
  ban_reason?: string;
  access_disabled: boolean;
  disable_reason?: string;
  active_appeal_count?: number;
  created_at: string;
};

export type BillingConfigRow = {
  id: string;
  standard_monthly_usd: number;
  standard_yearly_usd: number;
  pro_monthly_usd: number;
  pro_yearly_usd: number;
  elite_monthly_usd: number;
  elite_yearly_usd: number;
  currency: string;
  updated_at?: string;
};

export type AccountUserIpRow = {
  email: string;
  username: string;
  ip_address: string;
};

export type AppealTicketRow = {
  id: string;
  account_id?: string | null;
  account_identifier: string;
  email: string;
  name: string;
  reason: string;
  details: string;
  ban_reason?: string;
  ban_evidence_note?: string;
  ban_evidence_image_data?: string;
  ban_evidence_images_data?: string[];
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  created_at: string;
  updated_at: string;
};

export type AppealMessageRow = {
  id: string;
  sender_type: 'user' | 'admin';
  sender_name: string;
  message: string;
  created_at: string;
};

export type AppealHistoryRow = {
  id: string;
  ticket_id: string;
  ban_reason: string;
  appeal_status: 'resolved' | 'rejected';
  completed_at: string;
  account_identifier: string;
  name: string;
  appeal_reason: string;
  appeal_details: string;
};

export type DbTableRowsPayload = {
  source: 'master' | 'account';
  account_id: string | null;
  table: string;
  columns: string[];
  pk_columns: string[];
  rows: Array<Record<string, unknown>>;
  limit: number;
  offset: number;
};

export const BLOCK_REASONS = [
  'Terms policy violation',
  'Suspicious activity',
  'Billing/payment issue',
] as const;

export type BlockReason = (typeof BLOCK_REASONS)[number];

export type ReasonModalState = {
  open: boolean;
  accountId: string;
  action: 'ban' | 'disable';
  reason: BlockReason | typeof CUSTOM_REASON_VALUE;
  customReason: string;
  evidenceNote: string;
  evidenceImagesData: string[];
};
