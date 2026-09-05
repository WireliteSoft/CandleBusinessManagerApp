import cors from 'cors';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { registerPublicRoutes } from './routes/publicRoutes.js';
import { registerPaymentWebhookRoutes } from './routes/paymentWebhookRoutes.js';
import { registerSuperAdminRoutes } from './routes/superadminRoutes.js';
import { registerProtectedRoutes } from './routes/protectedRoutes.js';
import { normalizeHttpUrl, extractMetaContent, extractFirstImgSrc, toRowDates, parseOrThrow, parseStringArrayJson, getClientIp } from './lib/http.js';
import { hashPassword, generateJoinCode, verifyPassword } from './lib/security.js';
import { normalizeBatchLogRow, normalizeMoldRow } from './lib/normalizers.js';
import { createAccountDbHelpers } from './lib/accountDb.js';
import { readBearerToken, getSuperAdminSession, createRequireSuperAdmin, isSafeIdentifier, quoteIdentifier, createSuperAdminDbHelpers } from './lib/superadmin.js';
import { createAuthzHelpers } from './lib/authz.js';
import { initDatabase } from './lib/initDatabase.js';
import { productInput, supplyInput, waxInventoryInput, scentProfileInput, employeeInput, saleInput, recipeInput, ingredientInput, batchLogCreateInput, batchLogUpdateInput, moldCreateInput, moldUpdateInput, banAppealCreateInput, banAppealMessageInput, banAppealStatusInput, banAppealEvidenceInput, useStockInput, saleEmployeeUpdateInput, authRegisterInput, authLoginInput, authRequestAccessInput, authCreateUserInput, superAdminLoginInput, superAdminDbRowUpdateInput, superAdminDbRowDeleteInput, billingTierInput, superAdminAccountTierInput, billingCheckoutInput, billingPayPalOrderInput, billingPayPalCaptureInput, accountBillingProfileInput, billingConfigInput, teamRoleCreateInput, teamRolePermissionsInput, storefrontUpdateInput, storefrontImageUploadInput, storefrontFontUploadInput, publicStoreContactInput, storeCustomerRegisterInput, storeCustomerLoginInput, storeCustomerProfileInput, storeCustomerAddressInput, storeOrderCreateInput, storeOrderSquarePaymentInput, storeOrderPayPalInput, storefrontOrderUpdateInput, contactMessageReadInput, contactMessageWorkflowInput, TEAM_FEATURE_KEYS, accountStateInput } from './schemas/index.js';

const MASTER_DB_URL = process.env.DATABASE_URL || 'file:./candles-business.db';
const masterPrisma = new PrismaClient({
  datasources: {
    db: { url: MASTER_DB_URL },
  },
});
const accountDbContext = new AsyncLocalStorage();
const prisma = new Proxy(masterPrisma, {
  get(target, prop, receiver) {
    const scopedPrisma = accountDbContext.getStore();
    const source = scopedPrisma ?? target;
    const value = Reflect.get(source, prop, receiver);
    return typeof value === 'function' ? value.bind(source) : value;
  },
});
const accountPrismaCache = new Map();
const app = express();
const port = Number(process.env.API_PORT || 3001);
const publicWriteRateBuckets = new Map();
const PUBLIC_WRITE_WINDOW_MS = 15 * 60 * 1000;
const PUBLIC_WRITE_MAX_REQUESTS = 10;
const SUPERADMIN_EMAIL = String(process.env.SUPERADMIN_EMAIL || 'admin@candles.local').trim().toLowerCase();
const SUPERADMIN_PASSWORD = String(process.env.SUPERADMIN_PASSWORD || 'ChangeMeNow123!');
const STOREFRONT_MEDIA_ROOT = path.join(process.cwd(), 'storage', 'store-media');
const STOREFRONT_FONT_ROOT = path.join(process.cwd(), 'storage', 'store-fonts');
const ACCOUNT_DB_ROOT = path.join(process.cwd(), 'storage', 'accounts');
if (!fs.existsSync(STOREFRONT_MEDIA_ROOT)) {
  fs.mkdirSync(STOREFRONT_MEDIA_ROOT, { recursive: true });
}
if (!fs.existsSync(STOREFRONT_FONT_ROOT)) {
  fs.mkdirSync(STOREFRONT_FONT_ROOT, { recursive: true });
}
if (!fs.existsSync(ACCOUNT_DB_ROOT)) {
  fs.mkdirSync(ACCOUNT_DB_ROOT, { recursive: true });
}

app.use(cors());

const { getAccountPrisma, findAccountIdByIdentifier, deleteAccountDatabase } = createAccountDbHelpers({
  accountDbRoot: ACCOUNT_DB_ROOT,
  accountPrismaCache,
  masterPrisma,
  initDatabase,
});
const requireSuperAdmin = createRequireSuperAdmin(masterPrisma);
const { getSuperAdminTargetDb, getDbTableNames, getTableInfo } = createSuperAdminDbHelpers(
  masterPrisma,
  getAccountPrisma
);
const { getAuthContextFromToken, normalizeRoleName, getRolePermissionMap, requireFeatureEdit } =
  createAuthzHelpers({
    masterPrisma,
    TEAM_FEATURE_KEYS,
    generateJoinCode,
  });

