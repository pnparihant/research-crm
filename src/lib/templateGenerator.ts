import * as XLSX from "xlsx";
import crypto from "crypto";

export function signTemplate(userId: string, dateLabel: string): string {
  const secret = process.env.TEMPLATE_SECRET;
  if (!secret) throw new Error("TEMPLATE_SECRET env variable is not set");
  return crypto.createHmac("sha256", secret).update(`${userId}:${dateLabel}`).digest("hex");
}

export function verifyTemplateSignature(userId: string, dateLabel: string, signature: string): boolean {
  try {
    const expected = signTemplate(userId, dateLabel);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}


const DESIGNATIONS = [
  "Director of Equity Research",
  "Executive Vice President - Institutional Equity Sales",
  "Sr Equity Research Analyst",
  "Equity Research Analyst",
  "Institutional Equity Sales Manager",
  "Equity Research Associate",
  "Sr Manager Sales",
  "Buy Side Person",
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

const TEMPLATE_HEADERS = [
  "Sr.No",
  "Date",
  "Arihant Representative",
  "Designation",
  "Client Name",
  "Buy Side Person",
  "Buy Side Person Designation",
  "Mode of Communication",
  "Company",
  "Sector",
  "CMP & Target",
  "Buy / Sell / Hold",
  "Rationale",
  "Feedback",
];

/**
 * Generates an Excel template buffer with headers only (no sample row).
 * Embeds an HMAC signature in a hidden _sig sheet so the server can verify
 * the file is genuine and was generated for this specific user and date.
 */
export function generateTemplateBuffer(
  clientNames: string[] = [],
  userId?: string,
  dateLabel?: string
): Buffer {
  const wb = XLSX.utils.book_new();

  // Entries sheet — headers only
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length, 22) }));
  XLSX.utils.book_append_sheet(wb, ws, "Entries");

  // Reference sheet
  const refRows: (string | undefined)[][] = [
    ["Valid Designations", "Valid Modes", "Valid Recommendations"],
    ...DESIGNATIONS.map((d, i) => [d, MODES[i] ?? "", RECS[i] ?? ""]),
  ];
  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  wsRef["!cols"] = [{ wch: 50 }, { wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Reference");

  // My Clients sheet
  if (clientNames.length > 0) {
    const wsClients = XLSX.utils.aoa_to_sheet([
      ["Your Assigned Clients"],
      ...clientNames.map((n) => [n]),
    ]);
    wsClients["!cols"] = [{ wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsClients, "My Clients");
  }

  // Hidden signature sheet — HMAC(userId:dateLabel) so the server can verify authenticity
  if (userId && dateLabel) {
    const sig = signTemplate(userId, dateLabel);
    const wsSig = XLSX.utils.aoa_to_sheet([[sig]]);
    XLSX.utils.book_append_sheet(wb, wsSig, "_sig");
  }

  const raw = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(raw);
}
