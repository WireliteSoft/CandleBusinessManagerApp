import { createD1Repository } from './d1';

export interface AuthContext {
  userId: string;
  accountId: string;
  role: string;
  email: string;
  username: string;
  accountName: string;
  joinCode: string;
  planTier: string;
  expiresAt: string;
}

export function readBearerToken(request: Request) {
  const value = request.headers.get('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

export async function resolveAuthContext(db: D1Database | undefined, request: Request): Promise<AuthContext | null> {
  const token = readBearerToken(request);
  if (!db || !token) return null;
  return createD1Repository(db).first<AuthContext>(
    `SELECT u.id AS userId, u.account_id AS accountId, u.role, u.email, COALESCE(u.name, u.username) AS username,
       a.name AS accountName, a.join_code AS joinCode, a.plan_tier AS planTier, s.expires_at AS expiresAt
     FROM AuthSession s JOIN AccountUser u ON u.id = s.account_user_id
     JOIN Account a ON a.id = u.account_id
     WHERE s.token = ? AND s.expires_at > ? AND u.active = 1
       AND a.is_banned = 0 AND a.access_disabled = 0 LIMIT 1`,
    [token, new Date().toISOString()],
  );
}

export async function canEditFeature(db: D1Database, auth: AuthContext, featureKey: string) {
  if (auth.role.toLowerCase() === 'owner') return true;
  const permission = await createD1Repository(db).first<{ enabled: number }>(
    `SELECT enabled FROM AccountRolePermission
     WHERE account_id = ? AND role_name = ? AND feature_key = ? LIMIT 1`,
    [auth.accountId, auth.role, featureKey],
  );
  return permission ? Boolean(permission.enabled) : ['admin', 'member'].includes(auth.role.toLowerCase());
}
