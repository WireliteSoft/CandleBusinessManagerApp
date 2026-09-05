import { useState } from 'react';
import { localDb } from '../lib/localDb';

type Props = {
  initialIdentifier?: string;
  initialReason?: string;
};

export default function BanAppealPage({ initialIdentifier = '', initialReason = '' }: Props) {
  const [accountIdentifier, setAccountIdentifier] = useState(initialIdentifier);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState(initialReason);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successTicket, setSuccessTicket] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessTicket('');
    setLoading(true);
    try {
      const identifier = accountIdentifier.trim();
      const formattedMessage = `Appeal reason: ${reason.trim()}\n${details.trim()}`;
      const existing = await localDb.getOpenAppealByIdentifier(identifier);
      if (existing.exists && existing.ticket_id && existing.access_key) {
        if (details.trim()) {
          await localDb.sendAppealMessage(existing.ticket_id, existing.access_key, formattedMessage);
        }
        const existingUrl = `/appeal-chat?ticket=${encodeURIComponent(existing.ticket_id)}&key=${encodeURIComponent(existing.access_key)}`;
        window.history.replaceState({}, '', existingUrl);
        window.location.reload();
        return;
      }
      const result = await localDb.submitBanAppeal({
        account_identifier: identifier,
        email: email.trim() || undefined,
        name: name.trim(),
        reason: reason.trim(),
        details: details.trim(),
      });
      setSuccessTicket(result.ticket_id);
      const chatUrl = `/appeal-chat?ticket=${encodeURIComponent(result.ticket_id)}&key=${encodeURIComponent(result.access_key)}`;
      window.history.replaceState({}, '', chatUrl);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit appeal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen app-theme flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-800">Ban Appeal Ticket</h1>
        <p className="text-sm text-gray-600 mt-2">
          Submit an appeal request and support will review your account.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email or Account Name</label>
            <input
              type="text"
              value={accountIdentifier}
              onChange={(e) => setAccountIdentifier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Appeal Details</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[120px]"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {successTicket && (
            <p className="text-sm text-green-700">
              Appeal submitted. Ticket ID: <span className="font-semibold">{successTicket}</span>
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70"
            >
              {loading ? 'Submitting...' : 'Submit Appeal'}
            </button>
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
        </form>
      </div>
    </div>
  );
}
