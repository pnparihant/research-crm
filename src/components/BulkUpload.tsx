"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import * as XLSX from "xlsx";

interface ClientItem { _id: string; name: string }
interface StockItem  { StockName: string; sect_name: string }

interface Row {
  date: string;
  clientName: string;
  designation: string;
  modeOfCommunication: string;
  company: string;
  sector: string;
  cmpTarget: string;
  recommendation: string;
  analystName: string;
  buySideAnalystDesignation: string;
  rationale: string;
  feedback: string;
  _errors: string[];
}

const DESIGNATIONS = [
  "Director of Equity Research",
  "Executive Vice President - Institutional Equity Sales",
  "Sr Equity Research Analyst",
  "Equity Research Analyst",
  "Institutional Equity Sales Manager",
  "Equity Research Associate",
  "Sr Manager Sales",
  "Buy Side Analyst",
  "Intern",
  "Head Institutional Equities",
  "Institutional Sales Trader",
  "Institutional Dealer",
  "Institution Client Relationship",
  "Insti Backoffice Executive",
  "Back Office Operations",
];

const MODES = ["Phone", "Online Meet", "Physical"];
const RECS  = ["Buy", "Sell", "Hold"];

// Columns match the spec exactly — Sr.No and Arihant Representative are present but auto-handled
const TEMPLATE_HEADERS = [
  "Sr.No",
  "Date",
  "Arihant Representative",
  "Designation",
  "Client Name",
  "Buy Side Analyst",
  "Buy Side Analyst Designation",
  "Mode of Communication",
  "Company",
  "Sector",
  "CMP & Target",
  "Buy / Sell / Hold",
  "Rationale",
  "Feedback",
];

// Parse a date string in DD/MM/YYYY or YYYY-MM-DD or Excel serial
function parseDate(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  // Excel serial number
  if (/^\d{5}$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(Number(s));
    if (d) return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
  }
  // DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2,"0")}-${dmyMatch[1].padStart(2,"0")}`;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

function validateRow(row: Omit<Row, "_errors">, _clients: ClientItem[], stocks: StockItem[]): string[] {
  const errs: string[] = [];
  // Only flag invalid values — blank is always fine
  if (row.modeOfCommunication && !MODES.includes(row.modeOfCommunication))
    errs.push(`Mode must be: ${MODES.join(" / ")}`);
  if (row.recommendation && !RECS.includes(row.recommendation))
    errs.push(`Rec. must be: ${RECS.join(" / ")}`);
  // Auto-fill sector from stock list
  if (row.company && stocks.length > 0) {
    const match = stocks.find(s => s.StockName.toLowerCase() === row.company.toLowerCase());
    if (match) row.sector = match.sect_name ?? "";
  }
  return errs;
}

function downloadTemplate(clients: ClientItem[], userName: string) {
  const wb = XLSX.utils.book_new();

  const sampleRow = [
    1,
    "18/06/2026",
    userName,
    "Equity Research Analyst",
    clients[0]?.name ?? "Client Name",
    "John Analyst",
    "Portfolio Manager",
    "Phone",
    "ACC",
    "",           // Sector — auto-filled
    "CMP 2400 / Target 2800",
    "Buy",
    "",
    "",
  ];

  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, sampleRow]);
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length, 22) }));
  XLSX.utils.book_append_sheet(wb, ws, "Entries");

  // Reference sheet
  const refRows = [
    ["Valid Designations", "Valid Modes", "Valid Recommendations"],
    ...DESIGNATIONS.map((d, i) => [d, MODES[i] ?? "", RECS[i] ?? ""]),
  ];
  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  wsRef["!cols"] = [{ wch: 50 }, { wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Reference");

  // Client list sheet
  if (clients.length > 0) {
    const wsClients = XLSX.utils.aoa_to_sheet([["Your Assigned Clients"], ...clients.map(c => [c.name])]);
    wsClients["!cols"] = [{ wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsClients, "My Clients");
  }

  XLSX.writeFile(wb, `CRM_Bulk_Template_${userName.replace(/\s+/g, "_")}.xlsx`);
}

export default function BulkUpload({ onSubmitted, userName }: { onSubmitted: () => void; userName: string }) {
  const [rows, setRows]         = useState<Row[]>([]);
  const [clients, setClients]   = useState<ClientItem[]>([]);
  const [stocks, setStocks]     = useState<StockItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/users/my-clients").then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/mssql/stocks").then(r => r.json()).then(d => setStocks(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Required columns that must be present (subset — Sr.No and Arihant Rep are auto)
  const REQUIRED_HEADERS = ["Date", "Client Name", "Mode of Communication", "Company", "Buy / Sell / Hold"];

  const parseFile = useCallback((file: File) => {
    setSheetError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb   = XLSX.read(data, { type: "array", cellDates: true });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: "yyyy-mm-dd" });

      // Validate header row
      const headerRow = (raw[0] ?? []) as string[];
      const missing = REQUIRED_HEADERS.filter(
        (h) => !headerRow.some((cell) => String(cell ?? "").trim().toLowerCase() === h.toLowerCase())
      );
      if (missing.length > 0) {
        const msg = `Wrong Excel sheet — missing columns: ${missing.join(", ")}. Please use the provided template.`;
        setSheetError(msg);
        toast(msg, "error");
        setRows([]);
        return;
      }

      // Skip header row
      const dataRows = raw.slice(1).filter(r => (r as string[]).some(Boolean));

      const parsed: Row[] = dataRows.map((r) => {
        const arr = r as string[];
        // Column order: Sr.No(0) | Date(1) | Arihant Rep(2) | Designation(3) | Client Name(4)
        //   Buy Side Analyst(5) | BS Analyst Designation(6) | Mode(7) | Company(8)
        //   Sector(9) | CMP & Target(10) | Rec(11) | Rationale(12) | Feedback(13)
        const base: Omit<Row, "_errors"> = {
          date:                parseDate((arr[1] ?? "").toString()),
          designation:         (arr[3] ?? "").toString().trim(),
          clientName:          (arr[4] ?? "").toString().trim(),
          analystName:         (arr[5] ?? "").toString().trim(),
          buySideAnalystDesignation: (arr[6] ?? "").toString().trim(),
          modeOfCommunication: (arr[7] ?? "").toString().trim(),
          company:             (arr[8] ?? "").toString().trim(),
          sector:              (arr[9] ?? "").toString().trim(),
          cmpTarget:           (arr[10] ?? "").toString().trim(),
          recommendation:      (arr[11] ?? "").toString().trim(),
          rationale:           (arr[12] ?? "").toString().trim(),
          feedback:            (arr[13] ?? "").toString().trim(),
        };
        return { ...base, _errors: validateRow(base, clients, stocks) };
      });

      setRows(parsed);
      setSubmitError("");
      setSubmitSuccess(false);
      if (parsed.length === 0) {
        const msg = "The sheet appears to be empty — no data rows found.";
        setSheetError(msg);
        toast(msg, "warning");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [clients, stocks, toast]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setSheetError(null); parseFile(f); }
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  }

  async function handleSubmit() {
    const valid = rows.filter(r => r._errors.length === 0);
    if (valid.length === 0) { setSubmitError("No valid rows to submit"); return; }
    setLoading(true);
    setSubmitError("");

    const payload = valid.map(({ _errors: _, ...r }) => ({ ...r, salesPerson: userName }));
    const res = await fetch("/api/forms/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const msg = data.error ?? "Submission failed";
      setSubmitError(msg);
      toast(msg, "error");
      return;
    }
    setSubmitSuccess(true);
    toast(`${validCount} entr${validCount === 1 ? "y" : "ies"} submitted successfully!`, "success");
    setRows([]);
    setTimeout(() => { setSubmitSuccess(false); onSubmitted(); }, 2000);
  }

  const validCount   = rows.filter(r => r._errors.length === 0).length;
  const invalidCount = rows.filter(r => r._errors.length > 0).length;

  return (
    <>
    {showConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Confirm submission</h3>
              <p className="text-sm text-gray-500">You are about to submit {validCount} entr{validCount === 1 ? "y" : "ies"}.</p>
            </div>
          </div>
          {invalidCount > 0 && (
            <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>{invalidCount} row{invalidCount > 1 ? "s" : ""} with errors will be skipped. Only valid rows will be submitted.</span>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { setShowConfirm(false); handleSubmit(); }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg transition-colors"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? "Submitting…" : "Yes, submit"}
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-4 sm:px-8 py-5 sm:py-6">
        <p className="text-teal-200 text-xs font-semibold uppercase tracking-widest mb-1">Arihant Capital Markets</p>
        <h2 className="text-2xl font-bold text-white tracking-tight">Bulk Upload</h2>
        <p className="text-teal-100/80 text-sm mt-1">Upload an Excel file to log multiple interactions at once</p>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-5">

        {/* Step 1: Download template */}
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Step 1 — Download Template</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-gray-600 flex-1">
              Get the Excel template with correct column headers, a sample row, and reference sheets for valid designations &amp; client names.
            </p>
            <button
              onClick={() => downloadTemplate(clients, userName)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-sm font-semibold hover:bg-teal-100 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Template
            </button>
          </div>
        </div>

        {/* Step 2: Upload */}
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Step 2 — Upload Filled Excel</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? "border-teal-500 bg-teal-50" : "border-gray-300 hover:border-teal-400 hover:bg-gray-50"}`}
          >
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-700">Click to upload or drag &amp; drop</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx or .xls files only</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFileChange} className="hidden" />
          </div>
          {sheetError && (
            <div className="mt-3 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Wrong file detected</p>
                <p className="text-xs text-red-600 mt-0.5">{sheetError}</p>
              </div>
              <button onClick={() => setSheetError(null)} className="text-red-400 hover:text-red-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
        </div>

        {/* Step 3: Preview & Submit */}
        {rows.length > 0 && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Step 3 — Review &amp; Submit</p>
              <div className="flex items-center gap-3 flex-wrap">
                {validCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {validCount} ready
                  </span>
                )}
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {invalidCount} error{invalidCount > 1 ? "s" : ""}
                  </span>
                )}
                <button onClick={() => { setRows([]); setSubmitError(""); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Clear
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Date</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Client</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Designation</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Mode</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Company</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Sector</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">CMP / Target</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Rec.</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Analyst</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">BS Analyst Designation</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Rationale</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Feedback</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const ok = row._errors.length === 0;
                    return (
                      <tr key={i} className={`border-b border-gray-100 ${ok ? "hover:bg-gray-50" : "bg-red-50 hover:bg-red-100"}`}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.date || <span className="text-red-400">—</span>}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[120px] truncate">{row.clientName || <span className="text-red-400">—</span>}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[140px] truncate">{row.designation || <span className="text-red-400">—</span>}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.modeOfCommunication || <span className="text-red-400">—</span>}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[120px] truncate">{row.company || <span className="text-red-400">—</span>}</td>
                        <td className="px-3 py-2 text-gray-500">{row.sector || "—"}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.cmpTarget || <span className="text-red-400">—</span>}</td>
                        <td className="px-3 py-2">
                          {row.recommendation ? (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${row.recommendation === "Buy" ? "bg-green-100 text-green-700" : row.recommendation === "Sell" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                              {row.recommendation}
                            </span>
                          ) : <span className="text-red-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-700 max-w-[100px] truncate">{row.analystName || <span className="text-red-400">—</span>}</td>
                        <td className="px-3 py-2 text-gray-500 max-w-[120px] truncate">{row.buySideAnalystDesignation || "—"}</td>
                        <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">{row.rationale || "—"}</td>
                        <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">{row.feedback || "—"}</td>
                        <td className="px-3 py-2">
                          {ok ? (
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span title={row._errors.join("\n")} className="inline-flex items-center gap-1 text-red-600 cursor-help">
                              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span className="text-[10px]">{row._errors[0]}{row._errors.length > 1 ? ` +${row._errors.length - 1}` : ""}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Submit bar */}
            <div className="px-5 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}
              {submitSuccess && (
                <p className="text-sm text-green-600 font-medium">✓ {validCount} entries submitted successfully!</p>
              )}
              {!submitError && !submitSuccess && invalidCount > 0 && (
                <p className="text-xs text-amber-600">Fix errors above before submitting, or only valid rows will be submitted.</p>
              )}
              {!submitError && !submitSuccess && invalidCount === 0 && <span />}

              <button
                onClick={() => setShowConfirm(true)}
                disabled={loading || submitSuccess || validCount === 0}
                className="inline-flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors shrink-0"
              >
                {submitSuccess ? "Submitted!" : `Submit ${validCount} Entr${validCount === 1 ? "y" : "ies"}`}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
    </>
  );
}
