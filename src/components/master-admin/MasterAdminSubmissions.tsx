"use client";
import { useEffect, useState, useCallback } from "react";
import {
  DataGrid, GridColDef, GridToolbarContainer, GridToolbarFilterButton,
  GridToolbarDensitySelector, GridToolbarColumnsButton, GridRenderCellParams,
  GridFilterModel, getGridStringOperators, getGridSingleSelectOperators,
} from "@mui/x-data-grid";
import { Chip, Tooltip, Box } from "@mui/material";
import { utils, writeFile } from "xlsx";

interface Row {
  id: string;
  date: string;
  salesPerson: string;
  clientName: string;
  designation: string;
  modeOfCommunication: string;
  company: string;
  sector: string;
  cmpTarget: string;
  recommendation: "Buy" | "Sell" | "Hold";
  analystName: string;
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

export default function MasterAdminSubmissions() {
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [filteredRows, setFilteredRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [search, setSearch] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/master-admin/submissions").then((r) => r.json()).then((data: Record<string, unknown>[]) => {
      const mapped = data.map((s) => {
        const user = s.userId as { name?: string; email?: string } | null;
        return {
          id: s._id as string,
          date: s.date as string,
          salesPerson: s.salesPerson as string,
          clientName: s.clientName as string,
          designation: (s.designation as string) ?? "",
          modeOfCommunication: (s.modeOfCommunication as string) ?? "",
          company: (s.company as string) ?? "",
          sector: (s.sector as string) ?? "",
          cmpTarget: (s.cmpTarget as string) ?? "",
          recommendation: s.recommendation as "Buy" | "Sell" | "Hold",
          analystName: (s.analystName as string) ?? "",
          submittedBy: user?.name ?? "—",
          submittedByEmail: user?.email ?? "—",
          submittedAt: new Date(s.submittedAt as string).toLocaleString("en-IN"),
        };
      });
      setAllRows(mapped); setFilteredRows(mapped); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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

  function exportExcel() {
    if (!filteredRows.length) return;
    const data = filteredRows.map((r) => ({
      Date: r.date, "Sales Person": r.salesPerson, "Client Name": r.clientName,
      Designation: r.designation, "Mode of Communication": r.modeOfCommunication,
      Company: r.company, Sector: r.sector, "CMP & Target": r.cmpTarget,
      Recommendation: r.recommendation, "Analyst Name": r.analystName,
      "Submitted By": r.submittedBy, Email: r.submittedByEmail, "Submitted At": r.submittedAt,
    }));
    const ws = utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0]).map((k) => ({ wch: Math.max(k.length, ...data.map((r) => String(r[k as keyof typeof r] ?? "").length)) + 2 }));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "All Submissions");
    writeFile(wb, `All_Submissions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const strOps = getGridStringOperators().filter((op) => ["contains", "equals", "startsWith", "endsWith"].includes(op.value));

  const columns: GridColDef[] = [
    { field: "date", headerName: "Date", width: 110, filterOperators: strOps },
    { field: "salesPerson", headerName: "Sales Person", width: 160, filterOperators: strOps },
    { field: "clientName", headerName: "Client", width: 200, filterOperators: strOps },
    { field: "designation", headerName: "Designation", width: 140, filterOperators: strOps },
    { field: "modeOfCommunication", headerName: "Mode", width: 130, type: "singleSelect", valueOptions: ["Phone", "Online Meet", "Physical"], filterOperators: getGridSingleSelectOperators() },
    { field: "company", headerName: "Company", width: 150, filterOperators: strOps },
    { field: "sector", headerName: "Sector", width: 120, filterOperators: strOps },
    { field: "cmpTarget", headerName: "CMP & Target", width: 130, filterOperators: strOps },
    {
      field: "recommendation", headerName: "Rec.", width: 100, type: "singleSelect", valueOptions: ["Buy", "Sell", "Hold"], filterOperators: getGridSingleSelectOperators(),
      renderCell: (p: GridRenderCellParams) => <Chip label={p.value as string} color={REC_COLOR[p.value as string] ?? "default"} size="small" sx={{ fontWeight: 600, fontSize: 12 }} />,
    },
    { field: "analystName", headerName: "Analyst", width: 150, filterOperators: strOps },
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
            <p className="text-sm text-gray-500 mt-0.5">Complete view across all admins and clients</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:inline">{filteredRows.length} / {allRows.length} rows</span>
            <button
              onClick={exportExcel}
              disabled={allRows.length === 0}
              className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Desktop DataGrid */}
      <div className="hidden md:block">
        <Box sx={{ width: "100%", height: 600 }}>
          <DataGrid
            rows={allRows} columns={columns} loading={loading} pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            filterModel={filterModel} onFilterModelChange={handleFilterModelChange}
            slots={{ toolbar: Toolbar }}
            disableRowSelectionOnClick
            sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { backgroundColor: "#faf5ff", fontWeight: 700, fontSize: 13 }, "& .MuiDataGrid-cell": { fontSize: 13 }, "& .MuiDataGrid-toolbarContainer": { borderBottom: "1px solid #e5e7eb" } }}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-400 mt-2">{mobileFiltered.length} records</p>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
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
                        <span className="font-semibold text-gray-900 text-sm">{r.company || "—"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${REC_STYLES[r.recommendation]}`}>{r.recommendation}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{r.clientName} · {r.salesPerson}</p>
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
                      ["Sector", r.sector],
                      ["CMP & Target", r.cmpTarget],
                      ["Analyst", r.analystName],
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
