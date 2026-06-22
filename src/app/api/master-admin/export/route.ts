import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";
import ExcelJS from "exceljs";

export async function POST(req: NextRequest) {
  console.log("[master-admin/export] POST — Excel export with password");
  const token = await getToken({ req });
  if (!token) {
    console.log("[master-admin/export] FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "master_admin") {
    console.log(`[master-admin/export] FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { password } = await req.json();
  if (!password || password.trim().length < 1) {
    console.log("[master-admin/export] FAIL — password missing");
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  await connectDB();
  const submissions = await FormSubmission.find()
    .populate<{ userId: { name: string; email: string } }>("userId", "name email")
    .sort({ createdAt: -1 })
    .lean();

  console.log(`[master-admin/export] Building workbook for ${submissions.length} submissions`);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Arihant Capital Markets";
  wb.created = new Date();

  const ws = wb.addWorksheet("All Submissions");

  const HEADER_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4B0082" }, // indigo/purple
  };
  const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const BORDER: Partial<ExcelJS.Borders> = {
    top:    { style: "thin", color: { argb: "FFD1D5DB" } },
    left:   { style: "thin", color: { argb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    right:  { style: "thin", color: { argb: "FFD1D5DB" } },
  };

  const columns = [
    { header: "Sr.No",                         key: "srno",       width: 7  },
    { header: "Date",                           key: "date",       width: 13 },
    { header: "Arihant Representative",         key: "rep",        width: 24 },
    { header: "Designation",                    key: "desig",      width: 20 },
    { header: "Client Name",                    key: "client",     width: 28 },
    { header: "Buy Side Analyst",               key: "analyst",    width: 24 },
    { header: "Buy Side Analyst Designation",   key: "adesig",     width: 28 },
    { header: "Mode of Communication",          key: "mode",       width: 20 },
    { header: "Company",                        key: "company",    width: 24 },
    { header: "Sector",                         key: "sector",     width: 18 },
    { header: "CMP & Target",                   key: "cmp",        width: 18 },
    { header: "Buy / Sell / Hold",              key: "rec",        width: 14 },
    { header: "Rationale",                      key: "rationale",  width: 35 },
    { header: "Feedback",                       key: "feedback",   width: 35 },
    { header: "Submitted By",                   key: "subBy",      width: 22 },
    { header: "Email",                          key: "email",      width: 30 },
    { header: "Submitted At",                   key: "subAt",      width: 20 },
  ];

  ws.columns = columns;

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = BORDER;
  });
  headerRow.height = 30;

  // Add data rows
  submissions.forEach((s, i) => {
    const user = s.userId as { name?: string; email?: string } | null;
    const rec = s.recommendation as string;
    const subAt = s.submittedAt ? new Date(s.submittedAt as Date) : null;

    const row = ws.addRow({
      srno:      i + 1,
      date:      s.date,
      rep:       s.salesPerson,
      desig:     s.designation,
      client:    s.clientName,
      analyst:   s.analystName,
      adesig:    s.buySideAnalystDesignation,
      mode:      s.modeOfCommunication,
      company:   s.company,
      sector:    s.sector,
      cmp:       s.cmpTarget,
      rec,
      rationale: s.rationale,
      feedback:  s.feedback,
      subBy:     user?.name ?? "",
      email:     user?.email ?? "",
      subAt:     subAt ? subAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
    });

    // Colour the recommendation cell
    const recCell = row.getCell("rec");
    if (rec === "Buy")  recCell.font = { color: { argb: "FF15803D" }, bold: true };
    if (rec === "Sell") recCell.font = { color: { argb: "FFB91C1C" }, bold: true };
    if (rec === "Hold") recCell.font = { color: { argb: "FFB45309" }, bold: true };

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = BORDER;
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });

  // Freeze header row
  ws.views = [{ state: "frozen", ySplit: 1 }];

  // Write with password encryption (requires-password-to-open)
  const buffer = await wb.xlsx.writeBuffer({ password: password.trim() }) as Buffer;
  const filename = `All_Submissions_${new Date().toISOString().slice(0, 10)}.xlsx`;

  console.log(`[master-admin/export] Done — ${submissions.length} rows, file=${filename}`);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
