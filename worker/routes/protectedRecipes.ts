import { canEditFeature, resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

async function readObject(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

function finiteNumber(value: unknown, minimum: number, integer = false) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && (!integer || Number.isInteger(number)) ? number : null;
}

async function readRecipe(request: Request, partial: boolean) {
  const body = await readObject(request);
  if (!body) return null;
  const output: Record<string, string | number> = {};
  const strings = { name: 240, description: 10_000, difficulty_level: 80, notes: 10_000 } as const;
  for (const [field, max] of Object.entries(strings)) {
    if (!(field in body)) continue;
    const value = String(body[field] ?? '').trim();
    if (value.length > max || ((field === 'name' || field === 'difficulty_level') && !value)) return null;
    output[field] = value;
  }
  if ('yield_quantity' in body) {
    const yieldQuantity = finiteNumber(body.yield_quantity, 1, true);
    if (yieldQuantity === null || yieldQuantity > 100_000) return null;
    output.yield_quantity = yieldQuantity;
  }
  if ('batch_size' in body) {
    const batchSize = finiteNumber(body.batch_size, Number.MIN_VALUE);
    if (batchSize === null || batchSize > 10_000_000) return null;
    output.batch_size = batchSize;
  }
  if (!partial && ['name', 'yield_quantity', 'batch_size', 'difficulty_level'].some((field) => !(field in output))) return null;
  return output;
}

async function readIngredient(request: Request) {
  const body = await readObject(request);
  if (!body) return null;
  const recipeId = String(body.recipe_id ?? '').trim();
  const supplyId = String(body.supply_id ?? '').trim();
  const quantity = finiteNumber(body.quantity, Number.MIN_VALUE);
  const percentage = finiteNumber(body.percentage, 0);
  const notes = String(body.notes ?? '').trim();
  if (!recipeId || recipeId.length > 128 || !supplyId || supplyId.length > 128 || quantity === null || quantity > 10_000_000 || percentage === null || percentage > 100_000 || notes.length > 5_000) return null;
  return { recipeId, supplyId, quantity, percentage, notes };
}

async function recipesWithIngredients(repository: ReturnType<typeof createD1Repository>, accountId: string) {
  const recipes = await repository.all<Record<string, unknown>>(
    'SELECT * FROM CandleRecipe WHERE account_id = ? ORDER BY created_at DESC', [accountId],
  );
  if (!recipes.length) return recipes;
  const ingredients = await repository.all<Record<string, unknown>>(
    `SELECT i.id, i.recipe_id, i.supply_id, i.quantity, i.percentage, i.notes, i.created_at,
       json_object('id', s.id, 'name', s.name, 'description', s.description, 'category', s.category,
         'cost_per_unit', s.cost_per_unit, 'quantity_in_stock', s.quantity_in_stock, 'unit_type', s.unit_type,
         'supplier', s.supplier, 'created_at', s.created_at, 'updated_at', s.updated_at) AS supplies
     FROM RecipeIngredient i JOIN Supply s ON s.id = i.supply_id AND s.account_id = i.account_id
     WHERE i.account_id = ?`,
    [accountId],
  );
  const byRecipe = new Map<string, Array<Record<string, unknown>>>();
  for (const ingredient of ingredients) {
    const mapped = { ...ingredient, supplies: typeof ingredient.supplies === 'string' ? JSON.parse(ingredient.supplies) : ingredient.supplies };
    const group = byRecipe.get(String(ingredient.recipe_id)) || [];
    group.push(mapped);
    byRecipe.set(String(ingredient.recipe_id), group);
  }
  return recipes.map((recipe) => ({ ...recipe, recipe_ingredients: byRecipe.get(String(recipe.id)) || [] }));
}

export async function handleProtectedRecipesRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db) return null;
  const pathname = new URL(request.url).pathname;
  const recipeMatch = pathname.match(/^\/api\/recipes(?:\/([^/]+))?$/);
  const ingredientMatch = pathname.match(/^\/api\/recipe-ingredients(?:\/([^/]+))?$/);
  if (!recipeMatch && !ingredientMatch) return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!await canEditFeature(db, auth, 'recipes_edit')) return json({ error: 'Forbidden' }, { status: 403 });
  const repository = createD1Repository(db);

  if (pathname === '/api/recipes/with-ingredients' && request.method === 'GET') {
    return json(await recipesWithIngredients(repository, auth.accountId));
  }

  if (recipeMatch) {
    const recipeId = recipeMatch[1] ? decodeURIComponent(recipeMatch[1]).trim() : '';
    if (request.method === 'POST' && !recipeId) {
      const recipe = await readRecipe(request, false);
      if (!recipe) return json({ error: 'Invalid recipe data' }, { status: 400 });
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const columns = ['id', 'account_id', ...Object.keys(recipe), 'created_at', 'updated_at'];
      await repository.run(
        `INSERT INTO CandleRecipe (${columns.map((field) => `"${field}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        [id, auth.accountId, ...Object.values(recipe), now, now],
      );
      return json(await repository.first<Record<string, unknown>>('SELECT * FROM CandleRecipe WHERE account_id = ? AND id = ?', [auth.accountId, id]), { status: 201 });
    }
    if (!recipeId) return null;
    if (request.method === 'PUT') {
      const recipe = await readRecipe(request, true);
      if (!recipe || !Object.keys(recipe).length) return json({ error: 'Invalid recipe data' }, { status: 400 });
      const result = await repository.run(
        `UPDATE CandleRecipe SET ${[...Object.keys(recipe).map((field) => `"${field}" = ?`), '"updated_at" = ?'].join(', ')} WHERE account_id = ? AND id = ?`,
        [...Object.values(recipe), new Date().toISOString(), auth.accountId, recipeId],
      );
      if (Number(result.meta.changes || 0) !== 1) return json({ error: 'Recipe not found' }, { status: 404 });
      return json(await repository.first<Record<string, unknown>>('SELECT * FROM CandleRecipe WHERE account_id = ? AND id = ?', [auth.accountId, recipeId]));
    }
    if (request.method === 'DELETE') {
      const recipe = await repository.first<{ id: string }>('SELECT id FROM CandleRecipe WHERE account_id = ? AND id = ?', [auth.accountId, recipeId]);
      if (!recipe) return json({ error: 'Recipe not found' }, { status: 404 });
      // D1 can report zero direct changes when child ingredients are removed by a foreign-key cascade.
      await repository.run('DELETE FROM CandleRecipe WHERE account_id = ? AND id = ?', [auth.accountId, recipeId]);
      return new Response(null, { status: 204 });
    }
  }

  if (ingredientMatch) {
    const ingredientId = ingredientMatch[1] ? decodeURIComponent(ingredientMatch[1]).trim() : '';
    if (request.method === 'POST' && !ingredientId) {
      const ingredient = await readIngredient(request);
      if (!ingredient) return json({ error: 'Invalid recipe ingredient data' }, { status: 400 });
      const [recipe, supply] = await Promise.all([
        repository.first<{ id: string }>('SELECT id FROM CandleRecipe WHERE account_id = ? AND id = ?', [auth.accountId, ingredient.recipeId]),
        repository.first<{ id: string }>('SELECT id FROM Supply WHERE account_id = ? AND id = ?', [auth.accountId, ingredient.supplyId]),
      ]);
      if (!recipe) return json({ error: 'Recipe not found' }, { status: 404 });
      if (!supply) return json({ error: 'Supply not found' }, { status: 404 });
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      await repository.run(
        'INSERT INTO RecipeIngredient (id, account_id, recipe_id, supply_id, quantity, percentage, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, auth.accountId, ingredient.recipeId, ingredient.supplyId, ingredient.quantity, ingredient.percentage, ingredient.notes, createdAt],
      );
      return json(await repository.first<Record<string, unknown>>('SELECT * FROM RecipeIngredient WHERE account_id = ? AND id = ?', [auth.accountId, id]), { status: 201 });
    }
    if (request.method === 'DELETE' && ingredientId) {
      const result = await repository.run('DELETE FROM RecipeIngredient WHERE account_id = ? AND id = ?', [auth.accountId, ingredientId]);
      return Number(result.meta.changes || 0) === 1 ? new Response(null, { status: 204 }) : json({ error: 'Recipe ingredient not found' }, { status: 404 });
    }
  }
  return null;
}
