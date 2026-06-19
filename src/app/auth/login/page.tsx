"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type LoginTab = "client" | "admin";
type Step = "credentials" | "2fa" | "forgot";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function redirectForRole(role: string) {
  if (role === "master_admin") return "/master-admin";
  if (role === "admin") return "/admin";
  return "/dashboard";
}

const TAB_CONFIG: Record<LoginTab, {
  label: string; placeholder: string;
  expectedRoles: string[]; ring: string; btn: string; icon: React.ReactNode;
}> = {
  client: {
    label: "Client Login",
    placeholder: "you@example.com",
    expectedRoles: ["user"],
    ring: "focus:ring-teal-500",
    btn: "bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  admin: {
    label: "Admin Login",
    placeholder: "admin@cms.com",
    expectedRoles: ["admin", "master_admin"],
    ring: "focus:ring-indigo-500",
    btn: "bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LoginTab>("client");
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotResetUrl, setForgotResetUrl] = useState("");

  function switchTab(tab: LoginTab) {
    setActiveTab(tab);
    setEmail("");
    setPassword("");
    setOtp("");
    setError("");
    setStep("credentials");
    setShowPassword(false);
    setForgotSent(false);
    setForgotEmail("");
    setForgotResetUrl("");
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
    setForgotSent(true);
    if (data.resetUrl) setForgotResetUrl(data.resetUrl);
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError("Invalid email or password"); return; }

    const session = await fetch("/api/auth/session").then((r) => r.json());
    const role: string = session?.user?.role ?? "user";

    if (!TAB_CONFIG[activeTab].expectedRoles.includes(role)) {
      setError("This account does not have access to this login");
      return;
    }

    if (session?.user?.twoFactorEnabled) {
      setStep("2fa");
    } else {
      router.push("/auth/setup-2fa");
    }
  }

  async function handle2FA(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: otp }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Invalid OTP code"); return; }

    const s = await fetch("/api/auth/session").then((r) => r.json());
    router.push(redirectForRole(s?.user?.role ?? "user"));
  }

  const cfg = TAB_CONFIG[activeTab];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Tabs — 2 only */}
        <div className="grid grid-cols-2">
          {(Object.keys(TAB_CONFIG) as LoginTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all border-b-2 ${
                activeTab === tab
                  ? tab === "admin"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50"
                    : "border-teal-600 text-teal-600 bg-teal-50"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              {TAB_CONFIG[tab].icon}
              {TAB_CONFIG[tab].label}
            </button>
          ))}
        </div>

        <div className="p-8">
          <div className="text-center mb-7">
            <h1 className="text-xl font-bold text-gray-900">
              {step === "2fa" ? "Two-Factor Authentication" : step === "forgot" ? "Forgot Password" : cfg.label}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {step === "2fa"
                ? "Enter the 6-digit code from your authenticator app"
                : step === "forgot"
                ? "Enter your email to receive a reset link"
                : "Enter your credentials to continue"}
            </p>
            {step === "2fa" && (
              <p className="text-amber-600 text-xs mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Codes refresh every 30 seconds. If the current code is rejected, wait for the next one and try again.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
              {error}
            </div>
          )}

          {step === "credentials" ? (
            <form onSubmit={handleCredentials} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${cfg.ring}`}
                  placeholder={cfg.placeholder}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setStep("forgot"); setError(""); setForgotSent(false); setForgotResetUrl(""); }}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${cfg.ring}`}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className={`w-full ${cfg.btn} text-white font-semibold py-2.5 rounded-lg transition-colors`}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : step === "2fa" ? (
            <form onSubmit={handle2FA} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Authentication Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength={6}
                  autoFocus
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${cfg.ring} text-center text-2xl tracking-widest font-mono`}
                  placeholder="000000"
                />
              </div>
              <button type="submit" disabled={loading || otp.length < 6} className={`w-full ${cfg.btn} text-white font-semibold py-2.5 rounded-lg transition-colors`}>
                {loading ? "Verifying..." : "Verify"}
              </button>
              <button type="button" onClick={() => { setStep("credentials"); setOtp(""); setError(""); }} className="w-full text-gray-400 hover:text-gray-600 text-sm">
                ← Back
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              {!forgotSent ? (
                <form onSubmit={handleForgot} className="space-y-5">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      autoFocus
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${cfg.ring}`}
                      placeholder={cfg.placeholder}
                    />
                  </div>
                  <button type="submit" disabled={loading} className={`w-full ${cfg.btn} text-white font-semibold py-2.5 rounded-lg transition-colors`}>
                    {loading ? "Sending…" : "Send Reset Link"}
                  </button>
                  <button type="button" onClick={() => { setStep("credentials"); setError(""); }} className="w-full text-gray-400 hover:text-gray-600 text-sm">
                    ← Back to login
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm text-green-800">
                    <p className="font-semibold mb-1">Check your email</p>
                    <p>If <span className="font-medium">{forgotEmail}</span> is registered, a reset link has been sent. It expires in 1 hour.</p>
                  </div>
                  {forgotResetUrl && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 text-sm">
                      <p className="text-amber-800 font-semibold mb-2">Dev mode — reset link:</p>
                      <a href={forgotResetUrl} className="text-teal-600 break-all text-xs hover:underline">{forgotResetUrl}</a>
                    </div>
                  )}
                  <button type="button" onClick={() => { setStep("credentials"); setForgotSent(false); setError(""); }} className="w-full text-gray-400 hover:text-gray-600 text-sm">
                    ← Back to login
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
