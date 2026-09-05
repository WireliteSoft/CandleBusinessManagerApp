import { createAuthApi } from './api/authApi';
import { createCatalogApi } from './api/catalogApi';
import { createOperationsApi } from './api/operationsApi';
import { createStorefrontApi } from './api/storefrontApi';
export { AUTH_TOKEN_STORAGE_KEY } from './localDbCore';
export type * from './localDbTypes';

export const localDb = {
  ...createAuthApi(),
  ...createStorefrontApi(),
  ...createCatalogApi(),
  ...createOperationsApi(),
};
