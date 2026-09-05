export type Tab =
  | 'account'
  | 'products'
  | 'supplies'
  | 'recipes'
  | 'calculators'
  | 'batches'
  | 'teams'
  | 'storefront';

export type CalculatorsTab = 'wax' | 'wick' | 'hotThrowTips';
export type SuppliesTab = 'supplies' | 'scentProfiles' | 'molds' | 'waxPlanner';
export type TeamsTab = 'access' | 'employees' | 'roles' | 'contacts' | 'orders' | 'giftCards' | 'reviews' | 'rewards';
export type ThemeMode = 'light' | 'dark';
export type LightTheme = 'classic' | 'sunset' | 'mint';
export type DarkTheme = 'midnight' | 'forest' | 'ember';
export type BillingTier = 'free' | 'standard' | 'pro' | 'elite';

export const ACTIVE_TAB_STORAGE_KEY = 'candles.activeTab.v1';
export const CALCULATORS_TAB_STORAGE_KEY = 'candles.calculatorsTab.v1';
export const SUPPLIES_TAB_STORAGE_KEY = 'candles.suppliesTab.v1';
export const TEAMS_TAB_STORAGE_KEY = 'candles.teamsTab.v1';
export const THEME_MODE_STORAGE_KEY = 'candles.themeMode.v1';
export const LIGHT_THEME_STORAGE_KEY = 'candles.lightTheme.v1';
export const DARK_THEME_STORAGE_KEY = 'candles.darkTheme.v1';

export const VALID_TABS: Tab[] = [
  'account',
  'products',
  'supplies',
  'recipes',
  'calculators',
  'batches',
  'teams',
  'storefront',
];

export const LIGHT_THEMES: LightTheme[] = ['classic', 'sunset', 'mint'];
export const DARK_THEMES: DarkTheme[] = ['midnight', 'forest', 'ember'];

export const TIER_RANK: Record<BillingTier, number> = {
  free: 0,
  standard: 1,
  pro: 2,
  elite: 3,
};

export const TAB_MIN_TIER: Record<Tab, BillingTier> = {
  account: 'free',
  products: 'free',
  supplies: 'free',
  recipes: 'standard',
  calculators: 'standard',
  batches: 'pro',
  teams: 'elite',
  storefront: 'elite',
};