const routeContext = {
  fs,
  path,
  z,
  app,
  prisma,
  masterPrisma,
  accountDbContext,
  STOREFRONT_MEDIA_ROOT,
  STOREFRONT_FONT_ROOT,
  SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD,
  TEAM_FEATURE_KEYS,
  normalizeHttpUrl,
  extractMetaContent,
  extractFirstImgSrc,
  toRowDates,
  parseOrThrow,
  parseStringArrayJson,
  getClientIp,
  hashPassword,
  generateJoinCode,
  verifyPassword,
  getAccountPrisma,
  findAccountIdByIdentifier,
  deleteAccountDatabase,
  productInput,
  supplyInput,
  waxInventoryInput,
  scentProfileInput,
  employeeInput,
  saleInput,
  recipeInput,
  ingredientInput,
  batchLogCreateInput,
  batchLogUpdateInput,
  moldCreateInput,
  moldUpdateInput,
  banAppealCreateInput,
  banAppealMessageInput,
  banAppealStatusInput,
  banAppealEvidenceInput,
  useStockInput,
  saleEmployeeUpdateInput,
  authRegisterInput,
  authLoginInput,
  authRequestAccessInput,
  authCreateUserInput,
  superAdminLoginInput,
  superAdminDbRowUpdateInput,
  superAdminDbRowDeleteInput,
  billingTierInput,
  superAdminAccountTierInput,
  billingCheckoutInput,
  billingPayPalOrderInput,
  billingPayPalCaptureInput,
  accountBillingProfileInput,
  billingConfigInput,
  teamRoleCreateInput,
  teamRolePermissionsInput,
  storefrontUpdateInput,
  storefrontImageUploadInput,
  storefrontFontUploadInput,
  publicStoreContactInput,
  storeCustomerRegisterInput,
  storeCustomerLoginInput,
  storeCustomerProfileInput,
  storeCustomerAddressInput,
  storeOrderCreateInput,
  storeOrderSquarePaymentInput,
  storeOrderPayPalInput,
  storefrontOrderUpdateInput,
  contactMessageReadInput,
  contactMessageWorkflowInput,
  accountStateInput,
  readBearerToken,
  getSuperAdminSession,
  requireSuperAdmin,
  isSafeIdentifier,
  quoteIdentifier,
  getSuperAdminTargetDb,
  getDbTableNames,
  getTableInfo,
  getAuthContextFromToken,
  normalizeRoleName,
  getRolePermissionMap,
  requireFeatureEdit,
  normalizeBatchLogRow,
  normalizeMoldRow,
  randomUUID,
  randomBytes,
};

function limitPublicWrites(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const now = Date.now();
  // Use the socket address here: forwarded headers are not trustworthy until a proxy is explicitly configured.
  const clientIp = String(req.socket.remoteAddress || req.ip || 'unknown');
  const key = clientIp;
  const bucket = publicWriteRateBuckets.get(key) || { count: 0, resetAt: now + PUBLIC_WRITE_WINDOW_MS };
  if (now >= bucket.resetAt) { bucket.count = 0; bucket.resetAt = now + PUBLIC_WRITE_WINDOW_MS; }
  bucket.count += 1;
  publicWriteRateBuckets.set(key, bucket);
  if (bucket.count > PUBLIC_WRITE_MAX_REQUESTS) {
    res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }
  next();
}

registerPaymentWebhookRoutes(app, routeContext);
app.use(express.json({ limit: '8mb' }));
app.use('/store-media', express.static(STOREFRONT_MEDIA_ROOT));
app.use('/store-fonts', express.static(STOREFRONT_FONT_ROOT));
app.use('/api/public', limitPublicWrites);
registerPublicRoutes(app, routeContext);
registerSuperAdminRoutes(app, routeContext);

app.use('/api', async (req, res, next) => {
  const clientIp = getClientIp(req);
  if (clientIp && req.path !== '/health') {
    try {
      const bannedRows = await masterPrisma.$queryRaw`
        SELECT "reason"
        FROM "IpBan"
        WHERE "ip_address" = ${clientIp}
          AND "active" = ${1}
        LIMIT 1
      `;
      if (bannedRows[0]) {
        res.status(403).json({
          error: bannedRows[0].reason
            ? `IP access blocked: ${bannedRows[0].reason}`
            : 'IP access blocked',
        });
        return;
      }
    } catch (e) {
      next(e);
      return;
    }
  }

  const openPaths = new Set([
    '/health',
    '/appeals',
    '/auth/bootstrap-status',
    '/auth/register',
    '/auth/login',
    '/auth/request-access',
    '/superadmin/login',
  ]);
  if (
    openPaths.has(req.path) ||
    req.path.startsWith('/appeals/') ||
    req.path.startsWith('/superadmin/') ||
    req.path.startsWith('/public/')
  ) {
    next();
    return;
  }

  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const auth = await getAuthContextFromToken(token);
    if (auth?.blocked) {
      res.status(403).json({ error: auth.reason || 'Account access is blocked' });
      return;
    }
    if (!auth) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }
    req.auth = auth;
    const accountPrisma = await getAccountPrisma(auth.account_id);
    accountDbContext.run(accountPrisma, () => next());
  } catch (e) {
    next(e);
  }
});

registerProtectedRoutes(app, routeContext);

app.use((err, _req, res, _next) => {
  const status = Number(err.status) || 500;
  const message = status === 413 ? 'Request body is too large.' : status === 500 ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
});

initDatabase(masterPrisma)
  .then(() => {
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });


