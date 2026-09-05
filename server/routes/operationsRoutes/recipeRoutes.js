export function registerRecipeRoutes(app, context) {
  const { prisma, parseOrThrow, toRowDates, recipeInput, ingredientInput } = context;

  app.get('/api/recipes/with-ingredients', async (_req, res, next) => {
    try {
      const recipes = await prisma.candleRecipe.findMany({
        orderBy: { created_at: 'desc' },
        include: {
          recipe_ingredients: {
            include: { supply: true },
          },
        },
      });
      const mapped = recipes.map((recipe) => ({
        ...recipe,
        recipe_ingredients: recipe.recipe_ingredients.map((ing) => ({
          id: ing.id,
          recipe_id: ing.recipe_id,
          supply_id: ing.supply_id,
          quantity: ing.quantity,
          percentage: ing.percentage,
          notes: ing.notes,
          created_at: ing.created_at,
          supplies: ing.supply,
        })),
      }));
      res.json(toRowDates(mapped));
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/recipes', async (req, res, next) => {
    try {
      const data = parseOrThrow(recipeInput, req.body);
      const row = await prisma.candleRecipe.create({ data });
      res.status(201).json(toRowDates(row));
    } catch (e) {
      next(e);
    }
  });

  app.put('/api/recipes/:id', async (req, res, next) => {
    try {
      const data = parseOrThrow(recipeInput.partial(), req.body);
      const row = await prisma.candleRecipe.update({ where: { id: req.params.id }, data });
      res.json(toRowDates(row));
    } catch (e) {
      next(e);
    }
  });

  app.delete('/api/recipes/:id', async (req, res, next) => {
    try {
      await prisma.candleRecipe.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/recipe-ingredients', async (req, res, next) => {
    try {
      const data = parseOrThrow(ingredientInput, req.body);
      const row = await prisma.recipeIngredient.create({ data });
      res.status(201).json(toRowDates(row));
    } catch (e) {
      next(e);
    }
  });

  app.delete('/api/recipe-ingredients/:id', async (req, res, next) => {
    try {
      await prisma.recipeIngredient.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  });
}
