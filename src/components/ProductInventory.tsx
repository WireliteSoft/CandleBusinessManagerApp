import { useState, useEffect, useMemo } from 'react';
import { localDb } from '../lib/localDb';
import { Package, Plus } from 'lucide-react';
import {
  FAVORITE_PRODUCTS_STORAGE_KEY,
  INITIAL_PRODUCT_FORM,
  INITIAL_SALE_FORM,
  type Employee,
  type InventoryCategory,
  type InventoryView,
  type Product,
  type ProductFormData,
  type ProductSaleData,
} from './productInventory/config';
import ProductCardsView from './productInventory/ProductCardsView';
import ProductFormModal from './productInventory/ProductFormModal';
import ProductListView from './productInventory/ProductListView';
import ProductSaleModal from './productInventory/ProductSaleModal';
import { loadFavoriteProductIds, readFileAsDataUrl } from './productInventory/storage';

type Props = {
  readOnly?: boolean;
};

export default function ProductInventory({ readOnly = false }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(INITIAL_PRODUCT_FORM);
  const [saleData, setSaleData] = useState<ProductSaleData>(INITIAL_SALE_FORM);
  const [inventoryView, setInventoryView] = useState<InventoryView>('cards');
  const [inventoryCategory, setInventoryCategory] = useState<InventoryCategory>('all');
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>(loadFavoriteProductIds);

  useEffect(() => {
    fetchProducts();
    fetchEmployees();
  }, []);
  useEffect(() => {
    window.localStorage.setItem(FAVORITE_PRODUCTS_STORAGE_KEY, JSON.stringify(favoriteProductIds));
  }, [favoriteProductIds]);
  useEffect(() => {
    // Keep local favorite IDs in sync with current inventory.
    setFavoriteProductIds((prev) => {
      if (prev.length === 0) return prev;
      const currentIds = new Set(products.map((product) => product.id));
      const next = prev.filter((id) => currentIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [products]);

  async function fetchProducts() {
    try {
      setProducts(await localDb.getProducts());
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmployees() {
    try {
      setEmployees(await localDb.getActiveEmployeesByName());
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        image_data: formData.image_data || '',
        product_type: formData.product_type,
        scent_family: formData.scent_family, fragrance_notes: formData.fragrance_notes, sweetness: formData.sweetness, scent_strength: formData.scent_strength, warmth: formData.warmth, freshness: formData.freshness, season: formData.season, mood: formData.mood, room: formData.room, burn_time: formData.burn_time, wax_type: formData.wax_type, wick_type: formData.wick_type, batch_number: formData.batch_number, inspiration: formData.inspiration, making_process: formData.making_process, limited_drop: formData.limited_drop, drop_number: formData.drop_number, purchase_limit: Number(formData.purchase_limit || 0), upcoming_release: formData.upcoming_release, release_date: formData.release_date, preorders_enabled: formData.preorders_enabled, member_exclusive: formData.member_exclusive, member_early_access_days: Number(formData.member_early_access_days || 0), subscriber_exclusive: formData.subscriber_exclusive, subscriber_early_access_days: Number(formData.subscriber_early_access_days || 0),
        price: parseFloat(formData.price),
        quantity_in_stock: parseInt(formData.quantity_in_stock),
        cost_per_unit: parseFloat(formData.cost_per_unit),
      };

      if (editingProduct) {
        await localDb.updateProduct(editingProduct.id, productData);
      } else {
        await localDb.createProduct(productData);
      }

      setShowForm(false);
      setEditingProduct(null);
      setFormData(INITIAL_PRODUCT_FORM);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  }

  async function handleSale(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!saleProduct) return;

    try {
      const quantity = parseInt(saleData.quantity);
      const employee = employees.find((e) => e.id === saleData.employee_id);
      const totalAmount = saleProduct.price * quantity;
      const commissionAmount = employee ? totalAmount * employee.commission_rate : 0;

      await localDb.recordSale({
        product_id: saleProduct.id,
        employee_id: saleData.employee_id || null,
        quantity,
        sale_price: saleProduct.price,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
      });

      setShowSaleForm(false);
      setSaleProduct(null);
      setSaleData(INITIAL_SALE_FORM);
      fetchProducts();
    } catch (error) {
      console.error('Error recording sale:', error);
    }
  }

  async function handleDelete(id: string) {
    if (readOnly) return;
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await localDb.deleteProduct(id);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  }

  function openEditForm(product: Product) {
    if (readOnly) return;
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      image_data: product.image_data || '',
      product_type: product.product_type || 'physical',
      scent_family: product.scent_family || '', fragrance_notes: product.fragrance_notes || '', sweetness: product.sweetness || '', scent_strength: product.scent_strength || '', warmth: product.warmth || '', freshness: product.freshness || '', season: product.season || '', mood: product.mood || '', room: product.room || '', burn_time: product.burn_time || '', wax_type: product.wax_type || '', wick_type: product.wick_type || '', batch_number: product.batch_number || '', inspiration: product.inspiration || '', making_process: product.making_process || '', limited_drop: Boolean(product.limited_drop), drop_number: product.drop_number || '', purchase_limit: product.purchase_limit ? String(product.purchase_limit) : '', upcoming_release: Boolean(product.upcoming_release), release_date: product.release_date || '', preorders_enabled: Boolean(product.preorders_enabled), member_exclusive: Boolean(product.member_exclusive), member_early_access_days: product.member_early_access_days ? String(product.member_early_access_days) : '', subscriber_exclusive: Boolean(product.subscriber_exclusive), subscriber_early_access_days: product.subscriber_early_access_days ? String(product.subscriber_early_access_days) : '',
      price: product.price.toString(),
      quantity_in_stock: product.quantity_in_stock.toString(),
      cost_per_unit: product.cost_per_unit.toString(),
    });
    setShowForm(true);
  }

  function openSaleForm(product: Product) {
    if (readOnly) return;
    setSaleProduct(product);
    setSaleData(INITIAL_SALE_FORM);
    setShowSaleForm(true);
  }

  async function handleImageFile(file: File | null) {
    if (!file || readOnly) return;
    try {
      const data = await readFileAsDataUrl(file);
      setFormData((prev) => ({ ...prev, image_data: data }));
    } catch (error) {
      console.error('Error loading image:', error);
    }
  }

  function toggleFavorite(productId: string, checked: boolean) {
    setFavoriteProductIds((prev) => {
      const current = new Set(prev);
      if (checked) {
        current.add(productId);
      } else {
        current.delete(productId);
      }
      return Array.from(current);
    });
  }

  const profitStats = useMemo(() => {
    const inventoryCogs = products.reduce(
      (sum, product) => sum + product.cost_per_unit * product.quantity_in_stock,
      0
    );
    const potentialRevenue = products.reduce(
      (sum, product) => sum + product.price * product.quantity_in_stock,
      0
    );
    const potentialGrossProfit = potentialRevenue - inventoryCogs;
    const avgMarginPercent =
      potentialRevenue > 0 ? (potentialGrossProfit / potentialRevenue) * 100 : 0;

    return {
      inventoryCogs,
      potentialRevenue,
      potentialGrossProfit,
      avgMarginPercent,
    };
  }, [products]);
  const favoriteIdSet = useMemo(() => new Set(favoriteProductIds), [favoriteProductIds]);
  const filteredProducts = useMemo(() => {
    if (inventoryCategory === 'favorites') {
      return products.filter((product) => favoriteIdSet.has(product.id));
    }
    return products;
  }, [favoriteIdSet, inventoryCategory, products]);

  if (loading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-amber-600" />
          <h2 className="text-2xl font-bold text-gray-800">Product Inventory</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setInventoryCategory('all')}
              className={`px-3 py-2 text-sm ${
                inventoryCategory === 'all'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setInventoryCategory('favorites')}
              className={`px-3 py-2 text-sm border-l border-gray-300 ${
                inventoryCategory === 'favorites'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Favorites ({favoriteProductIds.length})
            </button>
          </div>
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setInventoryView('list')}
              className={`px-3 py-2 text-sm ${
                inventoryView === 'list'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setInventoryView('cards')}
              className={`px-3 py-2 text-sm border-l border-gray-300 ${
                inventoryView === 'cards'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Thumbnails
            </button>
          </div>
          <button
            disabled={readOnly}
            onClick={() => {
              setShowForm(true);
              setEditingProduct(null);
              setFormData(INITIAL_PRODUCT_FORM);
            }}
            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Inventory COGS</p>
          <p className="text-2xl font-bold text-gray-800">${profitStats.inventoryCogs.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Potential Revenue (In Stock)</p>
          <p className="text-2xl font-bold text-gray-800">${profitStats.potentialRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Potential Gross Profit</p>
          <p className="text-2xl font-bold text-green-700">${profitStats.potentialGrossProfit.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Average Margin</p>
          <p className="text-2xl font-bold text-gray-800">{profitStats.avgMarginPercent.toFixed(1)}%</p>
        </div>
      </div>

      {showForm && (
        <ProductFormModal
          editingProduct={editingProduct}
          formData={formData}
          handleImageFile={handleImageFile}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          onSubmit={handleSubmit}
          readOnly={readOnly}
          setFormData={setFormData}
        />
      )}

      {showSaleForm && saleProduct && (
        <ProductSaleModal
          employees={employees}
          onClose={() => {
            setShowSaleForm(false);
            setSaleProduct(null);
          }}
          onSubmit={handleSale}
          readOnly={readOnly}
          saleData={saleData}
          saleProduct={saleProduct}
          setSaleData={setSaleData}
        />
      )}

      {inventoryView === 'cards' ? (
        <ProductCardsView
          favoriteIdSet={favoriteIdSet}
          filteredProducts={filteredProducts}
          handleDelete={handleDelete}
          openEditForm={openEditForm}
          openSaleForm={openSaleForm}
          readOnly={readOnly}
          toggleFavorite={toggleFavorite}
        />
      ) : (
        <ProductListView
          favoriteIdSet={favoriteIdSet}
          filteredProducts={filteredProducts}
          handleDelete={handleDelete}
          openEditForm={openEditForm}
          openSaleForm={openSaleForm}
          readOnly={readOnly}
          toggleFavorite={toggleFavorite}
        />
      )}

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No products yet. Click "Add Product" to get started.
        </div>
      )}
      {products.length > 0 && filteredProducts.length === 0 && inventoryCategory === 'favorites' && (
        <div className="text-center py-12 text-gray-500">
          No favorites yet. Check the Fav box on any inventory item to add it here.
        </div>
      )}
    </div>
  );
}
