import { useEffect, useState, type FormEvent } from "react";
import { LogOut, MapPin, Package, UserRound, X } from "lucide-react";
import {
  localDb,
  type StoreCustomerAddress,
  type StoreCustomerOrderDetail,
  type StoreCustomerOrderSummary,
  type StoreCustomerProfile,
} from "../../lib/localDb";
import CustomerGalleryPanel from "./CustomerGalleryPanel";
import CustomerSubscriptions from "./CustomerSubscriptions";

type Props = {
  slug: string;
  open: boolean;
  onClose: () => void;
};

type View = "sign-in" | "register" | "account";
type AccountTab =
  | "profile"
  | "addresses"
  | "saved"
  | "benefits"
  | "subscriptions"
  | "orders"
  | "privacy";
type SavedCollection = {
  id: string;
  collection_name: string;
  label_text: string;
  collection_size: number;
  items: Array<{
    name: string;
    size: string;
    wickCount: string;
    wickType: string;
  }>;
  created_at: string;
};

function getCustomerTokenKey(slug: string) {
  return `candles.store.customer.${slug}`;
}

const emptyAddress = {
  label: "Shipping address",
  recipient_name: "",
  street_address_1: "",
  street_address_2: "",
  city: "",
  state_region: "",
  postal_code: "",
  country: "United States",
  phone: "",
  is_default: true,
};

const ACCOUNT_TABS: Array<{ id: AccountTab; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "addresses", label: "Addresses" },
  { id: "saved", label: "Saved" },
  { id: "benefits", label: "Benefits" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "orders", label: "Orders" },
  { id: "privacy", label: "Privacy" },
];

