import {
  ACTIVE_TAB_STORAGE_KEY,
  CALCULATORS_TAB_STORAGE_KEY,
  DARK_THEME_STORAGE_KEY,
  DARK_THEMES,
  LIGHT_THEME_STORAGE_KEY,
  LIGHT_THEMES,
  SUPPLIES_TAB_STORAGE_KEY,
  TEAMS_TAB_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  VALID_TABS,
  type CalculatorsTab,
  type DarkTheme,
  type LightTheme,
  type SuppliesTab,
  type Tab,
  type TeamsTab,
  type ThemeMode,
} from './config';

function getLocalStorageItem(key: string) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getInitialActiveTab(): Tab {
  const savedTab = getLocalStorageItem(ACTIVE_TAB_STORAGE_KEY);
  if (savedTab === 'wax' || savedTab === 'wick' || savedTab === 'hotThrowTips') return 'calculators';
  if (savedTab === 'molds') return 'supplies';
  if (savedTab === 'access' || savedTab === 'employees' || savedTab === 'roles' || savedTab === 'contacts') {
    return 'teams';
  }
  if (savedTab && VALID_TABS.includes(savedTab as Tab)) {
    return savedTab as Tab;
  }
  return 'products';
}

export function getInitialCalculatorsTab(): CalculatorsTab {
  const saved = getLocalStorageItem(CALCULATORS_TAB_STORAGE_KEY);
  if (saved === 'wax' || saved === 'wick' || saved === 'hotThrowTips') return saved;
  const legacyMainTab = getLocalStorageItem(ACTIVE_TAB_STORAGE_KEY);
  if (legacyMainTab === 'wick') return 'wick';
  if (legacyMainTab === 'hotThrowTips') return 'hotThrowTips';
  return 'wax';
}

export function getInitialSuppliesTab(): SuppliesTab {
  const saved = getLocalStorageItem(SUPPLIES_TAB_STORAGE_KEY);
  if (saved === 'supplies' || saved === 'molds' || saved === 'waxPlanner') return saved;
  const legacyMainTab = getLocalStorageItem(ACTIVE_TAB_STORAGE_KEY);
  return legacyMainTab === 'molds' ? 'molds' : 'supplies';
}

export function getInitialTeamsTab(): TeamsTab {
  const saved = getLocalStorageItem(TEAMS_TAB_STORAGE_KEY);
  if (saved === 'access' || saved === 'employees' || saved === 'roles' || saved === 'contacts' || saved === 'orders' || saved === 'giftCards' || saved === 'reviews' || saved === 'rewards') return saved;
  const legacyMainTab = getLocalStorageItem(ACTIVE_TAB_STORAGE_KEY);
  return legacyMainTab === 'employees' ? 'employees' : 'access';
}

export function getInitialThemeMode(): ThemeMode {
  const saved = getLocalStorageItem(THEME_MODE_STORAGE_KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

export function getInitialLightTheme(): LightTheme {
  const saved = getLocalStorageItem(LIGHT_THEME_STORAGE_KEY);
  return LIGHT_THEMES.includes(saved as LightTheme) ? (saved as LightTheme) : 'classic';
}

export function getInitialDarkTheme(): DarkTheme {
  const saved = getLocalStorageItem(DARK_THEME_STORAGE_KEY);
  return DARK_THEMES.includes(saved as DarkTheme) ? (saved as DarkTheme) : 'midnight';
}
