import { Flame } from 'lucide-react';
import type { AuthUser } from '../../lib/localDb';
import { DARK_THEMES, LIGHT_THEMES, type BillingTier, type DarkTheme, type LightTheme, type ThemeMode } from '../config';

type Props = {
  activeThemeName: DarkTheme | LightTheme;
  currentTier: BillingTier;
  me: AuthUser;
  onLogout: () => void;
  onOpenPlans: () => void;
  setDarkTheme: (theme: DarkTheme) => void;
  setLightTheme: (theme: LightTheme) => void;
  setThemeMode: (mode: ThemeMode) => void;
  themeMode: ThemeMode;
};

export default function AppHeader({
  activeThemeName,
  currentTier,
  me,
  onLogout,
  onOpenPlans,
  setDarkTheme,
  setLightTheme,
  setThemeMode,
  themeMode,
}: Props) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Flame className="w-8 h-8 text-amber-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Candle Business Manager</h1>
              <p className="text-gray-600 text-sm mt-1">Manage inventory, supplies, recipes, and more</p>
              <p className="text-xs text-gray-500 mt-1">
                Account: {me.account_name} | User: {me.username} ({me.role})
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Plan: <strong>{currentTier}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPlans}
              className="px-3 py-2 border border-indigo-300 rounded-lg text-sm text-indigo-700 hover:bg-indigo-50"
            >
              Plans
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Log Out
            </button>
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`px-3 py-2 text-sm font-medium ${
                  themeMode === 'light' ? 'bg-amber-100 text-amber-800' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`px-3 py-2 text-sm font-medium border-l border-gray-300 ${
                  themeMode === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Dark
              </button>
            </div>
            <select
              value={activeThemeName}
              onChange={(e) => {
                if (themeMode === 'light') {
                  setLightTheme(e.target.value as LightTheme);
                } else {
                  setDarkTheme(e.target.value as DarkTheme);
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-800"
            >
              {(themeMode === 'light' ? LIGHT_THEMES : DARK_THEMES).map((themeName) => (
                <option key={themeName} value={themeName}>
                  {themeName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
