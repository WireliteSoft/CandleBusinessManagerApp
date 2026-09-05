import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import { AUTH_TOKEN_STORAGE_KEY, localDb, type AuthUser } from './lib/localDb';
import type { BillingPlansResponse } from './lib/localDbTypes';
import BlockedAccessPage from './components/BlockedAccessPage';
import BanAppealPage from './components/BanAppealPage';
import BanAppealChatPage from './components/BanAppealChatPage';
import SubscriptionPaywall from './components/SubscriptionPaywall';
import AppHeader from './app/components/AppHeader';
import AppNav from './app/components/AppNav';
import {
  ACTIVE_TAB_STORAGE_KEY,
  CALCULATORS_TAB_STORAGE_KEY,
  DARK_THEME_STORAGE_KEY,
  LIGHT_THEME_STORAGE_KEY,
  SUPPLIES_TAB_STORAGE_KEY,
  TAB_MIN_TIER,
  TEAMS_TAB_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  TIER_RANK,
  type BillingTier,
  type Tab,
} from './app/config';
import {
  getInitialActiveTab,
  getInitialCalculatorsTab,
  getInitialDarkTheme,
  getInitialLightTheme,
  getInitialSuppliesTab,
  getInitialTeamsTab,
  getInitialThemeMode,
} from './app/storage';
import {
  redirectToPath,
  getAppealAccessKeyFromUrl,
  getAppealTicketIdFromUrl,
  getBatchIdFromUrl,
  getBlockedIdentifierFromUrl,
  getBlockedReasonFromUrl,
  getBlockedTypeFromUrl,
  getStoreSlugFromUrl,
  isPath,
} from './app/urlState';

const ProductInventory = lazy(() => import('./components/ProductInventory'));
const CandleRecipes = lazy(() => import('./components/CandleRecipes'));
const BatchProductionLog = lazy(() => import('./components/BatchProductionLog'));
const BatchPublicDetails = lazy(() => import('./components/BatchPublicDetails'));
const AccountSettings = lazy(() => import('./components/AccountSettings'));
const SuperAdminPage = lazy(() => import('./components/SuperAdminPage'));
const StorefrontBuilder = lazy(() => import('./components/StorefrontBuilder'));
const StorefrontPublic = lazy(() => import('./components/StorefrontPublic'));
const CalculatorsSection = lazy(() => import('./app/components/CalculatorsSection'));
const SuppliesSection = lazy(() => import('./app/components/SuppliesSection'));
const TeamsSection = lazy(() => import('./app/components/TeamsSection'));

