import { AlertCircle } from 'lucide-react';
import type { AccountRow, AccountUserIpRow } from './types';

type Props = {
  accounts: AccountRow[];
  beginBlockAction: (accountId: string, action: 'ban' | 'disable') => void;
  deleteAccount: (accountId: string) => Promise<void>;
  setAccountTier: (accountId: string, tier: AccountRow['plan_tier']) => Promise<void>;
  selectedAccountId: string;
  setAccountState: (
    accountId: string,
    type: 'ban' | 'disable',
    value: boolean,
    reason?: string,
    evidenceNote?: string,
    evidenceImagesData?: string[]
  ) => Promise<void>;
  setSelectedAccountId: React.Dispatch<React.SetStateAction<string>>;
  users: AccountUserIpRow[];
};

export default function AccountsPanel({
  accounts,
  beginBlockAction,
  deleteAccount,
  setAccountTier,
  selectedAccountId,
  setAccountState,
  setSelectedAccountId,
  users,
}: Props) {
  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">All Accounts</h2>
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Account</th>
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Tier</th>
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Status</th>
              <th className="text-right py-2 px-2 text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-b border-gray-100">
                <td className="py-2 px-2 text-sm text-gray-700">
                  <button
                    type="button"
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`inline-flex items-center gap-1 underline ${selectedAccountId === account.id ? 'font-semibold' : ''}`}
                  >
                    {account.name}
                    {account.is_banned && Number(account.active_appeal_count || 0) > 0 && (
                      <span
                        className="inline-flex items-center text-green-600"
                        title={`Banned account with ${Number(account.active_appeal_count || 0)} active appeal(s)`}
                      >
                        <AlertCircle className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                </td>
                <td className="py-2 px-2 text-sm text-gray-700">
                  <select
                    value={account.plan_tier}
                    onChange={(event) =>
                      void setAccountTier(account.id, event.target.value as AccountRow['plan_tier'])
                    }
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="standard">Standard</option>
                    <option value="pro">Pro</option>
                    <option value="elite">Elite</option>
                  </select>
                </td>
                <td className="py-2 px-2 text-sm text-gray-700">
                  {account.is_banned
                    ? `banned${account.ban_reason ? `: ${account.ban_reason}` : ''}`
                    : account.access_disabled
                      ? `disabled${account.disable_reason ? `: ${account.disable_reason}` : ''}`
                      : 'active'}
                </td>
                <td className="py-2 px-2 text-sm text-right">
                  <button
                    type="button"
                    onClick={() =>
                      account.is_banned
                        ? void setAccountState(account.id, 'ban', false)
                        : beginBlockAction(account.id, 'ban')
                    }
                    className="px-2 py-1 rounded border border-red-300 text-red-700 mr-2"
                  >
                    {account.is_banned ? 'Unban' : 'Ban'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      account.access_disabled
                        ? void setAccountState(account.id, 'disable', false)
                        : beginBlockAction(account.id, 'disable')
                    }
                    className="px-2 py-1 rounded border border-amber-300 text-amber-700"
                  >
                    {account.access_disabled ? 'Enable' : 'Disable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteAccount(account.id)}
                    className="px-2 py-1 rounded border border-red-400 text-red-800 ml-2"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 overflow-x-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Account Users (Email, Username, IP)</h2>
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Email</th>
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Username</th>
              <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={`${user.email}-${index}`} className="border-b border-gray-100">
                <td className="py-2 px-2 text-sm text-gray-700">{user.email}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{user.username}</td>
                <td className="py-2 px-2 text-sm text-gray-700">{user.ip_address}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-sm text-gray-500">
                  No users found for selected account.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
