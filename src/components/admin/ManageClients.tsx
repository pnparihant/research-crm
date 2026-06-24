"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

const CATEGORIES = [
  "Mutual Fund",
  "PMS",
  "AIF",
  "Domestic Financial Institution",
  "Insurance",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Mutual Fund":                   "bg-blue-50 text-blue-700 border-blue-200",
  "PMS":                           "bg-purple-50 text-purple-700 border-purple-200",
  "AIF":                           "bg-amber-50 text-amber-700 border-amber-200",
  "Domestic Financial Institution": "bg-teal-50 text-teal-700 border-teal-200",
  "Insurance":                     "bg-rose-50 text-rose-700 border-rose-200",
};

interface ClientDoc {
  _id: string;
  name: string;
  category: string;
}

export default function ManageClients() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState(CATEGORIES[0]);
  const [addSaving, setAddSaving] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<ClientDoc | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ClientDoc | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/master/clients")
      .then((r) => r.json())
      .then((data) => { setClients(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const grouped = CATEGORIES.reduce<Record<string, ClientDoc[]>>((acc, cat) => {
    const q = search.toLowerCase();
    acc[cat] = clients.filter(
      (c) => c.category === cat && (!q || c.name.toLowerCase().includes(q))
    );
    return acc;
  }, {});

  const displayCategories = filterCat === "all"
    ? CATEGORIES.filter((cat) => grouped[cat].length > 0 || !search)
    : [filterCat];

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    const res = await fetch("/api/master/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addName, category: addCategory }),
    });
    const data = await res.json();
    setAddSaving(false);
    if (!res.ok) { toast(data.error ?? "Failed to add client", "error"); return; }
    setClients((prev) => [...prev, data].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
    setAddName("");
    setShowAdd(false);
    toast(`"${data.name}" added`, "success");
  }

  function openEdit(c: ClientDoc) {
    setEditTarget(c);
    setEditName(c.name);
    setEditCategory(c.category);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    const res = await fetch(`/api/master/clients?id=${editTarget._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, category: editCategory }),
    });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) { toast(data.error ?? "Failed to update client", "error"); return; }
    setClients((prev) =>
      prev.map((c) => c._id === editTarget._id ? data : c)
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    );
    toast(`"${data.name}" updated`, "success");
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/master/clients?id=${deleteTarget._id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast("Failed to delete client", "error"); setDeleteTarget(null); return; }
    setClients((prev) => prev.filter((c) => c._id !== deleteTarget._id));
    toast(`"${deleteTarget.name}" deleted`, "warning");
    setDeleteTarget(null);
  }

  const totalVisible = displayCategories.reduce((n, cat) => n + grouped[cat].length, 0);

  return (
    <>
      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">Edit Client</h3>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                <input
                  type="text" required value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-3 pt-1 justify-end">
                <button type="button" onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors">
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete Client?</h3>
                <p className="text-sm text-gray-500 mt-0.5">{deleteTarget.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">This will permanently remove this client from the system.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors">
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5 max-w-4xl">
        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Clients</h2>
              <p className="text-sm text-gray-500 mt-0.5">Add, edit or remove institutional clients grouped by category.</p>
            </div>
            <button
              onClick={() => { setShowAdd((v) => !v); setAddName(""); setAddCategory(CATEGORIES[0]); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Client
            </button>
          </div>

          {/* Add form */}
          {showAdd && (
            <form onSubmit={handleAdd} className="mt-2 p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">New Client</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                  <input
                    type="text" required value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Full client / fund name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={addSaving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors">
                  {addSaving ? "Adding…" : "Add Client"}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Search + category filter */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                type="text" placeholder="Search clients…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
              />
            </div>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Client list grouped by category */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : totalVisible === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
            {search ? `No clients match "${search}"` : "No clients yet. Add one above."}
          </div>
        ) : (
          displayCategories.map((cat) => {
            const list = grouped[cat];
            if (list.length === 0 && search) return null;
            const colorCls = CATEGORY_COLORS[cat] ?? "bg-gray-50 text-gray-600 border-gray-200";
            return (
              <div key={cat} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colorCls}`}>{cat}</span>
                    <span className="text-xs text-gray-400">{list.length} {list.length === 1 ? "client" : "clients"}</span>
                  </div>
                </div>

                {list.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-gray-400">No clients in this category yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {list.map((c) => (
                      <li key={c._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group">
                        <span className="text-sm text-gray-800 font-medium">{c.name}</span>
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(c)}
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="text-xs text-red-400 hover:text-red-600 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