function SectionLoadingFallback() {
  return <div className="text-center py-8 text-sm text-gray-600">Loading...</div>;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialActiveTab);
  const [calculatorsTab, setCalculatorsTab] = useState(getInitialCalculatorsTab);
  const [suppliesTab, setSuppliesTab] = useState(getInitialSuppliesTab);
  const [teamsTab, setTeamsTab] = useState(getInitialTeamsTab);
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const [lightTheme, setLightTheme] = useState(getInitialLightTheme);
  const [darkTheme, setDarkTheme] = useState(getInitialDarkTheme);
  const activeThemeName = themeMode === 'light' ? lightTheme : darkTheme;
  const [me, setMe] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [billingPlans, setBillingPlans] = useState<BillingPlansResponse | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [billingNotice, setBillingNotice] = useState<string>('');
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const batchIdFromUrl = useMemo(getBatchIdFromUrl, []);
  const blockedReasonFromUrl = useMemo(getBlockedReasonFromUrl, []);
  const blockedIdentifierFromUrl = useMemo(getBlockedIdentifierFromUrl, []);
  const appealTicketIdFromUrl = useMemo(getAppealTicketIdFromUrl, []);
  const appealAccessKeyFromUrl = useMemo(getAppealAccessKeyFromUrl, []);
  const blockedTypeFromUrl = useMemo(getBlockedTypeFromUrl, []);
  const isSuperAdminPath = useMemo(() => isPath('/admin'), []);
  const isSuperAdminLoginPath = useMemo(() => isPath('/admin-login'), []);
  const isBlockedPath = useMemo(() => isPath('/blocked'), []);
  const isAppealPath = useMemo(() => isPath('/appeal'), []);
  const isAppealChatPath = useMemo(() => isPath('/appeal-chat'), []);
  const storeSlugFromUrl = useMemo(getStoreSlugFromUrl, []);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);
  useEffect(() => {
    window.localStorage.setItem(CALCULATORS_TAB_STORAGE_KEY, calculatorsTab);
  }, [calculatorsTab]);
  useEffect(() => {
    window.localStorage.setItem(SUPPLIES_TAB_STORAGE_KEY, suppliesTab);
  }, [suppliesTab]);
  useEffect(() => {
    window.localStorage.setItem(TEAMS_TAB_STORAGE_KEY, teamsTab);
  }, [teamsTab]);
  useEffect(() => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
  }, [themeMode]);
  useEffect(() => {
    window.localStorage.setItem(LIGHT_THEME_STORAGE_KEY, lightTheme);
  }, [lightTheme]);
  useEffect(() => {
    window.localStorage.setItem(DARK_THEME_STORAGE_KEY, darkTheme);
  }, [darkTheme]);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme-mode', themeMode);
    document.documentElement.setAttribute('data-theme-name', activeThemeName);
  }, [activeThemeName, themeMode]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (!token) {
        if (!cancelled) setAuthLoading(false);
        return;
      }
      try {
        const currentUser = await localDb.getAuthMe();
        if (!cancelled) setMe(currentUser);
      } catch {
        window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentTier: BillingTier = (me?.plan_tier as BillingTier) || 'free';

  function canAccessTab(tab: Tab) {
    const tierAllowed = TIER_RANK[currentTier] >= TIER_RANK[TAB_MIN_TIER[tab]];
    const permissionAllowed = rolePermissions[tab] ?? true;
    return tierAllowed && permissionAllowed;
  }

  function canAccessFeature(featureKey: string) {
    return rolePermissions[featureKey] ?? true;
  }

  function canEditFeature(featureKey: string) {
    return rolePermissions[`${featureKey}_edit`] ?? canAccessFeature(featureKey);
  }

  function handleTabClick(tab: Tab) {
    if (canAccessTab(tab)) {
      setActiveTab(tab);
      return;
    }
    setPaywallOpen(true);
  }

  useEffect(() => {
    if (!me?.account_id) return;
    let cancelled = false;
    (async () => {
      try {
        const plans = await localDb.getBillingPlans();
        if (cancelled) return;
        setBillingPlans(plans);
        setMe((prev) => (prev ? { ...prev, plan_tier: plans.plan_tier } : prev));
        const permissionsPayload = await localDb.getRolePermissions();
        if (cancelled) return;
        setRolePermissions(permissionsPayload.permissions || {});
      } catch {
        // ignore pricing load errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me?.account_id]);

  useEffect(() => {
    if (!me?.account_id) return;
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('billingCheckout');
    const sessionId = params.get('session_id');
    if (!checkoutState) return;

    let cancelled = false;
    async function syncCheckoutState() {
      try {
        if (checkoutState === 'cancel') {
          if (!cancelled) setBillingNotice('Tier checkout was canceled. Your current plan was not changed.');
          return;
        }
        if (!sessionId) {
          if (!cancelled) setBillingNotice('Billing return was missing a checkout session.');
          return;
        }
        const result = await localDb.getBillingCheckoutStatus(sessionId);
        if (cancelled) return;
        if (result.paid && result.plan_tier) {
          const nextTier = result.plan_tier;
          setMe((prev) => (prev ? { ...prev, plan_tier: nextTier } : prev));
          setBillingNotice(`Plan updated successfully to ${result.plan_tier}.`);
          const refreshedPlans = await localDb.getBillingPlans();
          if (!cancelled) setBillingPlans(refreshedPlans);
        } else {
          setBillingNotice('Checkout did not finish successfully. Your current plan is still active.');
        }
      } catch {
        if (!cancelled) setBillingNotice('Unable to verify the billing checkout result.');
      } finally {
        const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    void syncCheckoutState();
    return () => {
      cancelled = true;
    };
  }, [me?.account_id]);

  useEffect(() => {
    if (!me) return;
    const tierAllowed = TIER_RANK[currentTier] >= TIER_RANK[TAB_MIN_TIER[activeTab]];
    const permissionAllowed = rolePermissions[activeTab] ?? true;
    if (tierAllowed && permissionAllowed) return;
    setActiveTab('products');
  }, [activeTab, me, currentTier, rolePermissions]);

  useEffect(() => {
    if (activeTab !== 'teams') return;
    const canAccessTeamsAccess = rolePermissions.teams_access ?? true;
    const canAccessTeamsEmployees = rolePermissions.teams_employees ?? true;
    const canAccessTeamsRoles = rolePermissions.teams_roles ?? true;
    const canAccessTeamsContacts = rolePermissions.teams_contacts ?? true;
    const canAccessStorefrontOrders = rolePermissions.storefront_edit ?? true;

    if (teamsTab === 'access' && canAccessTeamsAccess) return;
    if (teamsTab === 'employees' && canAccessTeamsEmployees) return;
    if (
      teamsTab === 'roles' &&
      (me?.role === 'owner' || me?.role === 'admin') &&
      canAccessTeamsRoles
    ) {
      return;
    }
    if (teamsTab === 'contacts' && canAccessTeamsContacts) return;
    if (teamsTab === 'orders' && canAccessStorefrontOrders) return;
    if (teamsTab === 'giftCards' && canAccessStorefrontOrders) return;
    if (teamsTab === 'reviews' && canAccessStorefrontOrders) return;
    if (teamsTab === 'rewards' && canAccessStorefrontOrders) return;
    if (canAccessTeamsAccess) {
      setTeamsTab('access');
      return;
    }
    if (canAccessTeamsEmployees) {
      setTeamsTab('employees');
      return;
    }
    if ((me?.role === 'owner' || me?.role === 'admin') && canAccessTeamsRoles) {
      setTeamsTab('roles');
      return;
    }
    if (canAccessTeamsContacts) {
      setTeamsTab('contacts');
      return;
    }
    if (canAccessStorefrontOrders) {
      setTeamsTab('orders');
    }
  }, [activeTab, me?.role, rolePermissions, teamsTab]);

  if (batchIdFromUrl) {
    return (
      <Suspense fallback={<SectionLoadingFallback />}>
        <BatchPublicDetails batchId={batchIdFromUrl} />
      </Suspense>
    );
  }
  if (storeSlugFromUrl) {
    return (
      <Suspense fallback={<SectionLoadingFallback />}>
        <StorefrontPublic slug={storeSlugFromUrl} />
      </Suspense>
    );
  }
  if (isBlockedPath) {
    return (
      <BlockedAccessPage
        reason={blockedReasonFromUrl}
        type={blockedTypeFromUrl}
        identifier={blockedIdentifierFromUrl}
      />
    );
  }
  if (isAppealPath) {
    return (
      <BanAppealPage
        initialIdentifier={blockedIdentifierFromUrl}
        initialReason={blockedReasonFromUrl}
      />
    );
  }
  if (isAppealChatPath) {
    return <BanAppealChatPage ticketId={appealTicketIdFromUrl} accessKey={appealAccessKeyFromUrl} />;
  }
  if (isSuperAdminLoginPath) {
    return (
      <Suspense fallback={<SectionLoadingFallback />}>
        <SuperAdminPage />
      </Suspense>
    );
  }
  if (isSuperAdminPath) {
    redirectToPath('/admin-login');
    return null;
  }
  if (authLoading) {
    return (
      <div className="min-h-screen app-theme flex items-center justify-center">
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    );
  }
  if (!me) {
    return <AuthScreen onAuthenticated={setMe} />;
  }

  function renderReadOnlyNotice() {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 mb-3 text-sm font-medium text-amber-800">
        View-only role: editing and deleting are disabled for this section.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 app-theme">
      <AppHeader
        activeThemeName={activeThemeName}
        currentTier={currentTier}
        me={me}
        onLogout={() => {
          void (async () => {
            try {
              await localDb.logout();
            } catch {
              // ignore logout request errors
            } finally {
              window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
              setMe(null);
            }
          })();
        }}
        onOpenPlans={() => setPaywallOpen(true)}
        setDarkTheme={setDarkTheme}
        setLightTheme={setLightTheme}
        setThemeMode={setThemeMode}
        themeMode={themeMode}
      />

      <AppNav activeTab={activeTab} canAccessTab={canAccessTab} onTabClick={handleTabClick} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {billingNotice && (
          <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <div className="flex items-center justify-between gap-3">
              <span>{billingNotice}</span>
              <button type="button" onClick={() => setBillingNotice('')} className="text-indigo-700">
                Dismiss
              </button>
            </div>
          </div>
        )}
        <Suspense fallback={<SectionLoadingFallback />}>
          {activeTab === 'account' && <AccountSettings me={me} onOpenPlans={() => setPaywallOpen(true)} />}
          {activeTab === 'products' && (
            <>
              {!canEditFeature('products') && renderReadOnlyNotice()}
              <ProductInventory readOnly={!canEditFeature('products')} />
            </>
          )}
          {activeTab === 'supplies' && (
            <SuppliesSection
              canEditFeature={canEditFeature}
              renderReadOnlyNotice={renderReadOnlyNotice}
              setSuppliesTab={setSuppliesTab}
              suppliesTab={suppliesTab}
            />
          )}
          {activeTab === 'recipes' && (
            <>
              {!canEditFeature('recipes') && renderReadOnlyNotice()}
              <CandleRecipes readOnly={!canEditFeature('recipes')} />
            </>
          )}
          {activeTab === 'calculators' && (
            <CalculatorsSection calculatorsTab={calculatorsTab} setCalculatorsTab={setCalculatorsTab} />
          )}
          {activeTab === 'batches' && (
            <>
              {!canEditFeature('batches') && renderReadOnlyNotice()}
              <BatchProductionLog
                readOnly={!canEditFeature('batches')}
                canCreateProducts={canEditFeature('products')}
                onProductCreated={() => setActiveTab('products')}
              />
            </>
          )}
          {activeTab === 'storefront' && (
            <>
              {!canEditFeature('storefront') && renderReadOnlyNotice()}
              <StorefrontBuilder readOnly={!canEditFeature('storefront')} />
            </>
          )}
          {activeTab === 'teams' && (
            <TeamsSection
              canAccessFeature={canAccessFeature}
              canEditFeature={canEditFeature}
              me={me}
              renderReadOnlyNotice={renderReadOnlyNotice}
              setTeamsTab={setTeamsTab}
              teamsTab={teamsTab}
            />
          )}
        </Suspense>
      </main>
      {paywallOpen && (
        <SubscriptionPaywall
          currentTier={currentTier}
          pricingByTier={billingPlans?.pricing_by_tier || null}
          currency={billingPlans?.pricing.currency || 'USD'}
          paymentOptions={
            billingPlans?.payment_options || {
              square_enabled: false,
              square_application_id: '',
              square_location_id: '',
              paypal_enabled: false,
              paypal_client_id: '',
            }
          }
          tierQuotes={billingPlans?.tier_quotes || null}
          onClose={() => setPaywallOpen(false)}
          onSelectTier={async (tier, billingCycle, paymentMethod, sourceId, billingTerms) => {
            try {
              if (tier === 'free') {
                const result = await localDb.selectBillingTier(tier);
                setMe((prev) => (prev ? { ...prev, plan_tier: result.plan_tier } : prev));
                const refreshedPlans = await localDb.getBillingPlans();
                setBillingPlans(refreshedPlans);
                setBillingNotice('Plan updated successfully to free.');
                setPaywallOpen(false);
                return;
              }

              if (paymentMethod === 'paypal' && sourceId === '__PAYPAL_CAPTURED__') {
                setMe((prev) => (prev ? { ...prev, plan_tier: tier } : prev));
                const refreshedPlans = await localDb.getBillingPlans();
                setBillingPlans(refreshedPlans);
                setBillingNotice(`Plan updated successfully to ${tier}.`);
                setPaywallOpen(false);
                return;
              }

              const checkout = await localDb.createBillingCheckout(
                tier,
                billingCycle,
                paymentMethod,
                sourceId,
                billingTerms
              );
              if (checkout.plan_tier) {
                const nextTier = checkout.plan_tier;
                setMe((prev) => (prev ? { ...prev, plan_tier: nextTier } : prev));
                const refreshedPlans = await localDb.getBillingPlans();
                setBillingPlans(refreshedPlans);
                setBillingNotice(`Plan updated successfully to ${checkout.plan_tier}.`);
                setPaywallOpen(false);
                return;
              }
              window.location.href = checkout.url;
            } catch (error) {
              setBillingNotice(error instanceof Error ? error.message : 'Unable to start plan checkout.');
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
