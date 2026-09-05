import { useEffect, useRef, useState } from 'react';
import { FileUp, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { localDb } from '../lib/localDb';
import type { ScentProfileInput, ScentProfileRecord } from '../lib/models';

type Props = { readOnly?: boolean };

const EMPTY: ScentProfileInput = {
  supplier: '', supplier_sku: '', name: '', scent_family: '', top_notes: '', middle_notes: '', base_notes: '',
  flashpoint_f: null, vanillin_content: '', phthalate_free: false, prop65_warning: false, soy_performance: '',
  recommended_load: '', usage_notes: '', source_url: '', source_attribution: '',
};

const CSV_HEADERS = ['supplier', 'supplier_sku', 'name', 'scent_family', 'top_notes', 'middle_notes', 'base_notes', 'flashpoint_f', 'vanillin_content', 'phthalate_free', 'prop65_warning', 'soy_performance', 'recommended_load', 'usage_notes', 'source_url', 'source_attribution'];

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = []; let field = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field.trim()); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = '';
    } else field += char;
  }
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  if (!rows.length) return [];
  const headers = rows.shift()!.map((header) => header.trim().toLowerCase());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function toBoolean(value: string) { return ['true', 'yes', '1', 'y'].includes(value.trim().toLowerCase()); }

export default function ScentProfiles({ readOnly = false }: Props) {
  const [profiles, setProfiles] = useState<ScentProfileRecord[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<ScentProfileInput>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProfiles = async () => { try { setProfiles(await localDb.getScentProfiles()); } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to load scent profiles.'); } };
  useEffect(() => { void loadProfiles(); }, []);
  const filtered = profiles.filter((profile) => `${profile.name} ${profile.supplier} ${profile.scent_family} ${profile.top_notes} ${profile.middle_notes} ${profile.base_notes}`.toLowerCase().includes(search.toLowerCase()));
  const update = <K extends keyof ScentProfileInput>(key: K, value: ScentProfileInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const close = () => { setOpen(false); setEditingId(null); setForm(EMPTY); };
  const edit = (profile: ScentProfileRecord) => { setEditingId(profile.id); setForm({ supplier: profile.supplier, supplier_sku: profile.supplier_sku, name: profile.name, scent_family: profile.scent_family, top_notes: profile.top_notes, middle_notes: profile.middle_notes, base_notes: profile.base_notes, flashpoint_f: profile.flashpoint_f, vanillin_content: profile.vanillin_content, phthalate_free: profile.phthalate_free, prop65_warning: profile.prop65_warning, soy_performance: profile.soy_performance, recommended_load: profile.recommended_load, usage_notes: profile.usage_notes, source_url: profile.source_url, source_attribution: profile.source_attribution }); setOpen(true); };

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (readOnly) return;
    try { if (editingId) await localDb.updateScentProfile(editingId, form); else await localDb.createScentProfile(form); await loadProfiles(); close(); setStatus('Scent profile saved.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to save scent profile.'); }
  }
  async function remove(id: string) {
    if (readOnly || !window.confirm('Delete this scent profile?')) return;
    try { await localDb.deleteScentProfile(id); await loadProfiles(); setStatus('Scent profile deleted.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to delete scent profile.'); }
  }
  async function importCsv(file: File) {
    if (readOnly) return;
    try {
      const rows = parseCsv(await file.text());
      const valid = rows.filter((row) => row.name?.trim());
      if (!valid.length) throw new Error('The CSV needs a name column and at least one profile.');
      await Promise.all(valid.map((row) => localDb.createScentProfile({
        ...EMPTY, ...Object.fromEntries(CSV_HEADERS.filter((key) => !['flashpoint_f', 'phthalate_free', 'prop65_warning'].includes(key)).map((key) => [key, row[key] || ''])),
        flashpoint_f: row.flashpoint_f?.trim() ? Number(row.flashpoint_f) : null,
        phthalate_free: toBoolean(row.phthalate_free || ''), prop65_warning: toBoolean(row.prop65_warning || ''),
      })));
      await loadProfiles(); setStatus(`Imported ${valid.length} scent profile${valid.length === 1 ? '' : 's'}.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to import CSV.'); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  }

  return <section className="app-theme rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); }} />
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold text-gray-800">Scent Profiles</h2><p className="mt-1 max-w-2xl text-sm text-gray-600">Store fragrance-oil notes and candle performance from data you own or are authorized to import. Supplier descriptions and images are not copied here.</p></div>{!readOnly && <div className="flex gap-2"><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><FileUp size={16} />Import CSV</button><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={16} />Add profile</button></div>}</div>
    <p className="mt-3 text-xs text-gray-500">CSV headers: {CSV_HEADERS.join(', ')}</p>
    {status && <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{status}</p>}
    <label className="relative mt-5 block max-w-lg"><Search size={17} className="absolute left-3 top-3 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, supplier, family, or notes" className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm" /></label>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((profile) => <article key={profile.id} className="rounded-xl border border-gray-200 p-4"><div className="flex justify-between gap-3"><div><h3 className="font-bold text-gray-900">{profile.name}</h3><p className="text-sm text-gray-500">{[profile.supplier, profile.supplier_sku].filter(Boolean).join(' | ') || 'No supplier recorded'}</p></div>{!readOnly && <div className="flex h-fit gap-1"><button type="button" onClick={() => edit(profile)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100" aria-label={`Edit ${profile.name}`}><Pencil size={16} /></button><button type="button" onClick={() => void remove(profile.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label={`Delete ${profile.name}`}><Trash2 size={16} /></button></div>}</div><p className="mt-3 text-sm font-medium text-blue-700">{profile.scent_family || 'Uncategorized'}</p><dl className="mt-3 space-y-1 text-sm text-gray-700"><div><dt className="inline font-semibold">Top: </dt><dd className="inline">{profile.top_notes || '-'}</dd></div><div><dt className="inline font-semibold">Middle: </dt><dd className="inline">{profile.middle_notes || '-'}</dd></div><div><dt className="inline font-semibold">Base: </dt><dd className="inline">{profile.base_notes || '-'}</dd></div></dl><div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-600"><p>Flashpoint: {profile.flashpoint_f == null ? '-' : `${profile.flashpoint_f} F`}</p><p>Vanillin: {profile.vanillin_content || '-'}</p><p>Soy performance: {profile.soy_performance || '-'}</p><p>{profile.phthalate_free ? 'Phthalate free' : 'Phthalate status not recorded'}{profile.prop65_warning ? ' | Prop 65 warning' : ''}</p></div></article>)}</div>
    {!filtered.length && <p className="py-10 text-center text-sm text-gray-500">No scent profiles found.</p>}
    {open && <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/50 p-4"><form onSubmit={save} className="app-theme mx-auto my-6 w-full max-w-3xl rounded-xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit scent profile' : 'Add scent profile'}</h2><p className="text-sm text-gray-500">Enter source data you are permitted to use.</p></div><button type="button" onClick={close} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Close</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{([['name', 'Fragrance name', true], ['supplier', 'Supplier'], ['supplier_sku', 'Supplier SKU'], ['scent_family', 'Scent family'], ['top_notes', 'Top notes'], ['middle_notes', 'Middle notes'], ['base_notes', 'Base notes'], ['vanillin_content', 'Vanillin content'], ['soy_performance', 'Soy performance'], ['recommended_load', 'Recommended load'], ['source_url', 'Source URL'], ['source_attribution', 'Source attribution']] as const).map(([key, label, required]) => <label key={key} className="text-sm font-medium text-gray-700">{label}<input required={required} value={form[key]} onChange={(event) => update(key, event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal" /></label>)}<label className="text-sm font-medium text-gray-700">Flashpoint (F)<input type="number" value={form.flashpoint_f ?? ''} onChange={(event) => update('flashpoint_f', event.target.value === '' ? null : Number(event.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal" /></label><div className="flex items-end gap-5 pb-2 text-sm text-gray-700"><label className="flex items-center gap-2"><input type="checkbox" checked={form.phthalate_free} onChange={(event) => update('phthalate_free', event.target.checked)} />Phthalate free</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.prop65_warning} onChange={(event) => update('prop65_warning', event.target.checked)} />Prop 65 warning</label></div></div><label className="mt-4 block text-sm font-medium text-gray-700">Usage and test notes<textarea value={form.usage_notes} onChange={(event) => update('usage_notes', event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={close} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">Cancel</button><button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save profile</button></div></form></div>}
  </section>;
}
