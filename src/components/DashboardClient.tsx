"use client";
import { useState } from "react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import FillForm from "./FillForm";
import BulkUpload from "./BulkUpload";
import History from "./History";
import TwoFactorSettings from "./TwoFactorSettings";
import ChangePassword from "./ChangePassword";

type Tab = "fill" | "bulk" | "history" | "settings";

export default function DashboardClient({ session }: { session: Session }) {
  const [activeTab, setActiveTab] = useState<Tab>("fill");
  const [refreshKey, setRefreshKey] = useState(0);

  function onFormSubmitted() {
    setRefreshKey((k) => k + 1);
    setActiveTab("history");
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "fill",
      label: "Fill Form",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      id: "bulk",
      label: "Bulk Upload",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
    },
    {
      id: "history",
      label: "History",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: "settings",
      label: "Security",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">CMS</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Show Arihant Representative name prominently */}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{session.user.name}</p>
              <p className="text-xs text-teal-600 font-medium">Arihant Representative</p>
            </div>
            {session.user.twoFactorEnabled && (
              <span className="hidden sm:flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0110 1.944 11.954 11.954 0 0117.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                2FA On
              </span>
            )}
            <button
              onClick={async () => { await signOut({ redirect: false }); window.location.href = "/auth/login"; }}
              className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "fill" && <FillForm onSubmitted={onFormSubmitted} userName={session.user.name} />}
        {activeTab === "bulk" && <BulkUpload onSubmitted={onFormSubmitted} userName={session.user.name} />}
        {activeTab === "history" && <History key={refreshKey} />}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <TwoFactorSettings twoFactorEnabled={session.user.twoFactorEnabled} />
            <ChangePassword accentColor="teal" />
          </div>
        )}
      </main>
    </div>
  );
}
