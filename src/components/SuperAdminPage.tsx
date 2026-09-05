import { useCallback, useEffect, useState } from 'react';
import AccountsPanel from './superadmin/AccountsPanel';
import { adminRequest } from './superadmin/api';
import AppealHistoryPanel from './superadmin/AppealHistoryPanel';
import AppealsPanel from './superadmin/AppealsPanel';
import BillingPanel from './superadmin/BillingPanel';
import DbExplorerPanel from './superadmin/DbExplorerPanel';
import LoginForm from './superadmin/LoginForm';
import ReasonModal from './superadmin/ReasonModal';
import { redirectToPath } from '../app/urlState';
import {
  BLOCK_REASONS,
  CUSTOM_REASON_VALUE,
  SUPERADMIN_TOKEN_STORAGE_KEY,
  type AccountRow,
  type AccountUserIpRow,
  type AppealHistoryRow,
  type AppealMessageRow,
  type AppealTicketRow,
  type BillingConfigRow,
  type DbTableRowsPayload,
  type ReasonModalState,
} from './superadmin/types';

export default function SuperAdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [users, setUsers] = useState<AccountUserIpRow[]>([]);
  const [appealHistory, setAppealHistory] = useState<AppealHistoryRow[]>([]);
  const [appeals, setAppeals] = useState<AppealTicketRow[]>([]);
  const [selectedAppealId, setSelectedAppealId] = useState('');
  const [selectedAppeal, setSelectedAppeal] = useState<AppealTicketRow | null>(null);
  const [appealMessages, setAppealMessages] = useState<AppealMessageRow[]>([]);
  const [appealReply, setAppealReply] = useState('');
  const [activeAppealCount, setActiveAppealCount] = useState(0);
  const [billingConfig, setBillingConfig] = useState<BillingConfigRow | null>(null);
  const [billingForm, setBillingForm] = useState({
    standard_monthly_usd: '5.99',
    standard_yearly_usd: '57.50',
    pro_monthly_usd: '7.99',
    pro_yearly_usd: '76.70',
    elite_monthly_usd: '14.99',
    elite_yearly_usd: '143.90',
    currency: 'USD',
  });
  const [reasonModal, setReasonModal] = useState<ReasonModalState>({
    open: false,
    accountId: '',
    action: 'ban',
    reason: BLOCK_REASONS[0],
    customReason: '',
    evidenceNote: '',
    evidenceImagesData: [],
  });
  const [error, setError] = useState('');
  const [dbAccountScope, setDbAccountScope] = useState('');
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [dbSelectedTable, setDbSelectedTable] = useState('');
  const [dbColumns, setDbColumns] = useState<string[]>([]);
  const [dbPkColumns, setDbPkColumns] = useState<string[]>([]);
  const [dbRows, setDbRows] = useState<Array<Record<string, unknown>>>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbLimit, setDbLimit] = useState('100');
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(window.localStorage.getItem(SUPERADMIN_TOKEN_STORAGE_KEY))
  );

  const loadAccounts = useCallback(async () => {
    const rows = await adminRequest<AccountRow[]>('/api/superadmin/accounts');
    setAccounts(rows);
    if (!selectedAccountId && rows[0]) setSelectedAccountId(rows[0].id);
  }, [selectedAccountId]);
  const loadAppeals = useCallback(async () => {
    if (!selectedAccountId) {
      setAppeals([]);
      setSelectedAppealId('');
      setSelectedAppeal(null);
      setAppealMessages([]);
      return;
    }
    const rows = await adminRequest<AppealTicketRow[]>(
      `/api/superadmin/appeals?account_id=${encodeURIComponent(selectedAccountId)}`
    );
    setAppeals(rows);
    if (!rows.find((row) => row.id === selectedAppealId)) {
      setSelectedAppealId(rows[0]?.id || '');
      if (!rows[0]) {
        setSelectedAppeal(null);
        setAppealMessages([]);
      }
    }
  }, [selectedAccountId, selectedAppealId]);
  const loadAppealCount = useCallback(async () => {
    const result = await adminRequest<{ count: number }>(`/api/superadmin/appeals/count`);
    setActiveAppealCount(Number(result.count || 0));
  }, []);
  const loadBillingConfig = useCallback(async () => {
    const row = await adminRequest<BillingConfigRow>('/api/superadmin/billing-config');
    setBillingConfig(row);
    setBillingForm({
      standard_monthly_usd: String(row.standard_monthly_usd),
      standard_yearly_usd: String(row.standard_yearly_usd),
      pro_monthly_usd: String(row.pro_monthly_usd),
      pro_yearly_usd: String(row.pro_yearly_usd),
      elite_monthly_usd: String(row.elite_monthly_usd),
      elite_yearly_usd: String(row.elite_yearly_usd),
      currency: row.currency || 'USD',
    });
  }, []);

  const loadDbTables = useCallback(async (scopeAccountId = dbAccountScope) => {
    const query = scopeAccountId ? `?account_id=${encodeURIComponent(scopeAccountId)}` : '';
    const payload = await adminRequest<{ tables: string[] }>(`/api/superadmin/db/tables${query}`);
    setDbTables(payload.tables || []);
    const first = payload.tables?.[0] || '';
    setDbSelectedTable((prev) => (prev && payload.tables?.includes(prev) ? prev : first));
  }, [dbAccountScope]);

  const loadDbRows = useCallback(async (table = dbSelectedTable, scopeAccountId = dbAccountScope) => {
    if (!table) {
      setDbColumns([]);
      setDbPkColumns([]);
      setDbRows([]);
      return;
    }
    setDbLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('table', table);
      query.set('limit', String(Math.max(1, Math.min(500, Number(dbLimit || 100)))));
      if (scopeAccountId) query.set('account_id', scopeAccountId);
      const payload = await adminRequest<DbTableRowsPayload>(`/api/superadmin/db/table?${query.toString()}`);
      setDbColumns(payload.columns || []);
      setDbPkColumns(payload.pk_columns || []);
      setDbRows(payload.rows || []);
    } finally {
      setDbLoading(false);
    }
  }, [dbAccountScope, dbLimit, dbSelectedTable]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadAccounts().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load accounts'));
    void loadAppealCount().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load appeal count'));
    void loadBillingConfig().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load billing config'));
    void loadDbTables().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load database tables'));
    const interval = window.setInterval(() => {
      void loadAppealCount().catch(() => {});
    }, 7000);
    return () => {
      window.clearInterval(interval);
    };
  }, [isAuthenticated, loadAccounts, loadAppealCount, loadBillingConfig, loadDbTables]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadDbTables().catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load database tables')
    );
  }, [dbAccountScope, isAuthenticated, loadDbTables]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadDbRows().catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load database rows')
    );
  }, [dbSelectedTable, dbAccountScope, dbLimit, isAuthenticated, loadDbRows]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadAppeals().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load appeals'));
  }, [isAuthenticated, selectedAccountId, loadAppeals]);

  useEffect(() => {
    if (!isAuthenticated || !selectedAccountId) return;
    void adminRequest<AccountUserIpRow[]>(`/api/superadmin/accounts/${selectedAccountId}/users`)
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users'));
    void adminRequest<AppealHistoryRow[]>(`/api/superadmin/accounts/${selectedAccountId}/appeal-history`)
      .then(setAppealHistory)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load appeal history'));
  }, [isAuthenticated, selectedAccountId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedAppealId) return;
    let cancelled = false;
    const load = async () => {
      const payload = await adminRequest<{ ticket: AppealTicketRow; messages: AppealMessageRow[] }>(
        `/api/superadmin/appeals/${selectedAppealId}/messages`
      );
      if (cancelled) return;
      setSelectedAppeal(payload.ticket);
      setAppealMessages(payload.messages);
    };
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load appeal messages'));
    const interval = window.setInterval(() => {
      void load().catch(() => {});
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, selectedAppealId]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const result = await adminRequest<{ token: string }>('/api/superadmin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      window.localStorage.setItem(SUPERADMIN_TOKEN_STORAGE_KEY, result.token);
      setIsAuthenticated(true);
      setPassword('');
      redirectToPath('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  async function setAccountState(
    accountId: string,
    type: 'ban' | 'disable',
    value: boolean,
    reason?: string,
    evidenceNote?: string,
    evidenceImagesData?: string[]
  ) {
    try {
      await adminRequest(`/api/superadmin/accounts/${accountId}/${type}`, {
        method: 'POST',
        body: JSON.stringify({
          value,
          reason,
          evidence_note: evidenceNote || '',
          evidence_images_data: evidenceImagesData || [],
          evidence_image_data: evidenceImagesData?.[0] || '',
        }),
      });
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    }
  }

  async function setAccountTier(accountId: string, tier: AccountRow['plan_tier']) {
    try {
      await adminRequest(`/api/superadmin/accounts/${accountId}/tier`, {
        method: 'POST',
        body: JSON.stringify({ tier }),
      });
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account tier');
    }
  }

  async function deleteAccount(accountId: string) {
    if (!window.confirm('Delete this account and all its data? This cannot be undone.')) return;
    try {
      await adminRequest(`/api/superadmin/accounts/${accountId}`, {
        method: 'DELETE',
      });
      if (selectedAccountId === accountId) {
        setSelectedAccountId('');
        setUsers([]);
      }
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  }

  async function sendAppealReply() {
    if (!selectedAppealId || !appealReply.trim()) return;
    try {
      await adminRequest(`/api/superadmin/appeals/${selectedAppealId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: appealReply.trim() }),
      });
      setAppealReply('');
      const payload = await adminRequest<{ ticket: AppealTicketRow; messages: AppealMessageRow[] }>(
        `/api/superadmin/appeals/${selectedAppealId}/messages`
      );
      setSelectedAppeal(payload.ticket);
      setAppealMessages(payload.messages);
      await loadAppeals();
      await loadAppealCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    }
  }

  async function updateAppealStatus(status: AppealTicketRow['status']) {
    if (!selectedAppealId) return;
    try {
      await adminRequest(`/api/superadmin/appeals/${selectedAppealId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      await loadAccounts();
      const payload = await adminRequest<{ ticket: AppealTicketRow; messages: AppealMessageRow[] }>(
        `/api/superadmin/appeals/${selectedAppealId}/messages`
      );
      setSelectedAppeal(payload.ticket);
      setAppealMessages(payload.messages);
      await loadAppeals();
      await loadAppealCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update appeal status');
    }
  }

  async function onBanEvidenceFileSelected(files: FileList | null) {
    if (!files || files.length === 0) {
      setReasonModal((prev) => ({ ...prev, evidenceImagesData: [] }));
      return;
    }
    try {
      const selected = Array.from(files).slice(0, 12);
      const images = await Promise.all(
        selected.filter((file) => file.size <= 1_500_000).map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
              reader.onerror = () => reject(new Error('Failed to read image file.'));
              reader.readAsDataURL(file);
            })
        )
      );
      if (images.length !== selected.length) setError('Oversized evidence images were skipped. Maximum size is 1.5 MB.');
      setReasonModal((prev) => ({ ...prev, evidenceImagesData: images.filter(Boolean) }));
    } catch {
      setError('Failed to read one or more image files.');
    }
  }

  function beginBlockAction(accountId: string, action: 'ban' | 'disable') {
    setReasonModal({
      open: true,
      accountId,
      action,
      reason: BLOCK_REASONS[0],
      customReason: '',
      evidenceNote: '',
      evidenceImagesData: [],
    });
  }

  async function saveBillingConfig() {
    try {
      const updated = await adminRequest<BillingConfigRow>('/api/superadmin/billing-config', {
        method: 'POST',
        body: JSON.stringify({
          standard_monthly_usd: Number(billingForm.standard_monthly_usd || 0),
          standard_yearly_usd: Number(billingForm.standard_yearly_usd || 0),
          pro_monthly_usd: Number(billingForm.pro_monthly_usd || 0),
          pro_yearly_usd: Number(billingForm.pro_yearly_usd || 0),
          elite_monthly_usd: Number(billingForm.elite_monthly_usd || 0),
          elite_yearly_usd: Number(billingForm.elite_yearly_usd || 0),
          currency: (billingForm.currency || 'USD').toUpperCase(),
        }),
      });
      setBillingConfig(updated);
      setBillingForm({
        standard_monthly_usd: String(updated.standard_monthly_usd),
        standard_yearly_usd: String(updated.standard_yearly_usd),
        pro_monthly_usd: String(updated.pro_monthly_usd),
        pro_yearly_usd: String(updated.pro_yearly_usd),
        elite_monthly_usd: String(updated.elite_monthly_usd),
        elite_yearly_usd: String(updated.elite_yearly_usd),
        currency: updated.currency || 'USD',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save billing config');
    }
  }

  async function editDbRow(row: Record<string, unknown>) {
    if (!dbSelectedTable) return;
    if (dbPkColumns.length === 0) {
      setError('This table has no primary key, so inline edit is disabled.');
      return;
    }
    const pk: Record<string, unknown> = {};
    for (const key of dbPkColumns) pk[key] = row[key];
    const currentEditable: Record<string, unknown> = {};
    for (const key of dbColumns) {
      if (!dbPkColumns.includes(key)) currentEditable[key] = row[key];
    }
    const input = window.prompt('Edit row JSON values (non-PK fields):', JSON.stringify(currentEditable, null, 2));
    if (!input) return;
    try {
      const values = JSON.parse(input) as Record<string, unknown>;
      const query = dbAccountScope ? `?account_id=${encodeURIComponent(dbAccountScope)}` : '';
      await adminRequest(`/api/superadmin/db/table/${encodeURIComponent(dbSelectedTable)}/row${query}`, {
        method: 'PUT',
        body: JSON.stringify({ pk, values }),
      });
      await loadDbRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit row');
    }
  }

  async function deleteDbRow(row: Record<string, unknown>) {
    if (!dbSelectedTable) return;
    if (dbPkColumns.length === 0) {
      setError('This table has no primary key, so delete is disabled.');
      return;
    }
    if (!window.confirm('Delete this row?')) return;
    try {
      const pk: Record<string, unknown> = {};
      for (const key of dbPkColumns) pk[key] = row[key];
      const query = dbAccountScope ? `?account_id=${encodeURIComponent(dbAccountScope)}` : '';
      await adminRequest(`/api/superadmin/db/table/${encodeURIComponent(dbSelectedTable)}/row${query}`, {
        method: 'DELETE',
        body: JSON.stringify({ pk }),
      });
      await loadDbRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete row');
    }
  }

  if (!isAuthenticated) {
    return (
      <LoginForm
        email={email}
        error={error}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        onSubmit={login}
      />
    );
  }

  return (
    <div className="min-h-screen app-theme p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Super Admin Control Panel</h1>
            <p className={`text-sm mt-1 ${activeAppealCount > 0 ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
              {activeAppealCount > 0
                ? `New appeals waiting: ${activeAppealCount}`
                : 'No active ban appeals right now'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem(SUPERADMIN_TOKEN_STORAGE_KEY);
              setIsAuthenticated(false);
              setAccounts([]);
              setUsers([]);
              setAppeals([]);
              setSelectedAppealId('');
              setSelectedAppeal(null);
              setAppealMessages([]);
              setAppealHistory([]);
              redirectToPath('/admin-login');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            Log Out
          </button>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <BillingPanel
          billingConfig={billingConfig}
          billingForm={billingForm}
          setBillingForm={setBillingForm}
          onSave={saveBillingConfig}
        />

        <DbExplorerPanel
          accounts={accounts}
          dbAccountScope={dbAccountScope}
          dbColumns={dbColumns}
          dbLimit={dbLimit}
          dbLoading={dbLoading}
          dbPkColumns={dbPkColumns}
          dbRows={dbRows}
          dbSelectedTable={dbSelectedTable}
          dbTables={dbTables}
          editDbRow={editDbRow}
          deleteDbRow={deleteDbRow}
          loadDbRows={() => loadDbRows()}
          loadDbTables={() => loadDbTables()}
          setDbAccountScope={setDbAccountScope}
          setDbLimit={setDbLimit}
          setDbSelectedTable={setDbSelectedTable}
        />

        <AccountsPanel
          accounts={accounts}
          beginBlockAction={beginBlockAction}
          deleteAccount={deleteAccount}
          setAccountTier={setAccountTier}
          selectedAccountId={selectedAccountId}
          setAccountState={setAccountState}
          setSelectedAccountId={setSelectedAccountId}
          users={users}
        />

        <AppealsPanel
          appealMessages={appealMessages}
          appealReply={appealReply}
          appeals={appeals}
          selectedAccountId={selectedAccountId}
          selectedAppeal={selectedAppeal}
          selectedAppealId={selectedAppealId}
          sendAppealReply={sendAppealReply}
          setAppealReply={setAppealReply}
          setSelectedAppealId={setSelectedAppealId}
          updateAppealStatus={updateAppealStatus}
        />

        <AppealHistoryPanel appealHistory={appealHistory} />
      </div>
      <ReasonModal
        onBanEvidenceFileSelected={onBanEvidenceFileSelected}
        onCancel={() => setReasonModal((prev) => ({ ...prev, open: false }))}
        onConfirm={async () => {
          const selectedReason =
            reasonModal.reason === CUSTOM_REASON_VALUE
              ? reasonModal.customReason.trim()
              : reasonModal.reason;
          if (!selectedReason || selectedReason.length < 3) {
            setError('Custom reason must be at least 3 characters.');
            return;
          }
          setError('');
          await setAccountState(
            reasonModal.accountId,
            reasonModal.action,
            true,
            selectedReason,
            reasonModal.action === 'ban' ? reasonModal.evidenceNote : '',
            reasonModal.action === 'ban' ? reasonModal.evidenceImagesData : []
          );
          setReasonModal((prev) => ({
            ...prev,
            open: false,
            customReason: '',
            reason: BLOCK_REASONS[0],
            evidenceNote: '',
            evidenceImagesData: [],
          }));
        }}
        reasonModal={reasonModal}
        setError={setError}
        setReasonModal={setReasonModal}
      />
    </div>
  );
}
