import { request } from '../localDbCore';
import type {
  CandleRecipeInput,
  CandleRecipeRecord,
  CartItemInput,
  EmployeeInput,
  EmployeeRecord,
  ProductInput,
  ProductRecord,
  RecipeIngredientInput,
  SupplyInput,
  SupplyRecord,
  ScentProfileInput,
  ScentProfileRecord,
  WaxInventoryInput,
  WaxInventoryRecord,
} from '../models';
import type { CartItemWithSupply, RecipeWithIngredients } from '../localDbTypes';

export function createCatalogApi() {
  return {
    async getProducts(): Promise<ProductRecord[]> {
      return request('/api/products');
    },

    async createProduct(data: ProductInput): Promise<void> {
      await request('/api/products', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateProduct(id: string, data: Partial<ProductRecord>): Promise<void> {
      await request(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async deleteProduct(id: string): Promise<void> {
      await request(`/api/products/${id}`, { method: 'DELETE' });
    },

    async getSupplies(): Promise<SupplyRecord[]> {
      return request('/api/supplies');
    },

    async getSuppliesByName(): Promise<SupplyRecord[]> {
      return request('/api/supplies/by-name');
    },

    async getWaxInventory(): Promise<WaxInventoryRecord[]> {
      return request('/api/wax-inventory');
    },

    async getScentProfiles(): Promise<ScentProfileRecord[]> {
      return request('/api/scent-profiles');
    },

    async createScentProfile(data: ScentProfileInput): Promise<ScentProfileRecord> {
      return request('/api/scent-profiles', { method: 'POST', body: JSON.stringify(data) });
    },

    async updateScentProfile(id: string, data: Partial<ScentProfileInput>): Promise<ScentProfileRecord> {
      return request(`/api/scent-profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    async deleteScentProfile(id: string): Promise<void> {
      await request(`/api/scent-profiles/${id}`, { method: 'DELETE' });
    },

    async upsertWaxInventory(waxTypeId: string, data: WaxInventoryInput): Promise<WaxInventoryRecord> {
      return request(`/api/wax-inventory/${waxTypeId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async createSupply(data: SupplyInput): Promise<void> {
      await request('/api/supplies', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateSupply(id: string, data: Partial<SupplyRecord>): Promise<void> {
      await request(`/api/supplies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async useSupplyStock(id: string, amount: number): Promise<void> {
      await request(`/api/supplies/${id}/use-stock`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
    },

    async deleteSupply(id: string): Promise<void> {
      await request(`/api/supplies/${id}`, { method: 'DELETE' });
    },

    async getCartItemsWithSupplies(): Promise<CartItemWithSupply[]> {
      return request('/api/cart-items/with-supplies');
    },

    async addCartItem(data: CartItemInput): Promise<void> {
      await request('/api/cart-items', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async removeCartItem(id: string): Promise<void> {
      await request(`/api/cart-items/${id}`, { method: 'DELETE' });
    },

    async clearCart(): Promise<void> {
      await request('/api/cart-items', { method: 'DELETE' });
    },

    async getEmployees(): Promise<EmployeeRecord[]> {
      return request('/api/employees');
    },

    async getActiveEmployeesByName(): Promise<EmployeeRecord[]> {
      return request('/api/employees/active');
    },

    async createEmployee(data: EmployeeInput): Promise<void> {
      await request('/api/employees', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateEmployee(id: string, data: Partial<EmployeeRecord>): Promise<void> {
      await request(`/api/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async deleteEmployee(id: string): Promise<void> {
      await request(`/api/employees/${id}`, { method: 'DELETE' });
    },

    async getRecipesWithIngredients(): Promise<RecipeWithIngredients[]> {
      return request('/api/recipes/with-ingredients');
    },

    async createRecipe(data: CandleRecipeInput): Promise<CandleRecipeRecord> {
      return request('/api/recipes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateRecipe(id: string, data: Partial<CandleRecipeRecord>): Promise<void> {
      await request(`/api/recipes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async deleteRecipe(id: string): Promise<void> {
      await request(`/api/recipes/${id}`, { method: 'DELETE' });
    },

    async addRecipeIngredient(data: RecipeIngredientInput): Promise<void> {
      await request('/api/recipe-ingredients', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async deleteRecipeIngredient(id: string): Promise<void> {
      await request(`/api/recipe-ingredients/${id}`, { method: 'DELETE' });
    },
  };
}
