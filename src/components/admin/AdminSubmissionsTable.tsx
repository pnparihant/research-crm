"use client";
import { useEffect, useState, useCallback } from "react";
import {
  DataGrid, GridColDef, GridToolbarContainer, GridToolbarFilterButton,
  GridToolbarDensitySelector, GridToolbarColumnsButton, GridRenderCellParams,
  GridFilterModel, getGridStringOperators, getGridSingleSelectOperators,
} from "@mui/x-data-grid";
import { Chip, Tooltip, Box } from "@mui/material";

interface Row {
  id: string;
  date: string;
  salesPerson: string;
  clientName: string;
  designation: string;
  modeOfCommunication: string;
  formType: "research" | "institution";
  company: string;
  sector: string;
  cmpTarget: string;
  recommendation: "Buy" | "Sell" | "Hold" | "";
  analystName: string;
  buySideAnalystDesignation: string;
  rationale: string;
  feedback: string;
  others: string;
  submittedBy: string;
  submittedByEmail: string;
  submittedAt: string;
}

const REC_COLOR: Record<string, "success" | "error" | "warning"> = { Buy: "success", Sell: "error", Hold: "warning" };
const REC_STYLES: Record<string, string> = { Buy: "bg-green-100 text-green-700", Sell: "bg-red-100 text-red-700", Hold: "bg-yellow-100 text-yellow-700" };

function Toolbar() {
  return (
    <GridToolbarContainer sx={{ px: 2, py: 1.5, gap: 1 }}>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
    </GridToolbarContainer>
  );
}

const PAGE_LIMIT = 500;

function mapSubmissions(data: Record<string, unknown>[]): Row[] {
  return data.map((s) => {
    const user = s.userId as { name?: string; email?: string } | null;
    return {
      id: s._id as string,
      date: s.date as string,
      salesPerson: s.salesPerson as string,
      clientName: s.clientName as string,
      designation: (s.designation as string) ?? "",
      modeOfCommunication: (s.modeOfCommunication as string) ?? "",
      formType: ((s.formType as string) === "institution" ? "institution" : "research") as "research" | "institution",
      company: (s.company as string) ?? "",
      sector: (s.sector as string) ?? "",
      cmpTarget: (s.cmpTarget as string) ?? "",
      recommendation: (s.recommendation as "Buy" | "Sell" | "Hold") ?? "",
      analystName: (s.analystName as string) ?? "",
      buySideAnalystDesignation: (s.buySideAnalystDesignation as string) ?? "",
      rationale: (s.rationale as string) ?? "",
      feedback: (s.feedback as string) ?? "",
      others: (s.others as string) ?? "",
      submittedBy: user?.name ?? "—",
      submittedByEmail: user?.email ?? "—",
      submittedAt: new Date(s.submittedAt as string).toLocaleString("en-IN"),
    };
  });
}

