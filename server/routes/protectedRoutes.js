import { registerProtectedAuthRoutes } from './protectedAuthRoutes.js';
import { registerStorefrontRoutes } from './storefrontRoutes.js';
import { registerTeamContactRoutes } from './teamContactRoutes.js';
import { registerTeamAccessRoutes } from './teamAccessRoutes.js';
import { registerCatalogRoutes } from './catalogRoutes.js';
import { registerOperationsRoutes } from './operationsRoutes.js';

export function registerProtectedRoutes(app, context) {
  registerProtectedAuthRoutes(app, context);
  registerStorefrontRoutes(app, context);
  registerTeamContactRoutes(app, context);
  registerTeamAccessRoutes(app, context);
  registerCatalogRoutes(app, context);
  registerOperationsRoutes(app, context);
}
