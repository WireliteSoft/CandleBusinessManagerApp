type Props = {
  email: string;
  error: string;
  password: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

export default function LoginForm({
  email,
  error,
  password,
  setEmail,
  setPassword,
  onSubmit,
}: Props) {
  return (
    <div className="min-h-screen app-theme flex items-center justify-center p-6">
      <form onSubmit={(e) => void onSubmit(e)} className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-800">Super Admin</h1>
        <p className="text-sm text-gray-600 mt-1">Restricted control panel</p>
        <div className="mt-4 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="w-full py-2 rounded-lg bg-red-700 text-white hover:bg-red-800">
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
}
