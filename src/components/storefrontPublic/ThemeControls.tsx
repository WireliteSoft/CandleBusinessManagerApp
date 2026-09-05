import type { DarkTheme, LightTheme, ThemeMode } from './helpers';
import { DARK_THEMES, LIGHT_THEMES } from './helpers';

type Props = {
  darkTheme: DarkTheme;
  lightTheme: LightTheme;
  setDarkTheme: React.Dispatch<React.SetStateAction<DarkTheme>>;
  setLightTheme: React.Dispatch<React.SetStateAction<LightTheme>>;
  setThemeMode: React.Dispatch<React.SetStateAction<ThemeMode>>;
  themeMode: ThemeMode;
};

export default function ThemeControls({
  darkTheme,
  lightTheme,
  setDarkTheme,
  setLightTheme,
  setThemeMode,
  themeMode,
}: Props) {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
        <button
          type="button"
          onClick={() => setThemeMode('light')}
          className={`px-3 py-2 text-sm font-medium ${
            themeMode === 'light'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Light
        </button>
        <button
          type="button"
          onClick={() => setThemeMode('dark')}
          className={`px-3 py-2 text-sm font-medium border-l border-gray-300 ${
            themeMode === 'dark'
              ? 'bg-slate-800 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Dark
        </button>
      </div>
      <select
        value={themeMode === 'light' ? lightTheme : darkTheme}
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
  );
}
