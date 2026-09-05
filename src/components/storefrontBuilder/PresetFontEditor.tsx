import type { SavedColor, TextStyleConfig } from './presetBuilder';

type FontOption = {
  label: string;
  value: string;
};

type Props = {
  colorFallback: string;
  fieldKey: string;
  fontOptions: FontOption[];
  readOnly: boolean;
  savedColors: SavedColor[];
  style: TextStyleConfig;
  onResetColor: (fieldKey: string) => void;
  onSaveColor: (colorValue: string) => void;
  onStyleChange: (fieldKey: string, patch: Partial<TextStyleConfig>) => void;
};

export default function PresetFontEditor({
  colorFallback,
  fieldKey,
  fontOptions,
  readOnly,
  savedColors,
  style,
  onResetColor,
  onSaveColor,
  onStyleChange,
}: Props) {
  return (
    <details className="mt-2 rounded border border-gray-200 bg-gray-50 p-2">
      <summary className="text-xs font-semibold text-gray-600 cursor-pointer">Font Editor</summary>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
        <select
          value={style.fontFamily || ''}
          disabled={readOnly}
          onChange={(e) => onStyleChange(fieldKey, { fontFamily: e.target.value })}
          className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-xs"
        >
          {fontOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          value={style.fontSize || ''}
          disabled={readOnly}
          onChange={(e) => onStyleChange(fieldKey, { fontSize: e.target.value })}
          className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-xs"
          placeholder="Font size (e.g. 22px)"
        />
        <div className="flex items-center gap-2 rounded border border-gray-300 bg-white px-2 py-1.5">
          <label className="text-xs text-gray-600">Color</label>
          <input
            type="color"
            value={style.color || colorFallback}
            disabled={readOnly}
            onChange={(e) => onStyleChange(fieldKey, { color: e.target.value })}
            className="h-6 w-8 border border-gray-300 rounded"
          />
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onResetColor(fieldKey)}
            className="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-60"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onSaveColor(style.color || colorFallback)}
            className="text-[11px] px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
          >
            Save Color
          </button>
        </div>
        <label className="flex items-center gap-2 rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={String(style.fontWeight || '') === '700'}
            disabled={readOnly}
            onChange={(e) =>
              onStyleChange(fieldKey, { fontWeight: e.target.checked ? '700' : '400' })
            }
            className="h-4 w-4"
          />
          Bold
        </label>
        <label className="flex items-center gap-2 rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={String(style.fontStyle || '') === 'italic'}
            disabled={readOnly}
            onChange={(e) =>
              onStyleChange(fieldKey, { fontStyle: e.target.checked ? 'italic' : 'normal' })
            }
            className="h-4 w-4"
          />
          Italic
        </label>
      </div>
      {savedColors.length > 0 ? (
        <div className="mt-2 rounded border border-gray-200 bg-white p-2">
          <p className="text-[11px] font-semibold text-gray-600 mb-2">Saved Colors</p>
          <div className="flex flex-wrap gap-2">
            {savedColors.map((item) => (
              <button
                key={item.id || item.value}
                type="button"
                disabled={readOnly}
                onClick={() => onStyleChange(fieldKey, { color: item.value })}
                title={`Apply ${item.value}`}
                className="h-7 w-7 rounded border border-gray-300"
                style={{ backgroundColor: item.value }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </details>
  );
}
