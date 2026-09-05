import { useEffect, useState } from 'react';
import { AUTH_TOKEN_STORAGE_KEY, localDb, type AuthUser } from '../lib/localDb';

type Props = {
  onAuthenticated: (user: AuthUser) => void;
};

export default function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register' | 'join'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [accountName, setAccountName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await localDb.getAuthBootstrapStatus();
        if (!cancelled && !status.has_accounts) {
          setMode('register');
          setHint('No account exists yet. Create your first account.');
        }
      } catch {
        // Ignore bootstrap status errors.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'join') {
        await localDb.requestTeamAccess({
          account_name: accountName.trim(),
          join_code: joinCode.trim(),
          name: fullName.trim(),
          email: email.trim(),
          password,
          password_confirm: passwordConfirm,
        });
        setHint('Join request submitted. Wait for admin approval, then sign in.');
        setError('');
      } else {
        const result =
          mode === 'register'
            ? await localDb.registerAccount({
                name: fullName.trim(),
                email: email.trim(),
                password,
                password_confirm: passwordConfirm,
              })
            : await localDb.login({
                identifier: loginIdentifier.trim(),
                password,
              });
        window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.token);
        onAuthenticated(result.user);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      const status = Number((err as { status?: number })?.status || 0);
      if (mode === 'login' && status === 403) {
        const lower = message.toLowerCase();
        const blockType = lower.includes('ban') ? 'banned' : 'disabled';
        const blockedUrl = `/blocked?type=${encodeURIComponent(blockType)}&identifier=${encodeURIComponent(loginIdentifier.trim())}&reason=${encodeURIComponent(message)}`;
        window.history.replaceState({}, '', blockedUrl);
        window.location.reload();
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen app-theme flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-800">Candle Business Manager</h1>
        <p className="text-sm text-gray-600 mt-1">
          {mode === 'login'
            ? 'Sign in to your account'
            : mode === 'register'
              ? 'Create a new account'
              : 'Request to join a team'}
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode !== 'login' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                autoComplete="name"
                required
              />
            </div>
          )}
          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Team account name"
                autoComplete="organization"
                required
              />
            </div>
          )}
          {mode === 'login' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email or Account Name</label>
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                autoComplete="username"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                autoComplete="email"
                required
              />
            </div>
          )}
          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Join Team Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter team code"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>
          {mode !== 'login' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                minLength={6}
                autoComplete="new-password"
                required
              />
            </div>
          )}
          {hint && <p className="text-sm text-blue-600">{hint}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign In'
                : mode === 'register'
                  ? 'Create Account'
                  : 'Request Access'}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`${mode === 'login' ? 'text-indigo-800 font-semibold' : 'text-indigo-700'} hover:text-indigo-800`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`${mode === 'register' ? 'text-indigo-800 font-semibold' : 'text-indigo-700'} hover:text-indigo-800`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`${mode === 'join' ? 'text-indigo-800 font-semibold' : 'text-indigo-700'} hover:text-indigo-800`}
          >
            Join Team
          </button>
        </div>
      </div>
    </div>
  );
}
