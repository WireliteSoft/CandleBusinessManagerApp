import { localDb } from '../lib/localDb';

type Props = {
  reason: string;
  type?: string;
  identifier?: string;
};

export default function BlockedAccessPage({ reason, type, identifier = '' }: Props) {
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@candles.local';
  const normalizedType = (type || '').toLowerCase();
  const isBanned = normalizedType === 'banned' || reason.toLowerCase().includes('ban');
  const title = isBanned ? 'Account Banned' : 'Account Access Disabled';
  const subtitle = isBanned
    ? 'This account has been banned and cannot sign in.'
    : 'This account is disabled and cannot sign in right now.';

  return (
    <div className="min-h-screen app-theme flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="text-sm text-gray-600 mt-2">{subtitle}</p>

        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Reason</p>
          <p className="text-sm text-red-700 mt-1">{reason || 'Account access is restricted.'}</p>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-800">Contact Support</p>
          <p className="text-sm text-gray-700 mt-1">
            Please contact support and include your account email and this reason.
          </p>
          <p className="text-sm text-gray-700 mt-2">
            Email: <a href={`mailto:${supportEmail}`} className="underline">{supportEmail}</a>
          </p>
        </div>

        <div className="mt-5">
          {isBanned && (
            <>
              <button
                type="button"
                onClick={async () => {
                  const id = identifier.trim();
                  if (id) {
                    try {
                      const existing = await localDb.getOpenAppealByIdentifier(id);
                      if (existing.exists && existing.ticket_id && existing.access_key) {
                        const chatUrl = `/appeal-chat?ticket=${encodeURIComponent(existing.ticket_id)}&key=${encodeURIComponent(existing.access_key)}`;
                        window.history.replaceState({}, '', chatUrl);
                        window.location.reload();
                        return;
                      }
                    } catch {
                      // fall through to create page
                    }
                  }
                  const appealUrl = `/appeal?identifier=${encodeURIComponent(identifier)}&reason=${encodeURIComponent(reason)}`;
                  window.history.replaceState({}, '', appealUrl);
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm mr-2"
              >
                Open Appeal Chat
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              window.history.replaceState({}, '', '/');
              window.location.reload();
            }}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
          >
            Back To Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
