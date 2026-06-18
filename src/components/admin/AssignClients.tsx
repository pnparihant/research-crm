"use client";
import { useEffect, useState } from "react";

interface ClientItem { _id: string; name: string }

interface AssignedEntry {
  client: ClientItem;
  assignedByName: string;
  assignedAt: string;
}

interface UserItem {
  _id: string;
  name: string;
  email: string;
  assignedClients: AssignedEntry[];
}

export default function AssignClients() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [allClients, setAllClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // clientId being toggled
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/master/companies").then((r) => r.json()),
    ]).then(([u, c]) => {
      setUsers(Array.isArray(u) ? u.map((user) => ({ ...user, assignedClients: user.assignedClients ?? [] })) : []);
      setAllClients(Array.isArray(c) ? c : []);
      setLoading(false);
    });
  }, []);

  function getAssignment(user: UserItem, clientId: string): AssignedEntry | undefined {
    return user.assignedClients.find((ac) => ac.client?._id === clientId);
  }

  async function toggle(user: UserItem, client: ClientItem) {
    const existing = getAssignment(user, client._id);
    const action = existing ? "remove" : "add";

    setSaving(user._id + client._id);
    const res = await fetch(`/api/admin/users?id=${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, clientId: client._id }),
    });
    setSaving(null);

    if (!res.ok) return;

    // Refetch this user's updated assignments
    const updated = await fetch("/api/admin/users").then((r) => r.json());
    if (Array.isArray(updated)) {
      setUsers(updated.map((u) => ({ ...u, assignedClients: u.assignedClients ?? [] })));
    }

    setSuccess(`${action === "add" ? "Assigned" : "Removed"} ${client.name} ${action === "add" ? "to" : "from"} ${user.name}`);
    setTimeout(() => setSuccess(""), 3000);
  }

  const filteredClients = allClients.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-500">Loading users…</p>
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Assign Clients to Users</h2>
        <p className="text-sm text-gray-500">Each user sees only their assigned clients in the form. Assignments are logged with the admin who made them.</p>
        {success && <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{success}</div>}
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
          No users found.
        </div>
      ) : (
        users.map((user) => (
          <div key={user._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setOpenUser(openUser === user._id ? null : user._id)}
            >
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                  {user.assignedClients.length} client{user.assignedClients.length !== 1 ? "s" : ""}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${openUser === user._id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {openUser === user._id && (
              <div className="border-t border-gray-100 px-5 py-4">
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search clients…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredClients.map((client) => {
                    const assignment = getAssignment(user, client._id);
                    const assigned = !!assignment;
                    const isSaving = saving === user._id + client._id;
                    return (
                      <label
                        key={client._id}
                        className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${assigned ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-indigo-200 hover:bg-gray-50"}`}
                      >
                        <div className="mt-0.5">
                          {isSaving ? (
                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <input
                              type="checkbox"
                              checked={assigned}
                              onChange={() => toggle(user, client)}
                              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 leading-tight">{client.name}</p>
                          {assigned && assignment && (
                            <p className="text-[10px] text-indigo-500 mt-0.5 truncate">
                              by {assignment.assignedByName} · {new Date(assignment.assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
                {filteredClients.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No clients match your search</p>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
