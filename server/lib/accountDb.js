import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

export function createAccountDbHelpers({
  accountDbRoot,
  accountPrismaCache,
  masterPrisma,
  initDatabase,
}) {
  function getAccountDbPath(accountId) {
    return path.join(accountDbRoot, `${accountId}.db`);
  }

  function toSqliteUrl(filePath) {
    return `file:${filePath.replace(/\\/g, '/')}`;
  }

  async function getAccountPrisma(accountId) {
    if (accountPrismaCache.has(accountId)) {
      return accountPrismaCache.get(accountId);
    }

    const accountDbPath = getAccountDbPath(accountId);
    const accountPrisma = new PrismaClient({
      datasources: {
        db: { url: toSqliteUrl(accountDbPath) },
      },
    });
    await initDatabase(accountPrisma);
    accountPrismaCache.set(accountId, accountPrisma);
    return accountPrisma;
  }

  async function findAccountIdByIdentifier(identifierRaw) {
    const identifier = String(identifierRaw || '').trim().toLowerCase();
    if (!identifier) return null;
    const byNameRows = await masterPrisma.$queryRaw`
      SELECT "id"
      FROM "Account"
      WHERE lower("name") = ${identifier}
      LIMIT 1
    `;
    if (byNameRows[0]?.id) return byNameRows[0].id;
    const byUserRows = await masterPrisma.$queryRaw`
      SELECT a."id"
      FROM "Account" a
      JOIN "AccountUser" u ON u."account_id" = a."id"
      WHERE lower(u."email") = ${identifier}
         OR lower(u."username") = ${identifier}
      LIMIT 1
    `;
    return byUserRows[0]?.id || null;
  }

  async function deleteAccountDatabase(accountId) {
    const existing = accountPrismaCache.get(accountId);
    if (existing) {
      try {
        await existing.$disconnect();
      } catch {
        // ignore disconnect errors
      }
      accountPrismaCache.delete(accountId);
    }
    const dbPath = getAccountDbPath(accountId);
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { force: true });
    }
  }

  return {
    getAccountDbPath,
    toSqliteUrl,
    getAccountPrisma,
    findAccountIdByIdentifier,
    deleteAccountDatabase,
  };
}
