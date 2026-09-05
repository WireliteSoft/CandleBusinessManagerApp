import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { localDb, type MoldRecord } from '../lib/localDb';

const GRAMS_PER_OUNCE = 28.3495;

function readFileAsDataUrl(file: File): Promise<string> {
  if (file.size > 1_500_000) {
    return Promise.reject(new Error('Images must be 1.5 MB or smaller on the free Cloudflare plan.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}

type MoldForm = {
  name: string;
  weight_oz: string;
  image_data: string;
};

const INITIAL_FORM: MoldForm = {
  name: '',
  weight_oz: '',
  image_data: '',
};

type Props = {
  readOnly?: boolean;
};
type MoldView = 'cards' | 'list';

export default function MoldsLibrary({ readOnly = false }: Props) {
  const [molds, setMolds] = useState<MoldRecord[]>([]);
  const [form, setForm] = useState<MoldForm>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [moldView, setMoldView] = useState<MoldView>('cards');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await localDb.getMolds();
        if (!cancelled) setMolds(rows);
      } catch (error) {
        console.error('Failed to load molds:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onImageFileChange(file: File | null) {
    if (readOnly) return;
    if (!file) return;
    try {
      const imageData = await readFileAsDataUrl(file);
      setForm((prev) => ({ ...prev, image_data: imageData }));
    } catch (error) {
      console.error('Could not read mold image:', error);
    }
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
  }

  function openAddModal() {
    if (readOnly) return;
    resetForm();
    setIsFormModalOpen(true);
  }

  function closeFormModal() {
    setIsFormModalOpen(false);
    resetForm();
  }

  async function saveMold(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    const name = form.name.trim();
    const weight = Number(form.weight_oz);
    if (!name || !Number.isFinite(weight) || weight <= 0) return;

    setSaving(true);
    try {
      if (editingId) {
        const updated = await localDb.updateMold(editingId, {
          name,
          weight_oz: weight,
          image_data: form.image_data || '',
        });
        setMolds((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await localDb.createMold({
          name,
          weight_oz: weight,
          image_data: form.image_data || '',
        });
        setMolds((prev) => [created, ...prev]);
      }
      resetForm();
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Failed to save mold:', error);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(mold: MoldRecord) {
    if (readOnly) return;
    setEditingId(mold.id);
    setForm({
      name: mold.name,
      weight_oz: String(mold.weight_oz),
      image_data: mold.image_data || '',
    });
    setIsFormModalOpen(true);
  }

  async function deleteMold(id: string) {
    if (readOnly) return;
    if (!window.confirm('Delete this mold?')) return;
    const previous = molds;
    setMolds((prev) => prev.filter((item) => item.id !== id));
    try {
      await localDb.deleteMold(id);
      if (editingId === id) resetForm();
    } catch (error) {
      console.error('Failed to delete mold:', error);
      setMolds(previous);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-cyan-600" />
          <h2 className="text-2xl font-bold text-gray-800">Candle Molds</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setMoldView('list')}
              className={`px-3 py-2 text-sm ${
                moldView === 'list'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setMoldView('cards')}
              className={`px-3 py-2 text-sm border-l border-gray-300 ${
                moldView === 'cards'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cards
            </button>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              Add New Mold
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Saved Mold Weights</h3>
        {loading ? (
          <p className="text-sm text-gray-500">Loading molds...</p>
        ) : molds.length === 0 ? (
          <p className="text-sm text-gray-500">No molds saved yet.</p>
        ) : moldView === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {molds.map((mold) => (
              <div key={mold.id} className="rounded-lg border border-gray-200 p-4">
                <div className="aspect-square rounded border border-gray-200 overflow-hidden bg-gray-50 mb-3">
                  {mold.image_data ? (
                    <img src={mold.image_data} alt={mold.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                      No image
                    </div>
                  )}
                </div>
                <p className="font-semibold text-gray-800">{mold.name}</p>
                <p className="text-xs text-gray-500 mt-1">Target wax weight to fill this mold</p>
                <p className="text-sm text-gray-700 mt-1">
                  {mold.weight_oz.toFixed(2)} oz ({(mold.weight_oz * GRAMS_PER_OUNCE).toFixed(1)} g)
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => startEdit(mold)}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => void deleteMold(mold.id)}
                    className="px-3 py-1.5 text-sm rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600">
              <div className="col-span-6 md:col-span-5">Mold</div>
              <div className="col-span-3 md:col-span-3 text-right">Weight (oz)</div>
              <div className="col-span-3 md:col-span-2 text-right">Weight (g)</div>
              <div className="hidden md:block md:col-span-2 text-right">Actions</div>
            </div>
            {molds.map((mold) => (
              <div
                key={mold.id}
                className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center"
              >
                <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {mold.image_data ? (
                      <img src={mold.image_data} alt={mold.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{mold.name}</p>
                    <p className="text-xs text-gray-500 truncate">Target wax weight to fill this mold</p>
                  </div>
                </div>
                <div className="col-span-3 md:col-span-3 text-right text-sm text-gray-700">
                  {mold.weight_oz.toFixed(2)}
                </div>
                <div className="col-span-3 md:col-span-2 text-right text-sm text-gray-700">
                  {(mold.weight_oz * GRAMS_PER_OUNCE).toFixed(1)}
                </div>
                <div className="col-span-12 md:col-span-2 flex md:justify-end gap-2">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => startEdit(mold)}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => void deleteMold(mold.id)}
                    className="px-3 py-1.5 text-sm rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingId ? 'Edit Mold' : 'Add New Mold'}
              </h3>
              <button
                type="button"
                onClick={closeFormModal}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={saveMold} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mold Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  disabled={readOnly}
                  placeholder="Ex: Rose Pillar Mold"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Wax Weight (oz)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.weight_oz}
                  onChange={(e) => setForm((prev) => ({ ...prev, weight_oz: e.target.value }))}
                  disabled={readOnly}
                  placeholder="Ex: 5.25"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
                {form.weight_oz && Number.isFinite(Number(form.weight_oz)) && Number(form.weight_oz) > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {(Number(form.weight_oz) * GRAMS_PER_OUNCE).toFixed(1)} g
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mold Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    void onImageFileChange(e.target.files?.[0] || null);
                  }}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <div className="md:col-span-3 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving || readOnly}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-70"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Mold' : 'Save Mold'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeFormModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>

            {form.image_data && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Image Preview</p>
                <img
                  src={form.image_data}
                  alt="Mold preview"
                  className="w-40 h-40 object-cover rounded border border-gray-200"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