export default function AdminSubmissionsTable() {
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [filteredRows, setFilteredRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [search, setSearch] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isLimited, setIsLimited] = useState(false);
  const [exporting, setExporting] = useState(false);

  function loadData(searchQuery = "", loadAll = false) {
    setLoading(true);
    const params = new URLSearchParams();
    if (loadAll) params.set("all", "true");
    else if (searchQuery) params.set("search", searchQuery);
    const qs = params.toString();
    const url = `/api/admin/submissions${qs ? "?" + qs : ""}`;
    fetch(url).then((r) => r.json()).then((data: Record<string, unknown>[]) => {
      const mapped = mapSubmissions(data);
      setAllRows(mapped); setFilteredRows(mapped); setLoading(false);
      setIsLimited(!loadAll && !searchQuery && data.length === PAGE_LIMIT);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  function handleServerSearch(e: React.FormEvent) {
    e.preventDefault();
    loadData(serverSearch);
  }

  const handleFilterModelChange = useCallback((model: GridFilterModel) => {
    setFilterModel(model);
    if (!model.items.length) { setFilteredRows(allRows); return; }
    setFilteredRows(allRows.filter((row) =>
      model.items.every((item) => {
        if (!item.value) return true;
        const cell = String(row[item.field as keyof Row] ?? "").toLowerCase();
        const val = String(item.value).toLowerCase();
        switch (item.operator) {
          case "contains": return cell.includes(val);
          case "equals": case "is": return cell === val;
          case "startsWith": return cell.startsWith(val);
          case "endsWith": return cell.endsWith(val);
          case "isAnyOf": return Array.isArray(item.value) && (item.value as string[]).map((v) => v.toLowerCase()).includes(cell);
          default: return cell.includes(val);
        }
      })
    ));
  }, [allRows]);

  const mobileFiltered = allRows.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.company.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q) ||
      r.salesPerson.toLowerCase().includes(q) || r.submittedBy.toLowerCase().includes(q);
  });

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/export", { method: "POST" });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Submissions_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const strOps = getGridStringOperators().filter((op) => ["contains", "equals", "startsWith", "endsWith"].includes(op.value));

  const columns: GridColDef[] = [
    { field: "date", headerName: "Date", width: 110, filterOperators: strOps },
    { field: "salesPerson", headerName: "Arihant Representative", width: 160, filterOperators: strOps },
    { field: "clientName", headerName: "Client", width: 200, filterOperators: strOps },
    { field: "designation", headerName: "Designation", width: 140, filterOperators: strOps },
    { field: "modeOfCommunication", headerName: "Mode", width: 130, filterOperators: strOps },
    {
      field: "formType", headerName: "Type", width: 120, type: "singleSelect", valueOptions: ["research", "institution"], filterOperators: getGridSingleSelectOperators(),
      renderCell: (p: GridRenderCellParams) => (
        <Chip label={p.value === "institution" ? "Institution" : "Research"} size="small" sx={{ fontWeight: 600, fontSize: 12, bgcolor: p.value === "institution" ? "#f3e8ff" : "#eff6ff", color: p.value === "institution" ? "#7e22ce" : "#1d4ed8" }} />
      ),
    },
    { field: "company", headerName: "Company", width: 150, filterOperators: strOps },
    { field: "sector", headerName: "Sector", width: 120, filterOperators: strOps },
    { field: "cmpTarget", headerName: "CMP & Target", width: 130, filterOperators: strOps },
    {
      field: "recommendation", headerName: "Rec.", width: 100, filterOperators: strOps,
      renderCell: (p: GridRenderCellParams) => p.value ? <Chip label={p.value as string} color={REC_COLOR[p.value as string] ?? "default"} size="small" sx={{ fontWeight: 600, fontSize: 12 }} /> : null,
    },
    { field: "analystName", headerName: "Buy Side Person", width: 160, filterOperators: strOps },
    { field: "buySideAnalystDesignation", headerName: "Buy Side Person Designation", width: 200, filterOperators: strOps },
    { field: "rationale", headerName: "Rationale", width: 200, filterOperators: strOps },
    { field: "feedback", headerName: "Feedback", width: 200, filterOperators: strOps },
    { field: "others", headerName: "Others", width: 200, filterOperators: strOps },
    {
      field: "submittedBy", headerName: "Submitted By", width: 150, filterOperators: strOps,
      renderCell: (p: GridRenderCellParams) => (
        <Tooltip title={p.row.submittedByEmail} placement="top" arrow><span>{p.value as string}</span></Tooltip>
      ),
    },
    { field: "submittedAt", headerName: "Submitted At", width: 170, filterOperators: strOps },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">All Submissions</h2>
            <p className="text-sm text-gray-500 mt-0.5">View and filter all client interaction records</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <form onSubmit={handleServerSearch} className="flex items-center gap-2 hidden sm:flex">
              <input
                type="text"
                value={serverSearch}
                onChange={(e) => setServerSearch(e.target.value)}
                placeholder="Search across all records…"
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
              />
              <button type="submit" className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors">Search</button>
              {serverSearch && <button type="button" onClick={() => { setServerSearch(""); loadData(); }} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>}
            </form>
            <span className="text-sm text-gray-500 hidden sm:inline">{filteredRows.length} / {allRows.length} rows</span>
            <button
              onClick={handleExport}
              disabled={allRows.length === 0}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Limited data banner */}
      {isLimited && (
        <div className="px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2 text-xs text-amber-700">
          <span>Showing latest {PAGE_LIMIT} records. Use the search above to find older entries.</span>
          <button onClick={() => { setServerSearch(""); loadData("", true); }} className="font-semibold underline hover:no-underline">Load all</button>
        </div>
      )}

      {/* Desktop DataGrid */}
      <div className="hidden md:block">
        <Box sx={{ width: "100%", height: 600 }}>
          <DataGrid
            rows={allRows} columns={columns} loading={loading} pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            filterModel={filterModel} onFilterModelChange={handleFilterModelChange}
            slots={{ toolbar: Toolbar }}
            disableRowSelectionOnClick
            sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { backgroundColor: "#eef2ff", fontWeight: 700, fontSize: 13 }, "& .MuiDataGrid-cell": { fontSize: 13 }, "& .MuiDataGrid-toolbarContainer": { borderBottom: "1px solid #e5e7eb" } }}
          />
        </Box>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search company, client, user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-2">{mobileFiltered.length} records</p>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        ) : mobileFiltered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No submissions found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {mobileFiltered.map((r) => (
              <div key={r.id}>
                <div className="px-4 py-3 cursor-pointer" onClick={() => setExpandedCard(expandedCard === r.id ? null : r.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {r.formType === "institution" ? (
                          <>
                            <span className="font-semibold text-gray-900 text-sm">{r.clientName}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">Institution</span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-gray-900 text-sm">{r.company || "—"}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">Research</span>
                            {r.recommendation && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${REC_STYLES[r.recommendation]}`}>{r.recommendation}</span>}
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{r.formType === "institution" ? r.salesPerson : `${r.clientName} · ${r.salesPerson}`}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.date}</p>
                    </div>
                    <svg className={`w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform ${expandedCard === r.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {expandedCard === r.id && (
                  <div className="px-4 pb-4 bg-gray-50 grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-gray-100">
                    {[
                      ["Designation", r.designation],
                      ["Mode", r.modeOfCommunication],
                      ...(r.formType !== "institution" ? [["Sector", r.sector], ["CMP & Target", r.cmpTarget]] : []),
                      ["Buy Side Person", r.analystName],
                      ["BS Analyst Designation", r.buySideAnalystDesignation],
                      ["Rationale", r.rationale],
                      ["Feedback", r.feedback],
                      ["Others", r.others],
                      ["Submitted By", r.submittedBy],
                      ["Submitted At", r.submittedAt],
                    ].map(([label, val]) => (
                      <div key={label} className="pt-3">
                        <p className="text-gray-400 uppercase tracking-wide font-medium mb-0.5" style={{ fontSize: 10 }}>{label}</p>
                        <p className="text-gray-800">{val || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
