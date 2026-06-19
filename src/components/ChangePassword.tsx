"use client";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

export default function ChangePassword({ accentColor = "teal" }: { accentColor?: "teal" | "indigo" | "purple" }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);

  const ring = { teal: "focus:ring-teal-500", indigo: "focus:ring-indigo-500", purple: "focus:ring-purple-500" }[accentColor];
  const btn  = { teal: "bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400", indigo: "bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400", purple: "bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400" }[accentColor];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) { toast("New passwords do not match", "error"); return; }
    if (form.newPassword.length < 8) { toast("New password must be at least 8 characters", "warning"); return; }
    setLoading(true);

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { toast(data.error ?? "Failed to change password", "error"); return; }

    toast("Password changed successfully", "success");
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }

  const inputCls = `w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${ring} focus:border-transparent`;

  function PasswordField({ field, label, showKey }: { field: keyof typeof form; label: string; showKey: keyof typeof show }) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="relative">
          <input
            type={show[showKey] ? "text" : "password"}
            value={form[field]}
            onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
            required
            className={inputCls}
            placeholder="••••••••"
          />
          <button type="button" onClick={() => setShow((p) => ({ ...p, [showKey]: !p[showKey] }))}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-gray-400 hover:text-gray-600" tabIndex={-1}>
            <EyeIcon open={show[showKey]} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden max-w-md">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
        <p className="text-sm text-gray-500 mt-0.5">Update your account password</p>
      </div>

      <div className="px-6 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField field="currentPassword" label="Current Password" showKey="current" />
          <PasswordField field="newPassword" label="New Password" showKey="new" />
          <PasswordField field="confirmPassword" label="Confirm New Password" showKey="confirm" />
          <div className="pt-1">
            <button type="submit" disabled={loading}
              className={`${btn} text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors`}>
              {loading ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
