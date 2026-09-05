import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import {
  localDb,
  type AccountUserRecord,
  type AuthUser,
  type JoinRequestRecord,
  type TeamRoleRecord,
} from '../lib/localDb';

type Props = {
  me: AuthUser;
  readOnly?: boolean;
};

export default function AccountAccess({ me, readOnly = false }: Props) {
  const [users, setUsers] = useState<AccountUserRecord[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestRecord[]>([]);
  const [joinCode, setJoinCode] = useState(me.join_code || '');
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [roleOptions, setRoleOptions] = useState<string[]>(['member', 'admin']);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  const canManageUsers = me.role === 'owner' || me.role === 'admin';

  useEffect(() => {
    setJoinCode(me.join_code || '');
  }, [me.join_code]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rows, requests, roles] = await Promise.all([
          localDb.getAccountUsers(),
          canManageUsers ? localDb.getJoinRequests() : Promise.resolve([]),
          canManageUsers ? localDb.getTeamRoles() : Promise.resolve([] as TeamRoleRecord[]),
        ]);
        if (!cancelled) {
          setUsers(rows);
          setJoinRequests(requests);
          if (canManageUsers) {
            const names = roles.map((item) => item.name);
            const options = ['member', 'admin', ...names].filter(
              (name, idx, arr) => arr.indexOf(name) === idx && name !== 'owner'
            );
            setRoleOptions(options);
          }
        }
      } catch (error) {
        console.error('Failed to load account users:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManageUsers]);

  async function refreshRequests() {
    if (!canManageUsers) return;
    try {
      setJoinRequests(await localDb.getJoinRequests());
    } catch (error) {
      console.error('Failed to refresh join requests:', error);
    }
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageUsers || readOnly) return;
    setSaving(true);
    try {
      const created = await localDb.createAccountUser({
        name: name.trim(),
        email: username.trim(),
        password,
        role,
      });
      setUsers((prev) => [...prev, created]);
      setName('');
      setUsername('');
      setPassword('');
      setRole('member');
    } catch (error) {
      console.error('Failed to add account user:', error);
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(id: string) {
    if (!canManageUsers || readOnly) return;
    if (!window.confirm('Remove this user from account access?')) return;
    const previous = users;
    setUsers((prev) => prev.filter((user) => user.id !== id));
    try {
      await localDb.deleteAccountUser(id);
    } catch (error) {
      console.error('Failed to remove user:', error);
      setUsers(previous);
    }
  }

  async function approveRequest(id: string) {
    if (readOnly) return;
    try {
      await localDb.approveJoinRequest(id);
      setUsers(await localDb.getAccountUsers());
      await refreshRequests();
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  }

  async function rejectRequest(id: string) {
    if (readOnly) return;
    try {
      await localDb.rejectJoinRequest(id);
      await refreshRequests();
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  }

  async function regenerateJoinCode() {
    if (readOnly) return;
    try {
      const result = await localDb.regenerateJoinCode();
      setJoinCode(result.join_code);
    } catch (error) {
      console.error('Failed to regenerate join code:', error);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <KeyRound className="w-6 h-6 text-violet-600" />
        <h2 className="text-2xl font-bold text-gray-800">Account Access</h2>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Account</h3>
        <p className="text-sm text-gray-600 mt-1">
          <strong>{me.account_name}</strong> - signed in as <strong>{me.username}</strong> ({me.role})
        </p>
        {canManageUsers && (
          <div className="mt-4 rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-800">Join Team Code</p>
            <p className="text-sm text-gray-600 mt-1">
              Share this code with teammates. They request access from the login page.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="px-3 py-2 rounded border border-gray-300 text-base">{joinCode || '-'}</code>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(joinCode || '')}
                className="px-3 py-2 text-sm rounded border border-gray-300"
              >
                Copy
              </button>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => void regenerateJoinCode()}
                className="px-3 py-2 text-sm rounded border border-violet-300 text-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>

      {canManageUsers && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Account User</h3>
          <form onSubmit={addUser} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Email"
              className="px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="px-3 py-2 border border-gray-300 rounded-lg"
              minLength={6}
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              {roleOptions.map((roleName) => (
                <option key={roleName} value={roleName}>
                  {roleName}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving || readOnly}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? 'Adding...' : 'Add User'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Users With Access</h3>
        {loading ? (
          <p className="text-sm text-gray-500">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Role</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-right py-2 px-2 text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100">
                    <td className="py-2 px-2 text-sm text-gray-700">{user.name || user.username}</td>
                    <td className="py-2 px-2 text-sm text-gray-700">{user.email || '-'}</td>
                    <td className="py-2 px-2 text-sm text-gray-700">{user.role}</td>
                    <td className="py-2 px-2 text-sm text-gray-700">{user.active ? 'active' : 'inactive'}</td>
                    <td className="py-2 px-2 text-sm text-right">
                      {canManageUsers && (user.email || user.username) !== (me.email || me.username) ? (
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => void removeUser(user.id)}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {canManageUsers && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Pending Join Requests</h3>
          {joinRequests.filter((item) => item.status === 'pending').length === 0 ? (
            <p className="text-sm text-gray-500">No pending requests.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Requested Role</th>
                    <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Requested At</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {joinRequests
                    .filter((item) => item.status === 'pending')
                    .map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-2 px-2 text-sm text-gray-700">{item.name || item.username}</td>
                        <td className="py-2 px-2 text-sm text-gray-700">{item.email || '-'}</td>
                        <td className="py-2 px-2 text-sm text-gray-700">{item.requested_role}</td>
                        <td className="py-2 px-2 text-sm text-gray-700">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-sm text-right">
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => void approveRequest(item.id)}
                            className="px-3 py-1.5 rounded border border-green-300 text-green-700 mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => void rejectRequest(item.id)}
                            className="px-3 py-1.5 rounded border border-red-300 text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
