import { useState, useEffect, useRef } from 'react';
import { localDb, type CartItemWithSupply } from '../lib/localDb';
import { ShoppingCart, Plus, Package2 } from 'lucide-react';
import CartView from './suppliesCart/CartView';
import {
  FAVORITE_SUPPLIES_STORAGE_KEY,
  INITIAL_SUPPLY_FORM,
  SUPPLY_CATEGORIES,
  type Supply,
  type SupplyFormData,
  type SupplyView,
} from './suppliesCart/config';
import SuppliesGridView from './suppliesCart/SuppliesGridView';
import SuppliesListView from './suppliesCart/SuppliesListView';
import SupplyFormModal from './suppliesCart/SupplyFormModal';
import { readFavoriteSupplyIds, readPreviewCache, writePreviewCache } from './suppliesCart/storage';

type Props = {
  readOnly?: boolean;
};

export default function SuppliesCart({ readOnly = false }: Props) {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [cartItems, setCartItems] = useState<CartItemWithSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSupplyForm, setShowSupplyForm] = useState(false);
  const [showCartView, setShowCartView] = useState(false);
  const [supplyView, setSupplyView] = useState<SupplyView>('cards');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [favoriteSupplyIds, setFavoriteSupplyIds] = useState<string[]>(readFavoriteSupplyIds);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [linkPreviewImages, setLinkPreviewImages] =
    useState<Record<string, string | null>>(readPreviewCache);
  const previewRequestKeyRef = useRef<Record<string, string>>({});
  const [formData, setFormData] = useState<SupplyFormData>(INITIAL_SUPPLY_FORM);
  const apiBase = import.meta.env.VITE_API_BASE || '';

  useEffect(() => {
    fetchSupplies();
    fetchCart();
  }, []);
  useEffect(() => {
    localStorage.setItem(FAVORITE_SUPPLIES_STORAGE_KEY, JSON.stringify(favoriteSupplyIds));
  }, [favoriteSupplyIds]);
  useEffect(() => {
    setFavoriteSupplyIds((prev) => {
      if (prev.length === 0) return prev;
      const currentIds = new Set(supplies.map((supply) => supply.id));
      const next = prev.filter((id) => currentIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [supplies]);

  async function fetchSupplies() {
    try {
      setSupplies(await localDb.getSupplies());
    } catch (error) {
      console.error('Error fetching supplies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCart() {
    try {
      setCartItems(await localDb.getCartItemsWithSupplies());
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    try {
      const supplyData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        cost_per_unit: parseFloat(formData.cost_per_unit),
        quantity_in_stock: parseInt(formData.quantity_in_stock),
        unit_type: formData.unit_type,
        supplier: formData.supplier,
      };

      if (editingSupply) {
        await localDb.updateSupply(editingSupply.id, supplyData);
      } else {
        await localDb.createSupply(supplyData);
      }

      setShowSupplyForm(false);
      setEditingSupply(null);
      setFormData(INITIAL_SUPPLY_FORM);
      fetchSupplies();
    } catch (error) {
      console.error('Error saving supply:', error);
    }
  }

  async function addToCart(supplyId: string) {
    if (readOnly) return;
    const quantity = prompt('Enter quantity to add to cart:');
    if (!quantity) return;

    try {
      await localDb.addCartItem({
        supply_id: supplyId,
        quantity: parseInt(quantity),
      });
      fetchCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  }

  async function removeFromCart(id: string) {
    if (readOnly) return;
    try {
      await localDb.removeCartItem(id);
      fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  }

  async function clearCart() {
    if (readOnly) return;
    if (!confirm('Are you sure you want to clear the entire cart?')) return;

    try {
      await localDb.clearCart();
      fetchCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  }

  async function addCartItemToInventory(item: CartItemWithSupply) {
    if (readOnly) return;
    try {
      await localDb.updateSupply(item.supplies.id, {
        quantity_in_stock: item.supplies.quantity_in_stock + item.quantity,
      });
      await localDb.removeCartItem(item.id);
      fetchSupplies();
      fetchCart();
    } catch (error) {
      console.error('Error adding cart item to inventory:', error);
    }
  }

  async function handleDelete(id: string) {
    if (readOnly) return;
    if (!confirm('Are you sure you want to delete this supply?')) return;

    try {
      await localDb.deleteSupply(id);
      fetchSupplies();
      fetchCart();
    } catch (error) {
      console.error('Error deleting supply:', error);
    }
  }

  async function handleUseStock(supply: Supply) {
    if (readOnly) return;
    const value = prompt(`How many units of "${supply.name}" were used?`, '1');
    if (!value) return;

    const amount = parseInt(value, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please enter a valid positive number.');
      return;
    }

    if (amount > supply.quantity_in_stock) {
      alert(`Cannot remove ${amount}. Only ${supply.quantity_in_stock} in stock.`);
      return;
    }

    try {
      await localDb.useSupplyStock(supply.id, amount);
      fetchSupplies();
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  }

  function openEditForm(supply: Supply) {
    if (readOnly) return;
    setEditingSupply(supply);
    setFormData({
      name: supply.name,
      description: supply.description,
      category: supply.category || 'containers',
      cost_per_unit: supply.cost_per_unit.toString(),
      quantity_in_stock: supply.quantity_in_stock.toString(),
      unit_type: supply.unit_type,
      supplier: supply.supplier,
    });
    setShowSupplyForm(true);
  }

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.supplies.cost_per_unit * item.quantity,
    0
  );
  const favoriteSupplyIdSet = new Set(favoriteSupplyIds);

  function toggleFavoriteSupply(supplyId: string, checked: boolean) {
    setFavoriteSupplyIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(supplyId);
      else next.delete(supplyId);
      return Array.from(next);
    });
  }

  function toHref(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}`;
  }

  function setPreviewForHref(href: string, imageUrl: string | null) {
    setLinkPreviewImages((prev) => {
      const next = { ...prev, [href]: imageUrl };
      writePreviewCache(next);
      return next;
    });
  }

  function clearPreviewForHref(href: string) {
    setLinkPreviewImages((prev) => {
      const next = { ...prev };
      delete next[href];
      writePreviewCache(next);
      return next;
    });
  }

  const suppliesByCategory = supplies.reduce<Record<string, Supply[]>>((acc, supply) => {
    const key = (supply.category || 'other').toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(supply);
    return acc;
  }, {});
  const availableCategories = SUPPLY_CATEGORIES.filter(
    (category) => (suppliesByCategory[category] || []).length > 0
  );
  const outOfStockSupplies = supplies.filter((supply) => supply.quantity_in_stock <= 0);
  const filteredSupplies =
    activeCategory === 'all'
      ? supplies
      : activeCategory === 'favorites'
        ? supplies.filter((supply) => favoriteSupplyIdSet.has(supply.id))
        : activeCategory === 'out-of-stock'
          ? outOfStockSupplies
        : supplies.filter((supply) => (supply.category || 'other').toLowerCase() === activeCategory);

  useEffect(() => {
    if (
      activeCategory === 'favorites' ||
      activeCategory === 'all' ||
      activeCategory === 'out-of-stock'
    ) {
      return;
    }
    if (!availableCategories.includes(activeCategory as (typeof SUPPLY_CATEGORIES)[number])) {
      setActiveCategory('all');
    }
  }, [activeCategory, availableCategories]);

  useEffect(() => {
    let cancelled = false;

    const fetchPreview = async (supply: Supply) => {
      const href = toHref(supply.description);
      if (!href) return;

      if (previewRequestKeyRef.current[href] === href) return;
      previewRequestKeyRef.current[href] = href;

      try {
        let payload: { imageUrl?: string | null } | null = null;

        const res = await fetch(`${apiBase}/api/link-preview?url=${encodeURIComponent(href)}`);
        if (res.ok) payload = await res.json() as { imageUrl?: string | null };

        if (!payload) throw new Error('Preview request failed');
        if (cancelled) return;
        if (payload.imageUrl) {
          setPreviewForHref(href, payload.imageUrl);
        } else {
          setLinkPreviewImages((prev) => {
            if (href in prev) return prev;
            const next = { ...prev, [href]: null };
            writePreviewCache(next);
            return next;
          });
        }
      } catch {
        if (cancelled) return;
        setLinkPreviewImages((prev) => {
          if (href in prev) return prev;
          const next = { ...prev, [href]: null };
          writePreviewCache(next);
          return next;
        });
      }
    };

    for (const supply of supplies) {
      void fetchPreview(supply);
    }

    return () => {
      cancelled = true;
    };
  }, [apiBase, supplies]);

  if (loading) {
    return <div className="text-center py-8">Loading supplies...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Package2 className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Supplies Management</h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCartView(!showCartView)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors relative"
          >
            <ShoppingCart className="w-4 h-4" />
            {showCartView ? 'View Supplies' : 'View Cart'}
            {cartItems.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {cartItems.length}
              </span>
            )}
          </button>
          {!showCartView && (
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setSupplyView('list')}
                className={`px-3 py-2 text-sm ${
                  supplyView === 'list'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setSupplyView('cards')}
                className={`px-3 py-2 text-sm border-l border-gray-300 ${
                  supplyView === 'cards'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cards
              </button>
            </div>
          )}
          {!showCartView && (
            <button
              disabled={readOnly}
              onClick={() => {
                setShowSupplyForm(true);
                setEditingSupply(null);
                setFormData(INITIAL_SUPPLY_FORM);
              }}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Supply
            </button>
          )}
        </div>
      </div>
      {!showCartView && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveCategory('favorites')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              activeCategory === 'favorites'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Favorites ({favoriteSupplyIds.length})
          </button>
          <button
            onClick={() => setActiveCategory('out-of-stock')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              activeCategory === 'out-of-stock'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Out of Stock ({outOfStockSupplies.length})
          </button>
          {availableCategories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                activeCategory === category
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {showSupplyForm && (
        <SupplyFormModal
          editingSupply={editingSupply}
          formData={formData}
          onClose={() => {
            setShowSupplyForm(false);
            setEditingSupply(null);
          }}
          onSubmit={handleSubmit}
          readOnly={readOnly}
          setFormData={setFormData}
        />
      )}

      {showCartView ? (
        <CartView
          addCartItemToInventory={addCartItemToInventory}
          cartItems={cartItems}
          cartTotal={cartTotal}
          clearCart={clearCart}
          readOnly={readOnly}
          removeFromCart={removeFromCart}
          toHref={toHref}
        />
      ) : (
        supplyView === 'cards' ? (
          <SuppliesGridView
            addToCart={addToCart}
            clearPreviewForHref={clearPreviewForHref}
            favoriteSupplyIdSet={favoriteSupplyIdSet}
            filteredSupplies={filteredSupplies}
            handleDelete={handleDelete}
            handleUseStock={handleUseStock}
            linkPreviewImages={linkPreviewImages}
            openEditForm={openEditForm}
            readOnly={readOnly}
            toHref={toHref}
            toggleFavoriteSupply={toggleFavoriteSupply}
          />
        ) : (
          <SuppliesListView
            addToCart={addToCart}
            favoriteSupplyIdSet={favoriteSupplyIdSet}
            filteredSupplies={filteredSupplies}
            handleDelete={handleDelete}
            handleUseStock={handleUseStock}
            linkPreviewImages={linkPreviewImages}
            openEditForm={openEditForm}
            readOnly={readOnly}
            toHref={toHref}
            toggleFavoriteSupply={toggleFavoriteSupply}
          />
        )
      )}

      {!showCartView && supplies.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No supplies yet. Click "Add Supply" to get started.
        </div>
      )}
      {!showCartView && supplies.length > 0 && filteredSupplies.length === 0 && activeCategory === 'favorites' && (
        <div className="text-center py-12 text-gray-500">
          No favorites yet. Check the Fav box on a supply to add it here.
        </div>
      )}
      {!showCartView && supplies.length > 0 && filteredSupplies.length === 0 && activeCategory === 'out-of-stock' && (
        <div className="text-center py-12 text-gray-500">
          No out-of-stock supplies right now.
        </div>
      )}
    </div>
  );
}

