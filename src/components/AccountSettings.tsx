import { useEffect, useMemo, useState } from 'react';
import { localDb, type AccountBillingProfile, type AccountUsageSummary, type AuthUser, type BillingPurchaseHistoryRecord } from '../lib/localDb';

type Props = {
  me: AuthUser;
  onOpenPlans: () => void;
};

type AccountView = 'billing' | 'history' | 'usage';

const INITIAL_PROFILE: AccountBillingProfile = {
  account_id: '',
  billing_name: '',
  billing_email: '',
  billing_phone: '',
  company_name: '',
  street_address_1: '',
  street_address_2: '',
  city: '',
  state_region: '',
  postal_code: '',
  country: '',
  preferred_payment_method: 'card',
  paypal_email: '',
  payment_profile_note: '',
  created_at: '',
  updated_at: '',
};

function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(value: string | null) {
  if (!value) return 'Not yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not yet';
  return date.toLocaleString();
}

function formatPlanName(value: string) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatPaymentMethod(value: string) {
  switch (value) {
    case 'apple_pay':
      return 'Apple Pay';
    case 'google_pay':
      return 'Google Pay';
    case 'paypal':
      return 'PayPal';
    case 'card':
      return 'Card';
    case 'manual':
      return 'Manual';
    default:
      return value;
  }
}

