import type { FormEvent } from 'react';
import type { Product, ProductFormData } from './config';

const productMetadataOptions: Partial<Record<keyof ProductFormData, string[]>> = {
  scent_family: ['Fruity', 'Woody', 'Bakery', 'Floral', 'Citrus', 'Clean', 'Fresh', 'Gourmand', 'Spicy', 'Earthy', 'Masculine', 'Seasonal'],
  sweetness: ['Not sweet', 'Light', 'Balanced', 'Sweet', 'Very sweet'],
  scent_strength: ['Subtle', 'Light', 'Medium', 'Strong', 'Very strong'],
  warmth: ['Cool', 'Balanced', 'Warm', 'Very warm'],
  freshness: ['Low', 'Balanced', 'Fresh', 'Very fresh'],
  season: ['Spring', 'Summer', 'Fall', 'Winter', 'All season'],
  mood: ['Relax', 'Energize', 'Romantic', 'Cozy', 'Fresh', 'Focus', 'Sleep', 'Party'],
  room: ['Bedroom', 'Bathroom', 'Kitchen', 'Office', 'Patio', 'Living room'],
};

type Props = {
  editingProduct: Product | null;
  formData: ProductFormData;
  handleImageFile: (file: File | null) => Promise<void>;
  onClose: () => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  readOnly: boolean;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
};

export default function ProductFormModal({
  editingProduct,
  formData,
  handleImageFile,
  onClose,
  onSubmit,
  readOnly,
  setFormData,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[calc(100vh-2rem)] flex flex-col">
        <h3 className="text-xl font-bold mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
        <form
          className="min-h-0 flex flex-1 flex-col"
          onSubmit={(e) => {
            void onSubmit(e);
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
              <select value={formData.product_type} onChange={(e) => setFormData({ ...formData, product_type: e.target.value as Product['product_type'] })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                <option value="physical">Physical candle/product</option><option value="sample">Sample pack</option><option value="bundle">Bundle or collection</option><option value="custom">Custom-made product</option><option value="subscription">Subscription</option><option value="gift_card">Gift card</option><option value="service">Service or booking</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                rows={3}
              />
            </div>
            <fieldset className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 p-3"><legend className="px-1 text-sm font-semibold text-gray-700">Scent and production details</legend>{([['scent_family', 'Scent family'], ['fragrance_notes', 'Fragrance notes'], ['sweetness', 'Sweetness'], ['scent_strength', 'Scent strength'], ['warmth', 'Warmth'], ['freshness', 'Freshness'], ['season', 'Season'], ['mood', 'Mood'], ['room', 'Best room'], ['burn_time', 'Burn time'], ['wax_type', 'Wax type'], ['wick_type', 'Wick type'], ['batch_number', 'Batch number']] as const).map(([field, label]) => { const options = productMetadataOptions[field]; return <label key={field} className="text-xs font-medium text-gray-700">{label}{options ? <select value={formData[field]} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input value={formData[field]} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />}</label>; })}</fieldset>
            <fieldset className="rounded-lg border border-gray-200 p-3"><legend className="px-1 text-sm font-semibold text-gray-700">Behind the Candle</legend><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-gray-700">Inspiration<textarea value={formData.inspiration} onChange={(e) => setFormData({ ...formData, inspiration: e.target.value })} rows={4} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="What inspired this candle?" /></label><label className="text-xs font-medium text-gray-700">Making process<textarea value={formData.making_process} onChange={(e) => setFormData({ ...formData, making_process: e.target.value })} rows={4} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Share the pouring, curing, or testing story." /></label></div></fieldset>
            <fieldset className="rounded-lg border border-gray-200 p-3"><legend className="px-1 text-sm font-semibold text-gray-700">Limited Drop</legend><label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={formData.limited_drop} onChange={(e) => setFormData({ ...formData, limited_drop: e.target.checked })} />Mark this as a Limited Drop</label>{formData.limited_drop ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-gray-700">Drop or batch number<input value={formData.drop_number} onChange={(e) => setFormData({ ...formData, drop_number: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Example: Drop 01 / 100" /></label><label className="text-xs font-medium text-gray-700">Purchase limit per customer (optional)<input type="number" min="0" step="1" value={formData.purchase_limit} onChange={(e) => setFormData({ ...formData, purchase_limit: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="No limit" /></label></div> : null}</fieldset>
            <fieldset className="rounded-lg border border-gray-200 p-3"><legend className="px-1 text-sm font-semibold text-gray-700">Upcoming Release</legend><label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={formData.upcoming_release} onChange={(e) => setFormData({ ...formData, upcoming_release: e.target.checked, preorders_enabled: e.target.checked ? formData.preorders_enabled : false })} />Show as Coming Soon and collect waitlist signups</label>{formData.upcoming_release ? <div className="mt-3 space-y-3"><label className="block text-xs font-medium text-gray-700">Expected release date (optional)<input type="date" value={formData.release_date} onChange={(e) => setFormData({ ...formData, release_date: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label><label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={formData.preorders_enabled} onChange={(e) => setFormData({ ...formData, preorders_enabled: e.target.checked })} />Accept paid preorders before release</label></div> : null}</fieldset>
            <fieldset className="rounded-lg border border-gray-200 p-3"><legend className="px-1 text-sm font-semibold text-gray-700">Membership access</legend><label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={formData.member_exclusive} onChange={(e) => setFormData({ ...formData, member_exclusive: e.target.checked })} />Members only product</label>{formData.upcoming_release ? <label className="mt-3 block text-xs font-medium text-gray-700">Member early access days<input type="number" min="0" max="365" value={formData.member_early_access_days} onChange={(e) => setFormData({ ...formData, member_early_access_days: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="0" /></label> : null}</fieldset>
            <fieldset className="rounded-lg border border-gray-200 p-3"><legend className="px-1 text-sm font-semibold text-gray-700">Subscription access</legend><label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={formData.subscriber_exclusive} onChange={(e) => setFormData({ ...formData, subscriber_exclusive: e.target.checked })} />Active subscribers only</label>{formData.upcoming_release ? <label className="mt-3 block text-xs font-medium text-gray-700">Subscriber early access days<input type="number" min="0" max="365" value={formData.subscriber_early_access_days} onChange={(e) => setFormData({ ...formData, subscriber_early_access_days: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="0" /></label> : null}</fieldset>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  void handleImageFile(e.target.files?.[0] ?? null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
              />
              {formData.image_data && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="w-16 h-16 rounded border border-gray-300 bg-white flex items-center justify-center overflow-hidden">
                    <img src={formData.image_data} alt="Product preview" className="max-w-full max-h-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, image_data: '' }))}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
              <input
                type="number"
                step={formData.product_type === 'gift_card' ? "5" : "0.01"}
                min={formData.product_type === 'gift_card' ? "5" : undefined}
                max={formData.product_type === 'gift_card' ? "500" : undefined}
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              {formData.product_type === 'gift_card' ? <p className="mt-1 text-xs text-gray-500">Digital gift card values: $5 to $500 in $5 increments. Redeeming a gift card will apply the recipient discount at checkout.</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Unit</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.cost_per_unit}
                onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity in Stock</label>
              <input
                type="number"
                required
                value={formData.quantity_in_stock}
                onChange={(e) => setFormData({ ...formData, quantity_in_stock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex shrink-0 gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              disabled={readOnly}
              type="submit"
              className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingProduct ? 'Update' : 'Add'} Product
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