export default function CustomerAccountModal({ slug, open, onClose }: Props) {
  const [view, setView] = useState<View>("sign-in");
  const [token, setToken] = useState(
    () => window.localStorage.getItem(getCustomerTokenKey(slug)) || "",
  );
  const [customer, setCustomer] = useState<StoreCustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<StoreCustomerAddress[]>([]);
  const [orders, setOrders] = useState<StoreCustomerOrderSummary[]>([]);
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [favorites, setFavorites] = useState<
    Array<{ id: string; name: string; image_data: string; price: number }>
  >([]);
  const [rewards, setRewards] = useState<{
    gift_cards: Array<{
      id: string;
      code: string;
      initial_balance: number;
      balance: number;
      active: boolean;
      reward_discount_percent: number;
      created_at: string;
    }>;
    credits: Array<{
      id: string;
      credit_type: string;
      label: string;
      balance: number;
      active: boolean;
      created_at: string;
    }>;
    notifications: Array<{
      id: string;
      category: string;
      title: string;
      message: string;
      is_read: boolean;
      created_at: string;
    }>;
    reward_points: number;
    reward_ledger: Array<{
      id: string;
      points: number;
      source: string;
      note: string;
      created_at: string;
    }>;
    referral_code: string;
    membership: {
      active: boolean;
      name: string;
      discount_percent: number;
      ends_at: string | null;
    } | null;
  }>({
    gift_cards: [],
    credits: [],
    notifications: [],
    reward_points: 0,
    reward_ledger: [],
    referral_code: "",
    membership: null,
  });
  const [selectedOrder, setSelectedOrder] =
    useState<StoreCustomerOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirm: "",
    referral_code: "",
  });
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    marketing_opt_in: false,
    reminder_opt_in: false,
    birthday: "",
    anniversary: "",
    occasion_reminder_opt_in: false,
  });
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [addingAddress, setAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [accountTab, setAccountTab] = useState<AccountTab>("profile");

  async function loadAccount(activeToken = token) {
    if (!activeToken) return;
    setLoading(true);
    setStatus("");
    try {
      const [profile, orderRows, collectionRows, rewardRows, favoriteRows] =
        await Promise.all([
          localDb.getStoreCustomerMe(slug, activeToken),
          localDb.getStoreCustomerOrders(slug, activeToken),
          localDb.getStoreCustomerCollections(slug, activeToken),
          localDb.getStoreCustomerRewards(slug, activeToken),
          localDb.getStoreCustomerFavorites(slug, activeToken),
        ]);
      setCustomer(profile.customer);
      setAddresses(profile.addresses);
      setOrders(orderRows);
      setCollections(collectionRows);
      setRewards(rewardRows);
      setFavorites(favoriteRows);
      setProfileForm({
        name: profile.customer.name,
        phone: profile.customer.phone || "",
        marketing_opt_in: profile.customer.marketing_opt_in,
        reminder_opt_in: profile.customer.reminder_opt_in,
        birthday: profile.customer.birthday || "",
        anniversary: profile.customer.anniversary || "",
        occasion_reminder_opt_in: profile.customer.occasion_reminder_opt_in,
      });
      setView("account");
    } catch (error) {
      window.localStorage.removeItem(getCustomerTokenKey(slug));
      setToken("");
      setCustomer(null);
      setView("sign-in");
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to load customer account.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && token) void loadAccount(token);
    // The account is deliberately loaded only when the dialog opens or the customer token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  if (!open) return null;

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const result =
        view === "register"
          ? await localDb.registerStoreCustomer(slug, authForm)
          : await localDb.loginStoreCustomer(slug, {
              email: authForm.email,
              password: authForm.password,
            });
      window.localStorage.setItem(getCustomerTokenKey(slug), result.token);
      setToken(result.token);
      setCustomer(result.customer);
      setProfileForm({
        name: result.customer.name,
        phone: result.customer.phone || "",
        marketing_opt_in: result.customer.marketing_opt_in,
        reminder_opt_in: result.customer.reminder_opt_in,
        birthday: result.customer.birthday || "",
        anniversary: result.customer.anniversary || "",
        occasion_reminder_opt_in: result.customer.occasion_reminder_opt_in,
      });
      setView("account");
      await loadAccount(result.token);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setStatus("");
    try {
      const result = await localDb.updateStoreCustomerMe(
        slug,
        token,
        profileForm,
      );
      setCustomer(result.customer);
      setStatus("Profile saved.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to save profile.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setStatus("");
    try {
      const address = editingAddressId
        ? await localDb.updateStoreCustomerAddress(
            slug,
            token,
            editingAddressId,
            addressForm,
          )
        : await localDb.addStoreCustomerAddress(slug, token, addressForm);
      setAddresses((current) => {
        const withoutSaved = current
          .filter((item) => item.id !== address.id)
          .map((item) => ({
            ...item,
            is_default: address.is_default ? false : item.is_default,
          }));
        return [address, ...withoutSaved];
      });
      setAddressForm(emptyAddress);
      setAddingAddress(false);
      setEditingAddressId("");
      setStatus(editingAddressId ? "Address updated." : "Address saved.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to save address.",
      );
    } finally {
      setLoading(false);
    }
  }

  function startAddressEdit(address: StoreCustomerAddress) {
    setAddressForm({ ...address });
    setEditingAddressId(address.id);
    setAddingAddress(true);
  }

  function cancelAddressEdit() {
    setAddressForm(emptyAddress);
    setEditingAddressId("");
    setAddingAddress(false);
  }

  async function deleteAddress(address: StoreCustomerAddress) {
    if (!token || !window.confirm(`Delete ${address.label || "this address"}?`))
      return;
    setLoading(true);
    setStatus("");
    try {
      await localDb.deleteStoreCustomerAddress(slug, token, address.id);
      setAddresses((current) =>
        current.filter((item) => item.id !== address.id),
      );
      if (editingAddressId === address.id) cancelAddressEdit();
      setStatus("Address deleted.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to delete address.",
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(getCustomerTokenKey(slug));
    setToken("");
    setCustomer(null);
    setAddresses([]);
    setOrders([]);
    setCollections([]);
    setRewards({
      gift_cards: [],
      credits: [],
      notifications: [],
      reward_points: 0,
      reward_ledger: [],
      referral_code: "",
      membership: null,
    });
    setFavorites([]);
    setAuthForm({
      name: "",
      email: "",
      password: "",
      password_confirm: "",
      referral_code: "",
    });
    setView("sign-in");
    setStatus("Signed out.");
  }

  async function deleteAccount() {
    if (
      !token ||
      !window.confirm(
        "Delete your customer account? Saved addresses and sign-in access will be removed. Completed order records are retained as described below.",
      )
    )
      return;
    setLoading(true);
    setStatus("");
    try {
      await localDb.deleteStoreCustomerMe(slug, token);
      logout();
      setStatus("Your customer account has been deleted.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to delete customer account.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function viewOrder(orderId: string) {
    if (!token) return;
    setLoading(true);
    setStatus("");
    try {
      setSelectedOrder(
        await localDb.getStoreCustomerOrder(slug, token, orderId),
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to load order details.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/55 p-4 sm:p-8 overflow-y-auto">
      <section
        className="store-customer-modal mx-auto my-4 w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-label="Customer account"
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2 text-slate-900">
            <UserRound className="h-5 w-5" />
            <h2 className="text-xl font-bold">Your account</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close account"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="p-5">
          {status ? (
            <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              {status}
            </p>
          ) : null}
          {view === "sign-in" || view === "register" ? (
            <form className="mx-auto max-w-md space-y-4" onSubmit={submitAuth}>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {view === "register" ? "Create customer account" : "Sign in"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Save addresses and view orders for this store.
                </p>
              </div>
              {view === "register" ? (
                <label className="block text-sm font-medium text-slate-700">
                  Name
                  <input
                    required
                    value={authForm.name}
                    onChange={(event) =>
                      setAuthForm({ ...authForm, name: event.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              ) : null}
              {view === "register" ? (
                <label className="block text-sm font-medium text-slate-700">
                  Referral code (optional)
                  <input
                    value={authForm.referral_code}
                    onChange={(event) =>
                      setAuthForm({
                        ...authForm,
                        referral_code: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              ) : null}
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  required
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm({ ...authForm, email: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Password
                <input
                  required
                  type="password"
                  minLength={8}
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm({ ...authForm, password: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              {view === "register" ? (
                <label className="block text-sm font-medium text-slate-700">
                  Confirm password
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={authForm.password_confirm}
                    onChange={(event) =>
                      setAuthForm({
                        ...authForm,
                        password_confirm: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              ) : null}
              <button
                disabled={loading}
                className="w-full rounded-lg bg-pink-600 px-4 py-2.5 font-semibold text-white hover:bg-pink-700 disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : view === "register"
                    ? "Create account"
                    : "Sign in"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus("");
                  setView(view === "register" ? "sign-in" : "register");
                }}
                className="w-full text-sm font-medium text-pink-700 hover:underline"
              >
                {view === "register"
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
              <details className="rounded-lg border border-slate-200 p-3 text-left text-xs text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-700">
                  Privacy and data retention
                </summary>
                <p className="mt-2">
                  Account details and saved addresses are used to operate this
                  store. Completed order records are retained for seven years
                  for accounting and customer-service obligations. Payment
                  providers handle payment details; this app does not store card
                  or wallet credentials.
                </p>
              </details>
            </form>
          ) : (
            <div className="space-y-7">
              <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {customer?.name}
                  </p>
                  <p className="text-sm text-slate-600">{customer?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-950"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
              <div
                role="tablist"
                aria-label="Account sections"
                className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
              >
                {ACCOUNT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={accountTab === tab.id}
                    onClick={() => setAccountTab(tab.id)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${accountTab === tab.id ? "bg-pink-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {accountTab === "profile" ? (
                <form
                  onSubmit={saveProfile}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <label className="text-sm font-medium text-slate-700">
                    Name
                    <input
                      required
                      value={profileForm.name}
                      onChange={(event) =>
                        setProfileForm({
                          ...profileForm,
                          name: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Phone
                    <input
                      value={profileForm.phone}
                      onChange={(event) =>
                        setProfileForm({
                          ...profileForm,
                          phone: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Birthday
                    <input
                      type="date"
                      value={profileForm.birthday}
                      onChange={(event) =>
                        setProfileForm({
                          ...profileForm,
                          birthday: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Anniversary
                    <input
                      type="date"
                      value={profileForm.anniversary}
                      onChange={(event) =>
                        setProfileForm({
                          ...profileForm,
                          anniversary: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="sm:col-span-2 flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={profileForm.marketing_opt_in}
                      onChange={(event) =>
                        setProfileForm({
                          ...profileForm,
                          marketing_opt_in: event.target.checked,
                        })
                      }
                      className="mt-1"
                    />
                    <span>
                      Send me optional new-product and promotion updates.
                    </span>
                  </label>
                  <label className="sm:col-span-2 flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={profileForm.reminder_opt_in}
                      onChange={(event) =>
                        setProfileForm({
                          ...profileForm,
                          reminder_opt_in: event.target.checked,
                        })
                      }
                      className="mt-1"
                    />
                    <span>Allow future order and gift reminder messages.</span>
                  </label>
                  <label className="sm:col-span-2 flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={profileForm.occasion_reminder_opt_in}
                      onChange={(event) =>
                        setProfileForm({
                          ...profileForm,
                          occasion_reminder_opt_in: event.target.checked,
                        })
                      }
                      className="mt-1"
                    />
                    <span>
                      I consent to optional birthday and anniversary reminders.
                      I can withdraw this consent at any time.
                    </span>
                  </label>
                  <div className="sm:col-span-2">
                    <button
                      disabled={loading}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Save profile
                    </button>
                  </div>
                </form>
              ) : null}
              {accountTab === "addresses" ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-bold text-slate-900">
                      <MapPin className="h-4 w-4" /> Addresses
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        addingAddress
                          ? cancelAddressEdit()
                          : setAddingAddress(true)
                      }
                      className="text-sm font-semibold text-pink-700 hover:underline"
                    >
                      {addingAddress ? "Cancel" : "Add address"}
                    </button>
                  </div>
                  {addresses.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {addresses.map((address) => (
                        <div
                          key={address.id}
                          className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700"
                        >
                          <p className="font-semibold text-slate-900">
                            {address.label || "Address"}{" "}
                            {address.is_default ? (
                              <span className="text-xs text-pink-700">
                                Default
                              </span>
                            ) : null}
                          </p>
                          <p>{address.recipient_name}</p>
                          <p>{address.street_address_1}</p>
                          {address.street_address_2 ? (
                            <p>{address.street_address_2}</p>
                          ) : null}
                          <p>
                            {address.city}, {address.state_region}{" "}
                            {address.postal_code}
                          </p>
                          <p>{address.country}</p>
                          <div className="mt-3 flex gap-3">
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => startAddressEdit(address)}
                              className="text-xs font-semibold text-pink-700 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => void deleteAddress(address)}
                              className="text-xs font-semibold text-red-700 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No saved addresses yet.
                    </p>
                  )}
                  {addingAddress ? (
                    <form
                      onSubmit={saveAddress}
                      className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"
                    >
                      <p className="sm:col-span-2 text-sm font-semibold text-slate-900">
                        {editingAddressId ? "Edit address" : "Add address"}
                      </p>
                      <input
                        required
                        placeholder="Address label"
                        value={addressForm.label}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            label: event.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                      <input
                        required
                        placeholder="Recipient name"
                        value={addressForm.recipient_name}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            recipient_name: event.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                      <input
                        required
                        placeholder="Street address"
                        value={addressForm.street_address_1}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            street_address_1: event.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2 sm:col-span-2"
                      />
                      <input
                        placeholder="Apartment, suite, etc."
                        value={addressForm.street_address_2}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            street_address_2: event.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2 sm:col-span-2"
                      />
                      <input
                        required
                        placeholder="City"
                        value={addressForm.city}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            city: event.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                      <input
                        required
                        placeholder="State / region"
                        value={addressForm.state_region}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            state_region: event.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                      <input
                        required
                        placeholder="Postal code"
                        value={addressForm.postal_code}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            postal_code: event.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                      <input
                        required
                        placeholder="Country"
                        value={addressForm.country}
                        onChange={(event) =>
                          setAddressForm({
                            ...addressForm,
                            country: event.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                      <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={addressForm.is_default}
                          onChange={(event) =>
                            setAddressForm({
                              ...addressForm,
                              is_default: event.target.checked,
                            })
                          }
                        />{" "}
                        Use as default shipping address
                      </label>
                      <button
                        disabled={loading}
                        className="rounded-lg bg-pink-600 px-3 py-2 font-semibold text-white"
                      >
                        {editingAddressId ? "Save changes" : "Save address"}
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
              {accountTab === "saved" ? (
                <div className="space-y-7">
                  <h3 className="mb-3 font-bold text-slate-900">
                    Saved collections
                  </h3>
                  {collections.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {collections.map((collection) => (
                        <div
                          key={collection.id}
                          className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700"
                        >
                          <p className="font-semibold text-slate-900">
                            {collection.collection_name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {collection.collection_size} candles | Saved{" "}
                            {new Date(
                              collection.created_at,
                            ).toLocaleDateString()}
                          </p>
                          {collection.label_text ? (
                            <p className="mt-2">
                              Label: {collection.label_text}
                            </p>
                          ) : null}
                          <ul className="mt-2 space-y-1 text-xs">
                            {collection.items.map((item, index) => (
                              <li key={`${collection.id}-${index}`}>
                                {item.name}: {item.size}, {item.wickCount},{" "}
                                {item.wickType}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Saved collections will appear here.
                    </p>
                  )}
                </div>
              ) : null}
              {accountTab === "saved" ? (
                <CustomerGalleryPanel slug={slug} token={token} />
              ) : null}
              {accountTab === "benefits" ? (
                <div className="space-y-7">
                  <div className="store-customer-tone-card rounded-xl border p-4 text-sm text-slate-700">
                    <h3 className="font-bold text-slate-900">Membership</h3>
                    {rewards.membership?.active ? (
                      <>
                        <p className="mt-1 font-semibold text-slate-900">
                          {rewards.membership.name} is active
                        </p>
                        <p>
                          {rewards.membership.discount_percent}% member
                          discount, eligible samples, exclusive scents, and
                          early access are applied at checkout.
                        </p>
                        {rewards.membership.ends_at ? (
                          <p className="mt-1 text-xs">
                            Ends{" "}
                            {new Date(
                              rewards.membership.ends_at,
                            ).toLocaleDateString()}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-1">
                        No active membership. Contact the store to join the
                        membership program.
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-3 font-bold text-slate-900">Favorites</h3>
                    {favorites.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {favorites.map((favorite) => (
                          <div
                            key={favorite.id}
                            className="flex gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"
                          >
                            {favorite.image_data ? (
                              <img
                                src={favorite.image_data}
                                alt=""
                                className="h-14 w-14 rounded object-cover"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900">
                                {favorite.name}
                              </p>
                              <p>${Number(favorite.price).toFixed(2)}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!token) return;
                                  void localDb
                                    .deleteStoreCustomerFavorite(
                                      slug,
                                      token,
                                      favorite.id,
                                    )
                                    .then(() =>
                                      setFavorites((current) =>
                                        current.filter(
                                          (item) => item.id !== favorite.id,
                                        ),
                                      ),
                                    );
                                }}
                                className="mt-1 text-xs font-semibold text-pink-700 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Save products from the catalog to see them here.
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-3 font-bold text-slate-900">
                      Gift cards, gifts, and credits
                    </h3>
                    {rewards.gift_cards.length || rewards.credits.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {rewards.gift_cards.map((card) => (
                          <div
                            key={card.id}
                            className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700"
                          >
                            <p className="font-semibold text-slate-900">
                              Gift card ending {card.code.slice(-6)}
                            </p>
                            <p className="mt-1 text-lg font-bold text-slate-900">
                              ${Number(card.balance).toFixed(2)}
                            </p>
                            <p className="text-xs">
                              {card.reward_discount_percent}% order discount
                              when used | {card.active ? "Active" : "Inactive"}
                            </p>
                          </div>
                        ))}
                        {rewards.credits.map((credit) => (
                          <div
                            key={credit.id}
                            className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700"
                          >
                            <p className="font-semibold text-slate-900">
                              {credit.credit_type === "free_gift"
                                ? "Free gift"
                                : "Giveaway balance"}
                            </p>
                            <p>{credit.label}</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">
                              ${Number(credit.balance).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Gift cards and account credits added by the store will
                        appear here.
                      </p>
                    )}
                  </div>
                  <div className="store-customer-tone-card rounded-xl border p-4">
                    <h3 className="font-bold text-slate-900">Rewards</h3>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {rewards.reward_points} points
                    </p>
                    <p className="text-xs text-slate-600">
                      Points are earned from paid purchases and approved
                      reviews. Redemption benefits are set by the store.
                    </p>
                    {rewards.reward_ledger.length ? (
                      <div className="mt-3 max-h-36 space-y-1 overflow-y-auto text-xs text-slate-700">
                        {rewards.reward_ledger.map((entry) => (
                          <p key={entry.id}>
                            {entry.points > 0 ? "+" : ""}
                            {entry.points} points - {entry.note || entry.source}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="store-customer-tone-card rounded-xl border p-4 text-sm">
                    <h3 className="font-bold text-slate-900">Refer a friend</h3>
                    <p className="mt-1">
                      Share code: <strong>{rewards.referral_code}</strong>
                    </p>
                    <p className="mt-1 text-slate-600">
                      Friends get a $5 credit at registration. You get 50 points
                      after their first paid order.
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-3 font-bold text-slate-900">
                      Account notifications
                    </h3>
                    {rewards.notifications.length ? (
                      <div className="space-y-2">
                        {rewards.notifications.map((notice) => (
                          <button
                            type="button"
                            key={notice.id}
                            onClick={() => {
                              if (!token || notice.is_read) return;
                              void localDb
                                .markStoreCustomerNotificationRead(
                                  slug,
                                  token,
                                  notice.id,
                                )
                                .then(() =>
                                  setRewards((current) => ({
                                    ...current,
                                    notifications: current.notifications.map(
                                      (item) =>
                                        item.id === notice.id
                                          ? { ...item, is_read: true }
                                          : item,
                                    ),
                                  })),
                                );
                            }}
                            className={`block w-full rounded-xl border p-3 text-left text-sm ${notice.is_read ? "border-slate-200 text-slate-600" : "border-pink-300 bg-pink-50 text-slate-800"}`}
                          >
                            <p className="font-semibold">{notice.title}</p>
                            <p>{notice.message}</p>
                            <p className="mt-1 text-xs">
                              {new Date(notice.created_at).toLocaleString()}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        New gift card and account credit updates will appear
                        here.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
              {accountTab === "subscriptions" && token ? (
                <CustomerSubscriptions
                  slug={slug}
                  token={token}
                  addresses={addresses}
                />
              ) : null}
              {accountTab === "orders" ? (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-900">
                    <Package className="h-4 w-4" /> Order history
                  </h3>
                  {orders.length ? (
                    <>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="px-3 py-2">Order</th>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2 text-right">Total</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((order) => (
                              <tr
                                key={order.id}
                                className="border-t border-slate-200"
                              >
                                <td className="px-3 py-2 font-medium text-slate-900">
                                  {order.order_number}
                                </td>
                                <td className="px-3 py-2">
                                  {new Date(
                                    order.created_at,
                                  ).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2 capitalize">
                                  {order.fulfillment_status.replace(/_/g, " ")}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  ${Number(order.total_amount).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => void viewOrder(order.id)}
                                    className="text-xs font-semibold text-pink-700 hover:underline"
                                  >
                                    Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {selectedOrder ? (
                        <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-900">
                                {selectedOrder.order_number}
                              </p>
                              <p className="capitalize">
                                Payment:{" "}
                                {selectedOrder.payment_status.replace(
                                  /_/g,
                                  " ",
                                )}{" "}
                                | Fulfillment:{" "}
                                {selectedOrder.fulfillment_status.replace(
                                  /_/g,
                                  " ",
                                )}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(null)}
                              className="text-xs font-semibold text-pink-700 hover:underline"
                            >
                              Close
                            </button>
                          </div>
                          <div className="mt-3 space-y-2 border-y border-slate-200 py-3">
                            {selectedOrder.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between gap-3"
                              >
                                <span>
                                  {item.product_name} x {item.quantity}
                                </span>
                                <span>
                                  ${Number(item.line_total).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {selectedOrder.tracking_number ? (
                            <p className="mt-3">
                              <span className="font-semibold text-slate-900">
                                Tracking:
                              </span>{" "}
                              {selectedOrder.tracking_number}
                            </p>
                          ) : null}
                          {selectedOrder.shipping_street_address_1 ? (
                            <p className="mt-3">
                              <span className="font-semibold text-slate-900">
                                Shipping to:
                              </span>{" "}
                              {selectedOrder.shipping_recipient_name},{" "}
                              {selectedOrder.shipping_street_address_1}
                              {selectedOrder.shipping_street_address_2
                                ? `, ${selectedOrder.shipping_street_address_2}`
                                : ""}
                              , {selectedOrder.shipping_city},{" "}
                              {selectedOrder.shipping_state_region}{" "}
                              {selectedOrder.shipping_postal_code}
                            </p>
                          ) : null}
                          <p className="mt-3 text-right font-bold text-slate-900">
                            Total: $
                            {Number(selectedOrder.total_amount).toFixed(2)}
                          </p>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Your store orders will appear here.
                    </p>
                  )}
                </div>
              ) : null}
              {accountTab === "privacy" ? (
                <details className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
                  <summary className="cursor-pointer font-semibold text-slate-900">
                    Privacy and data retention
                  </summary>
                  <div className="mt-3 space-y-2">
                    <p>
                      Saved account details and addresses remain available while
                      your account is active. You can turn off optional messages
                      above at any time.
                    </p>
                    <p>
                      Deleting your account removes saved addresses and login
                      access. Completed order records, including the shipping
                      details used for fulfillment and payment-provider
                      references, are retained for seven years for accounting
                      and customer-service obligations.
                    </p>
                    <p>
                      Card, wallet, and PayPal credentials are handled by the
                      payment provider and are not stored in this app.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void deleteAccount()}
                    className="mt-4 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Delete customer account
                  </button>
                </details>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
