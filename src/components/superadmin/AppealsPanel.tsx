import type { AppealMessageRow, AppealTicketRow } from './types';

type Props = {
  appealMessages: AppealMessageRow[];
  appealReply: string;
  appeals: AppealTicketRow[];
  selectedAccountId: string;
  selectedAppeal: AppealTicketRow | null;
  selectedAppealId: string;
  sendAppealReply: () => Promise<void>;
  setAppealReply: React.Dispatch<React.SetStateAction<string>>;
  setSelectedAppealId: React.Dispatch<React.SetStateAction<string>>;
  updateAppealStatus: (status: AppealTicketRow['status']) => Promise<void>;
};

export default function AppealsPanel({
  appealMessages,
  appealReply,
  appeals,
  selectedAccountId,
  selectedAppeal,
  selectedAppealId,
  sendAppealReply,
  setAppealReply,
  setSelectedAppealId,
  updateAppealStatus,
}: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mt-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        Ban Appeal Tickets (Selected Account Only)
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {!selectedAccountId && (
              <p className="text-sm text-gray-500 p-3">Select an account to view its appeal tickets.</p>
            )}
            {appeals.map((appeal) => (
              <button
                key={appeal.id}
                type="button"
                onClick={() => setSelectedAppealId(appeal.id)}
                className={`w-full text-left px-3 py-3 border-b border-gray-100 ${
                  selectedAppealId === appeal.id ? 'bg-indigo-50' : 'bg-white'
                }`}
              >
                <p className="text-sm font-semibold text-gray-800">{appeal.account_identifier}</p>
                <p className="text-xs text-gray-600">{appeal.reason}</p>
                <p className="text-xs text-gray-500 mt-1">Status: {appeal.status}</p>
              </button>
            ))}
            {appeals.length === 0 && <p className="text-sm text-gray-500 p-3">No appeal tickets yet.</p>}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-3">
          {!selectedAppeal ? (
            <p className="text-sm text-gray-500">Select an appeal ticket to view chat.</p>
          ) : (
            <>
              <p className="text-sm text-gray-800">
                <span className="font-semibold">Account:</span> {selectedAppeal.account_identifier}
              </p>
              <p className="text-sm text-gray-800">
                <span className="font-semibold">Appeal:</span> {selectedAppeal.details}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <label className="text-sm text-gray-700">Status</label>
                <select
                  value={selectedAppeal.status}
                  onChange={(e) => void updateAppealStatus(e.target.value as AppealTicketRow['status'])}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="open">open</option>
                  <option value="in_review">in_review</option>
                  <option value="resolved">resolved</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
              <div className="mt-3 border border-gray-200 rounded-lg p-2 bg-gray-50">
                <p className="text-sm font-semibold text-gray-800 mb-1">Ban Evidence</p>
                {selectedAppeal.ban_reason && (
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Ban reason:</span> {selectedAppeal.ban_reason}
                  </p>
                )}
                {selectedAppeal.ban_evidence_note && (
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-semibold">Evidence note:</span> {selectedAppeal.ban_evidence_note}
                  </p>
                )}
                {selectedAppeal.ban_evidence_images_data && selectedAppeal.ban_evidence_images_data.length > 0 ? (
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {selectedAppeal.ban_evidence_images_data.map((image, idx) => (
                      <img
                        key={`${idx}`}
                        src={image}
                        alt={`Ban evidence ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded border border-gray-300"
                      />
                    ))}
                  </div>
                ) : selectedAppeal.ban_evidence_image_data ? (
                  <img
                    src={selectedAppeal.ban_evidence_image_data}
                    alt="Ban evidence"
                    className="mt-2 max-h-32 rounded border border-gray-300"
                  />
                ) : !selectedAppeal.ban_evidence_note ? (
                  <p className="text-sm text-gray-500">No extra ban evidence saved on the ban action.</p>
                ) : null}
              </div>
              <div className="mt-3 border border-gray-200 rounded-lg p-2 h-56 overflow-y-auto bg-gray-50">
                {appealMessages.map((item) => (
                  <div key={item.id} className="mb-2">
                    <p className="text-xs text-gray-500">
                      {item.sender_type === 'admin' ? 'Admin' : 'User'} •{' '}
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-800">{item.message}</p>
                  </div>
                ))}
                {appealMessages.length === 0 && <p className="text-sm text-gray-500">No messages yet.</p>}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={appealReply}
                  onChange={(e) => setAppealReply(e.target.value)}
                  placeholder="Reply to user..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => void sendAppealReply()}
                  className="px-3 py-2 rounded bg-indigo-700 text-white text-sm"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
