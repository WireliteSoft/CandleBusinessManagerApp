export function readBearerToken(req) {
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export async function getSuperAdminSession(masterPrisma, token) {
  if (!token) return null;
  const nowIso = new Date().toISOString();
  const rows = await masterPrisma.$queryRaw`
    SELECT "id", "token", "expires_at"
    FROM "SuperAdminSession"
    WHERE "token" = ${token}
      AND "expires_at" > ${nowIso}
    LIMIT 1
  `;
  return rows[0] || null;
}

export function createRequireSuperAdmin(masterPrisma) {
  return async function requireSuperAdmin(req, res, next) {
    try {
      const token = readBearerToken(req);
      const session = await getSuperAdminSession(masterPrisma, token);
      if (!session) {
        res.status(401).json({ error: 'Super admin unauthorized' });
        return;
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

export function isSafeIdentifier(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(name || ''));
}

export function quoteIdentifier(name) {
  const value = String(name || '');
  if (!isSafeIdentifier(value)) {
    throw new Error('Invalid identifier');
  }
  return `"${value}"`;
}

export function createSuperAdminDbHelpers(masterPrisma, getAccountPrisma) {
  async function getSuperAdminTargetDb(accountIdRaw) {
    const accountId = String(accountIdRaw || '').trim();
    if (!accountId) {
      return {
        db: masterPrisma,
        source: 'master',
        accountId: '',
      };
    }
    const accountRows = await masterPrisma.$queryRaw`
      SELECT "id" FROM "Account" WHERE "id" = ${accountId} LIMIT 1
    `;
    if (!accountRows[0]?.id) {
      const error = new Error('Account not found');
      error.status = 404;
      throw error;
    }
    const db = await getAccountPrisma(accountId);
    return {
      db,
      source: 'account',
      accountId,
    };
  }

  async function getDbTableNames(db) {
    const rows = await db.$queryRawUnsafe(`
      SELECT "name"
      FROM "sqlite_master"
      WHERE "type" = 'table'
        AND "name" NOT LIKE 'sqlite_%'
      ORDER BY "name" ASC
    `);
    return rows
      .map((row) => String(row.name || ''))
      .filter((name) => isSafeIdentifier(name));
  }

  async function getTableInfo(db, tableName) {
    const safeTable = quoteIdentifier(tableName);
    const rows = await db.$queryRawUnsafe(`PRAGMA table_info(${safeTable})`);
    const columns = rows.map((row) => String(row.name || '')).filter((name) => isSafeIdentifier(name));
    const pkColumns = rows
      .filter((row) => Number(row.pk || 0) > 0)
      .sort((a, b) => Number(a.pk || 0) - Number(b.pk || 0))
      .map((row) => String(row.name || ''))
      .filter((name) => isSafeIdentifier(name));
    return { columns, pkColumns };
  }

  return {
    getSuperAdminTargetDb,
    getDbTableNames,
    getTableInfo,
  };
}
