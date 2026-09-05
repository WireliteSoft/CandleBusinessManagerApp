export function createAuthzHelpers({ masterPrisma, TEAM_FEATURE_KEYS, generateJoinCode }) {
  async function getAuthContextFromToken(token) {
    if (!token) return null;
    const nowIso = new Date().toISOString();
    const rows = await masterPrisma.$queryRaw`
      SELECT
        s."id" as session_id,
        s."account_user_id",
        s."expires_at",
        u."id" as user_id,
        u."account_id",
        u."name",
        u."email",
        u."username",
        u."role",
        u."active",
        a."name" as account_name,
        a."plan_tier" as plan_tier,
        a."join_code" as join_code
        ,a."is_banned" as is_banned
        ,a."access_disabled" as access_disabled
        ,a."ban_reason" as ban_reason
        ,a."disable_reason" as disable_reason
      FROM "AuthSession" s
      JOIN "AccountUser" u ON u."id" = s."account_user_id"
      JOIN "Account" a ON a."id" = u."account_id"
      WHERE s."token" = ${token}
        AND s."expires_at" > ${nowIso}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || !Boolean(row.active)) return null;
    if (Boolean(row.is_banned) || Boolean(row.access_disabled)) {
      const bannedReason = row.ban_reason ? `Account is banned: ${row.ban_reason}` : 'Account is banned';
      const disabledReason = row.disable_reason
        ? `Account access is disabled: ${row.disable_reason}`
        : 'Account access is disabled';
      return {
        blocked: true,
        reason: Boolean(row.is_banned) ? bannedReason : disabledReason,
      };
    }
    return {
      session_id: row.session_id,
      user_id: row.user_id,
      account_id: row.account_id,
      username: row.name || row.username,
      email: row.email || '',
      role: row.role,
      account_name: row.account_name,
      plan_tier: row.plan_tier || 'free',
      join_code: row.join_code || '',
      is_banned: Boolean(row.is_banned),
      access_disabled: Boolean(row.access_disabled),
      expires_at: row.expires_at,
    };
  }

  function normalizeRoleName(role) {
    return String(role || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  async function getRolePermissionMap(accountId, roleName) {
    const normalizedRole = normalizeRoleName(roleName);
    const defaults = Object.fromEntries(TEAM_FEATURE_KEYS.map((key) => [key, true]));
    if (normalizedRole === 'owner') return defaults;
    const rows = await masterPrisma.$queryRaw`
      SELECT "feature_key", "enabled"
      FROM "AccountRolePermission"
      WHERE "account_id" = ${accountId}
        AND "role_name" = ${normalizedRole}
    `;
    if (!rows.length) {
      if (normalizedRole === 'admin' || normalizedRole === 'member') return defaults;
      return Object.fromEntries(TEAM_FEATURE_KEYS.map((key) => [key, false]));
    }
    const map = { ...defaults };
    rows.forEach((row) => {
      if (TEAM_FEATURE_KEYS.includes(row.feature_key)) {
        map[row.feature_key] = Boolean(row.enabled);
      }
    });
    return map;
  }

  function requireFeatureEdit(featureKey) {
    return async (req, res, next) => {
      try {
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
          next();
          return;
        }
        const auth = req.auth;
        if (!auth || auth.blocked) {
          const error = new Error('Unauthorized');
          error.status = 401;
          throw error;
        }
        if (normalizeRoleName(auth.role) === 'owner') {
          next();
          return;
        }
        const permissions = await getRolePermissionMap(auth.account_id, auth.role);
        if (permissions[featureKey] ?? true) {
          next();
          return;
        }
        const error = new Error('View-only role: edit access denied');
        error.status = 403;
        throw error;
      } catch (e) {
        next(e);
      }
    };
  }

  return {
    getAuthContextFromToken,
    normalizeRoleName,
    getRolePermissionMap,
    requireFeatureEdit,
    generateJoinCode,
  };
}