export default function AccountSettings({ me, onOpenPlans }: Props) {
  const [activeView, setActiveView] = useState<AccountView>('billing');
  const [profile, setProfile] = useState<AccountBillingProfile>(INITIAL_PROFILE);
  const [purchaseHistory, setPurchaseHistory] = useState<BillingPurchaseHistoryRecord[]>([]);
  const [usageSummary, setUsageSummary] = useState<AccountUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const [profileResult, historyResult, usageResult] = await Promise.all([
          localDb.getAccountBillingProfile(),
          localDb.getAccountPurchaseHistory(),
          localDb.getAccountUsageSummary(),
        ]);
        if (cancelled) return;
        setProfile(profileResult);
        setPurchaseHistory(historyResult);
        setUsageSummary(usageResult);
      } catch (nextError) {
        if (cancelled) return;
        setError(nextError instanceof Error ? nextError.message : 'Unable to load account details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const overviewCards = useMemo(() => {
    return [
      {
        label: 'Current plan',
        value: formatPlanName(usageSummary?.plan_tier || me.plan_tier),
        accent: 'border-sky-200 bg-sky-50 text-sky-900',
      },
      {
        label: 'Paid orders',
        value: String(usageSummary?.totals.paid_orders ?? 0),
        accent: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      },
      {
        label: 'Gross sales tracked',
        value: formatMoney(usageSummary?.financials.gross_sales ?? 0),
        accent: 'border-violet-200 bg-violet-50 text-violet-900',
      },
      {
        label: 'Team users',
        value: String(usageSummary?.totals.team_users ?? 1),
        accent: 'border-amber-200 bg-amber-50 text-amber-900',
      },
    ];
  }, [me.plan_tier, usageSummary]);

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const saved = await localDb.updateAccountBillingProfile({
        billing_name: profile.billing_name,
        billing_email: profile.billing_email,
        billing_phone: profile.billing_phone,
        company_name: profile.company_name,
        street_address_1: profile.street_address_1,
        street_address_2: profile.street_address_2,
        city: profile.city,
        state_region: profile.state_region,
        postal_code: profile.postal_code,
        country: profile.country,
        preferred_payment_method: profile.preferred_payment_method,
        paypal_email: profile.paypal_email,
        payment_profile_note: profile.payment_profile_note,
      });
      setProfile(saved);
      setStatus('Account billing profile saved.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to save billing profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading account details...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Account</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">{usageSummary?.account_name || me.account_name}</h2>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Update billing details, review plan purchase history, and track how this workspace is being used.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              User: {me.username} ({me.role}) • Created: {formatDate(usageSummary?.account_created_at || null)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenPlans}
              className="rounded-lg border border-indigo-300 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              Manage Plan
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <div key={card.label} className={`rounded-xl border p-4 ${card.accent}`}>
              <p className="text-xs font-semibold uppercase tracking-wide">{card.label}</p>
              <p className="mt-2 text-2xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            ['billing', 'Billing Profile'],
            ['history', 'Purchase History'],
            ['usage', 'Usage'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id as AccountView)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                activeView === id
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {status && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</div>}

        {activeView === 'billing' && (
          <form onSubmit={handleSaveProfile} className="mt-5 space-y-5">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Raw card, Apple Pay, and Google Pay credentials are not stored in this app. This profile stores billing contact data,
              address details, preferred checkout method, and payment notes so future checkout can be completed faster.
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-sm text-gray-700">
                Billing name
                <input
                  value={profile.billing_name}
                  onChange={(event) => setProfile((prev) => ({ ...prev, billing_name: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-700">
                Billing email
                <input
                  type="email"
                  value={profile.billing_email}
                  onChange={(event) => setProfile((prev) => ({ ...prev, billing_email: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-700">
                Billing phone
                <input
                  value={profile.billing_phone}
                  onChange={(event) => setProfile((prev) => ({ ...prev, billing_phone: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-700">
                Company name
                <input
                  value={profile.company_name}
                  onChange={(event) => setProfile((prev) => ({ ...prev, company_name: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-700 lg:col-span-2">
                Street address 1
                <input
                  value={profile.street_address_1}
                  onChange={(event) => setProfile((prev) => ({ ...prev, street_address_1: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-700 lg:col-span-2">
                Street address 2
                <input
                  value={profile.street_address_2}
                  onChange={(event) => setProfile((prev) => ({ ...prev, street_address_2: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-700">
                City
                <input
                  value={profile.city}
                  onChange={(event) => setProfile((prev) => ({ ...prev, city: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-700">
                State / region
                <input
                  value={profile.state_region}
                  onChange={(event) => setProfile((prev) => ({ ...prev, state_region: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-700">
                Postal code
                <input
                  value={profile.postal_code}
                  onChange={(event) => setProfile((prev) => ({ ...prev, postal_code: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-700">
                Country
                <input
                  value={profile.country}
                  onChange={(event) => setProfile((prev) => ({ ...prev, country: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-700">
                Preferred checkout method
                <select
                  value={profile.preferred_payment_method}
                  onChange={(event) =>
                    setProfile((prev) => ({
                      ...prev,
                      preferred_payment_method: event.target.value as AccountBillingProfile['preferred_payment_method'],
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="card">Credit / debit card</option>
                  <option value="apple_pay">Apple Pay</option>
                  <option value="google_pay">Google Pay</option>
                  <option value="paypal">PayPal</option>
                  <option value="manual">Manual invoicing</option>
                </select>
              </label>
              <label className="text-sm text-gray-700">
                PayPal email
                <input
                  type="email"
                  value={profile.paypal_email}
                  onChange={(event) => setProfile((prev) => ({ ...prev, paypal_email: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-700 lg:col-span-2">
                Payment note
                <textarea
                  rows={4}
                  value={profile.payment_profile_note}
                  onChange={(event) => setProfile((prev) => ({ ...prev, payment_profile_note: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Example: use business PayPal for annual renewals, use card for monthly upgrades."
                />
              </label>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500">Last updated: {formatDate(profile.updated_at || null)}</p>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {saving ? 'Saving...' : 'Save billing profile'}
              </button>
            </div>
          </form>
        )}

        {activeView === 'history' && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total checkouts</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{usageSummary?.totals.checkout_sessions ?? 0}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Paid orders</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{usageSummary?.totals.paid_orders ?? 0}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last paid</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">{formatDate(usageSummary?.last_paid_at || null)}</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="max-h-[480px] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Cycle</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {purchaseHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                          No purchase history yet.
                        </td>
                      </tr>
                    )}
                    {purchaseHistory.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 text-gray-600">{formatDate(entry.paid_at || entry.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{formatPlanName(entry.target_tier)}</span>
                          <span className="block text-xs text-gray-500">from {formatPlanName(entry.from_tier)}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatPlanName(entry.billing_cycle)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatPaymentMethod(entry.payment_method)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              entry.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : entry.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatMoney(entry.amount_due, entry.currency)}
                          {entry.credit_applied > 0 && (
                            <span className="block text-xs font-normal text-emerald-700">
                              Credit {formatMoney(entry.credit_applied, entry.currency)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeView === 'usage' && usageSummary && (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ['Products', usageSummary.totals.products],
                ['Supplies', usageSummary.totals.supplies],
                ['Recipes', usageSummary.totals.recipes],
                ['Batch logs', usageSummary.totals.batch_logs],
                ['Sales', usageSummary.totals.sales],
                ['Units sold', usageSummary.totals.units_sold],
                ['Employees', usageSummary.totals.employees],
                ['Contact messages', usageSummary.totals.contact_messages],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-lg font-semibold text-gray-900">Workspace usage</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-600">Wax inventory entries</dt>
                    <dd className="font-semibold text-gray-900">{usageSummary.totals.wax_inventory_entries}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-600">Team users</dt>
                    <dd className="font-semibold text-gray-900">
                      {usageSummary.totals.active_team_users} active of {usageSummary.totals.team_users}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-600">Checkout sessions</dt>
                    <dd className="font-semibold text-gray-900">{usageSummary.totals.checkout_sessions}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-600">Paid orders</dt>
                    <dd className="font-semibold text-gray-900">{usageSummary.totals.paid_orders}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-lg font-semibold text-gray-900">Financial snapshot</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-600">Gross sales tracked</dt>
                    <dd className="font-semibold text-gray-900">{formatMoney(usageSummary.financials.gross_sales)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-600">Last paid order amount</dt>
                    <dd className="font-semibold text-gray-900">{formatMoney(usageSummary.financials.last_paid_amount)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-600">Last paid checkout</dt>
                    <dd className="font-semibold text-gray-900">{formatDate(usageSummary.last_paid_at)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-600">Current role</dt>
                    <dd className="font-semibold text-gray-900">{usageSummary.role}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
