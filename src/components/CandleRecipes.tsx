import { useEffect, useState } from 'react';
import { localDb, type RecipeWithIngredients } from '../lib/localDb';
import type { CandleRecipeRecord, SupplyRecord } from '../lib/models';
import { BookOpen, ChefHat, Edit2, Plus, Trash2, X } from 'lucide-react';

type CandleRecipe = CandleRecipeRecord;
type Supply = SupplyRecord;

type DraftIngredient = {
  id: string;
  supply_id: string;
  quantity: string;
  percentage: string;
  notes: string;
};

const blankRecipeForm = {
  name: '',
  description: '',
  yield_quantity: '1',
  batch_size: '',
  difficulty_level: 'Medium',
  notes: '',
};

const blankIngredientForm = {
  supply_id: '',
  quantity: '',
  percentage: '',
  notes: '',
};

function makeDraftIngredient(): DraftIngredient {
  return { id: `${Date.now()}-${Math.random()}`, ...blankIngredientForm };
}

type Props = {
  readOnly?: boolean;
};

export default function CandleRecipes({ readOnly = false }: Props) {
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [showIngredientForm, setShowIngredientForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<CandleRecipe | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithIngredients | null>(null);
  const [formData, setFormData] = useState(blankRecipeForm);
  const [ingredientData, setIngredientData] = useState(blankIngredientForm);
  const [draftIngredients, setDraftIngredients] = useState<DraftIngredient[]>([
    makeDraftIngredient(),
  ]);

  useEffect(() => {
    void fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [recipeRows, supplyRows] = await Promise.all([
        localDb.getRecipesWithIngredients(),
        localDb.getSuppliesByName(),
      ]);
      setRecipes(recipeRows);
      setSupplies(supplyRows);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  }

  function openNewRecipe() {
    if (readOnly) return;
    setEditingRecipe(null);
    setFormData(blankRecipeForm);
    setDraftIngredients([makeDraftIngredient()]);
    setShowRecipeForm(true);
  }

  function openEditRecipe(recipe: CandleRecipe) {
    if (readOnly) return;
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name,
      description: recipe.description,
      yield_quantity: String(recipe.yield_quantity),
      batch_size: String(recipe.batch_size),
      difficulty_level: recipe.difficulty_level,
      notes: recipe.notes,
    });
    setDraftIngredients([makeDraftIngredient()]);
    setShowRecipeForm(true);
  }

  async function handleRecipeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;

    const recipePayload = {
      name: formData.name,
      description: formData.description,
      yield_quantity: parseInt(formData.yield_quantity, 10),
      batch_size: parseFloat(formData.batch_size),
      difficulty_level: formData.difficulty_level,
      notes: formData.notes,
    };

    try {
      if (editingRecipe) {
        await localDb.updateRecipe(editingRecipe.id, recipePayload);
      } else {
        const created = await localDb.createRecipe(recipePayload);
        const valid = draftIngredients.filter(
          (item) => item.supply_id && item.quantity && parseFloat(item.quantity) > 0
        );

        for (const item of valid) {
          const qty = parseFloat(item.quantity);
          const percentage = item.percentage
            ? parseFloat(item.percentage)
            : (qty / recipePayload.batch_size) * 100;
          await localDb.addRecipeIngredient({
            recipe_id: created.id,
            supply_id: item.supply_id,
            quantity: qty,
            percentage,
            notes: item.notes,
          });
        }
      }

      setShowRecipeForm(false);
      await fetchAll();
    } catch (error) {
      console.error('Error saving recipe:', error);
    }
  }

  async function handleAddIngredient(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!selectedRecipe) return;

    try {
      const qty = parseFloat(ingredientData.quantity);
      await localDb.addRecipeIngredient({
        recipe_id: selectedRecipe.id,
        supply_id: ingredientData.supply_id,
        quantity: qty,
        percentage: ingredientData.percentage
          ? parseFloat(ingredientData.percentage)
          : (qty / selectedRecipe.batch_size) * 100,
        notes: ingredientData.notes,
      });
      setIngredientData(blankIngredientForm);
      setShowIngredientForm(false);
      await fetchAll();
    } catch (error) {
      console.error('Error adding ingredient:', error);
    }
  }

  async function handleDeleteRecipe(id: string) {
    if (readOnly) return;
    if (!confirm('Delete this recipe?')) return;
    await localDb.deleteRecipe(id);
    if (selectedRecipe?.id === id) setSelectedRecipe(null);
    await fetchAll();
  }

  async function handleDeleteIngredient(id: string) {
    if (readOnly) return;
    if (!confirm('Remove this ingredient?')) return;
    await localDb.deleteRecipeIngredient(id);
    await fetchAll();
  }

  function addDraftRow() {
    if (readOnly) return;
    setDraftIngredients((prev) => [...prev, makeDraftIngredient()]);
  }

  function removeDraftRow(id: string) {
    if (readOnly) return;
    setDraftIngredients((prev) =>
      prev.length === 1 ? [makeDraftIngredient()] : prev.filter((item) => item.id !== id)
    );
  }

  function patchDraftRow(id: string, key: keyof Omit<DraftIngredient, 'id'>, value: string) {
    if (readOnly) return;
    setDraftIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  }

  if (loading) return <div className="text-center py-8 text-gray-600">Loading recipes...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Fragrance Recipes</h2>
        </div>
        <button
          onClick={openNewRecipe}
          disabled={readOnly}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" /> New Recipe
        </button>
      </div>

      {showRecipeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}
            </h3>
            <form onSubmit={handleRecipeSubmit} className="space-y-3">
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Recipe name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2" rows={3} placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2" type="number" step="0.1" required placeholder="Batch size (oz)" value={formData.batch_size} onChange={(e) => setFormData({ ...formData, batch_size: e.target.value })} />
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2" type="number" required placeholder="Yield" value={formData.yield_quantity} onChange={(e) => setFormData({ ...formData, yield_quantity: e.target.value })} />
              </div>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2" value={formData.difficulty_level} onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2" rows={2} placeholder="Notes & tips" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />

              {!editingRecipe && (
                <div className="recipe-tint-panel border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-800">Ingredients (optional)</p>
                    <button type="button" onClick={addDraftRow} disabled={readOnly} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                      + Add Ingredient
                    </button>
                  </div>
                  {draftIngredients.map((item) => {
                    const supply = supplies.find((s) => s.id === item.supply_id);
                    return (
                      <div key={item.id} className="bg-white border border-gray-300 rounded p-2 space-y-2">
                        <select className="w-full border border-gray-300 rounded px-2 py-2" value={item.supply_id} onChange={(e) => patchDraftRow(item.id, 'supply_id', e.target.value)}>
                          <option value="">Choose supply...</option>
                          {supplies.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.unit_type})
                            </option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <input className="border border-gray-300 rounded px-2 py-2" type="number" step="0.1" min="0" placeholder={`Qty (${supply?.unit_type || 'units'})`} value={item.quantity} onChange={(e) => patchDraftRow(item.id, 'quantity', e.target.value)} />
                          <input className="border border-gray-300 rounded px-2 py-2" type="number" step="0.1" min="0" placeholder="% (optional)" value={item.percentage} onChange={(e) => patchDraftRow(item.id, 'percentage', e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <input className="flex-1 border border-gray-300 rounded px-2 py-2" placeholder="Notes (optional)" value={item.notes} onChange={(e) => patchDraftRow(item.id, 'notes', e.target.value)} />
                          <button type="button" className="recipe-danger-icon-btn p-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => removeDraftRow(item.id)} disabled={readOnly}>
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700" type="submit">
                  {editingRecipe ? 'Update' : 'Create'} Recipe
                </button>
                <button className="flex-1 bg-gray-200 py-2 rounded-lg" type="button" onClick={() => setShowRecipeForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow border p-3">
          <h3 className="font-bold text-gray-800 mb-3">Your Recipes</h3>
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <button key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className={`w-full text-left rounded border p-3 ${selectedRecipe?.id === recipe.id ? 'recipe-select-card recipe-select-card-active' : 'bg-gray-50'}`}>
                <p className="font-semibold">{recipe.name}</p>
                <p className="text-xs text-gray-600">{recipe.recipe_ingredients.length} ingredients</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {!selectedRecipe ? (
            <div className="bg-white rounded-lg shadow border p-12 text-center text-gray-500">Select a recipe</div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow border p-6">
                <div className="flex justify-between mb-3">
                  <h3 className="text-2xl font-bold text-gray-800">{selectedRecipe.name}</h3>
                  <div className="flex gap-2">
                    <button className="recipe-primary-icon-btn p-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => openEditRecipe(selectedRecipe)} disabled={readOnly}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="recipe-danger-icon-btn p-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => void handleDeleteRecipe(selectedRecipe.id)} disabled={readOnly}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {selectedRecipe.description && <p className="text-gray-600 mb-2">{selectedRecipe.description}</p>}
                <p className="text-sm text-gray-600">
                  Batch: {selectedRecipe.batch_size} oz | Yield: {selectedRecipe.yield_quantity} | Difficulty: {selectedRecipe.difficulty_level}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow border p-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2"><ChefHat className="w-5 h-5 text-blue-600" />Ingredients</h4>
                  <button onClick={() => setShowIngredientForm(true)} disabled={readOnly} className="bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus className="w-4 h-4" /> Add Ingredient
                  </button>
                </div>

                {showIngredientForm && (
                  <form onSubmit={handleAddIngredient} className="recipe-tint-panel border rounded-lg p-3 mb-3 space-y-2">
                    <select required className="w-full border border-gray-300 rounded px-2 py-2" value={ingredientData.supply_id} onChange={(e) => setIngredientData({ ...ingredientData, supply_id: e.target.value })}>
                      <option value="">Choose supply...</option>
                      {supplies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.unit_type})
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input required className="border border-gray-300 rounded px-2 py-2" type="number" step="0.1" placeholder={`Quantity (${supplies.find((s) => s.id === ingredientData.supply_id)?.unit_type || 'units'})`} value={ingredientData.quantity} onChange={(e) => setIngredientData({ ...ingredientData, quantity: e.target.value })} />
                      <input className="border border-gray-300 rounded px-2 py-2" type="number" step="0.1" placeholder="% (optional)" value={ingredientData.percentage} onChange={(e) => setIngredientData({ ...ingredientData, percentage: e.target.value })} />
                    </div>
                    <input className="w-full border border-gray-300 rounded px-2 py-2" placeholder="Notes (optional)" value={ingredientData.notes} onChange={(e) => setIngredientData({ ...ingredientData, notes: e.target.value })} />
                    <div className="flex gap-2">
                      <button className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700" type="submit">Add</button>
                      <button className="flex-1 bg-gray-200 py-2 rounded" type="button" onClick={() => setShowIngredientForm(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {selectedRecipe.recipe_ingredients.length === 0 ? (
                  <p className="text-gray-500">No ingredients yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedRecipe.recipe_ingredients.map((ing) => (
                      <div key={ing.id} className="border border-gray-300 rounded p-3 flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{ing.supplies.name}</p>
                          <p className="text-sm text-gray-600">
                            {ing.quantity} {ing.supplies.unit_type} ({ing.percentage.toFixed(1)}%)
                          </p>
                          {ing.notes && <p className="text-xs text-gray-500">{ing.notes}</p>}
                        </div>
                        <button className="recipe-danger-icon-btn p-2 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => void handleDeleteIngredient(ing.id)} disabled={readOnly}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
