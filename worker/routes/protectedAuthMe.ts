import { resolveAuthContext } from '../lib/auth';
import { createD1Repository } from '../lib/d1';

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export async function handleProtectedAuthMeRequest(request: Request, db: D1Database | undefined): Promise<Response | null> {
  if (!db || request.method !== 'GET' || new URL(request.url).pathname !== '/api/auth/me') return null;
  const auth = await resolveAuthContext(db, request);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });
  let joinCode = auth.joinCode || '';
  if (!joinCode) {
    joinCode = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    await createD1Repository(db).run('UPDATE Account SET join_code = ? WHERE id = ? AND join_code = ?', [joinCode, auth.accountId, '']);
  }
  return json({
    user_id: auth.userId,
    account_id: auth.accountId,
    account_name: auth.accountName,
    plan_tier: auth.planTier || 'free',
    join_code: joinCode,
    email: auth.email,
    username: auth.username,
    role: auth.role,
    expires_at: auth.expiresAt,
  });
}
