import { registerBatchLogRoutes } from './operationsRoutes/batchLogRoutes.js';
import { registerEmployeeSalesRoutes } from './operationsRoutes/employeeSalesRoutes.js';
import { registerMoldRoutes } from './operationsRoutes/moldRoutes.js';
import { registerRecipeRoutes } from './operationsRoutes/recipeRoutes.js';

export function registerOperationsRoutes(app, context) {
  registerEmployeeSalesRoutes(app, context);
  registerRecipeRoutes(app, context);
  registerBatchLogRoutes(app, context);
  registerMoldRoutes(app, context);
}
