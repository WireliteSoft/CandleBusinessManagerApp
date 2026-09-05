import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AUTH_TOKEN_STORAGE_KEY,
  localDb,
  type BanAppealMessage,
  type BanAppealTicket,
} from '../lib/localDb';

type Props = {
  ticketId: string;
  accessKey: string;
};

export default function BanAppealChatPage({ ticketId, accessKey }: Props) {
  const [ticket, setTicket] = useState<BanAppealTicket | null>(null);
  const [messages, setMessages] = useState<BanAppealMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const autoLoginStartedRef = useRef(false);

  const loadChat = useCallback(async () => {
    const result = await localDb.getAppealChat(ticketId, accessKey);
    setTicket(result.ticket);
    setMessages(result.messages);
  }, [ticketId, accessKey]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        await loadChat();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load appeal chat');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    const interval = window.setInterval(() => {
      void loadChat().catch(() => {});
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadChat]);

  useEffect(() => {
    if (ticket?.status !== 'resolved') return;
    if (autoLoginStartedRef.current) return;
    autoLoginStartedRef.current = true;
    setCountdown(5);

    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    const timeout = window.setTimeout(async () => {
      try {
        const result = await localDb.claimAppealAutoLogin(ticketId, accessKey);
        window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.token);
        window.history.replaceState({}, '', '/');
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auto-login failed');
      }
    }, 5000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [ticket?.status, ticketId, accessKey]);

  async function send() {
    if (!message.trim()) return;
    try {
      await localDb.sendAppealMessage(ticketId, accessKey, message.trim());
      setMessage('');
      await loadChat();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }

  return (
    <div className="min-h-screen app-theme flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-800">Ban Appeal Chat</h1>
        {loading ? (
          <p className="text-sm text-gray-600 mt-3">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-600 mt-3">{error}</p>
        ) : (
          <>
            {ticket?.status === 'resolved' && (
              <p className="text-lg font-semibold text-green-700 mt-3">
                Your account has been unbanned. Logging you in automatically
                {typeof countdown === 'number' ? ` in ${countdown}s...` : '...'}
              </p>
            )}
            <div className="mt-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
              <p><span className="font-semibold">Ticket:</span> {ticket?.id}</p>
              <p><span className="font-semibold">Status:</span> {ticket?.status}</p>
              <p><span className="font-semibold">Reason:</span> {ticket?.reason}</p>
            </div>
            <div className="mt-3 border border-gray-200 rounded-lg p-3 h-80 overflow-y-auto bg-gray-50">
              {messages.map((entry) => (
                <div key={entry.id} className="mb-3">
                  <p className="text-xs text-gray-500">
                    {entry.sender_type === 'admin' ? 'Admin' : 'You'} • {new Date(entry.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-800">{entry.message}</p>
                </div>
              ))}
              {messages.length === 0 && <p className="text-sm text-gray-500">No messages yet.</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                disabled={ticket?.status === 'resolved' || ticket?.status === 'rejected'}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!message.trim() || ticket?.status === 'resolved' || ticket?.status === 'rejected'}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
