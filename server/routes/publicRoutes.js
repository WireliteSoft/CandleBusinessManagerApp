import { registerPublicAppealRoutes } from './publicRoutes/appealRoutes.js';
import { registerPublicAuthRoutes } from './publicRoutes/authRoutes.js';
import { registerPublicStoreRoutes } from './publicRoutes/storeRoutes.js';
import { registerPublicStoreCommerceRoutes } from './publicRoutes/storeCommerceRoutes.js';

export function registerPublicRoutes(app, context) {
  registerPublicAuthRoutes(app, context);
  registerPublicAppealRoutes(app, context);
  registerPublicStoreRoutes(app, context);
  registerPublicStoreCommerceRoutes(app, context);
}
