import type { PublicStorefrontConfig } from '../../lib/localDb';

export default function LaunchTools({ products }: { slug: string; products: PublicStorefrontConfig['products'] }) {
  const releases = products.filter((product) => product.upcoming_release).sort((a, b) => String(a.release_date).localeCompare(String(b.release_date)));
  if (!releases.length) return null;
  return <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-5"><h2 className="text-xl font-bold text-gray-900">Seasonal releases</h2><p className="mt-1 text-sm text-gray-600">Keep these dates in mind for upcoming scents and limited seasonal pours.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{releases.map((product) => <div key={product.id} className="rounded-lg border border-pink-100 bg-white p-3"><p className="font-semibold text-gray-900">{product.name}</p><p className="text-sm text-pink-800">{product.release_date ? `Expected ${product.release_date}` : 'Release date to be announced'}{product.preorders_enabled ? ' | Preorder open' : ''}</p></div>)}</div></section>;
}
