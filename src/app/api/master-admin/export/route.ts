import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { withErrorHandler } from "@/lib/apiHandler";

let activeExports = 0;
const MAX_CONCURRENT_EXPORTS = 2;

type SubmissionLean = {
  userId: { name?: string; email?: string } | null;
  formType?: string;
  recommendation: string;
  submittedAt?: Date;
  date?: string;
  salesPerson?: string;
  designation?: string;
  clientName?: string;
  analystName?: string;
  buySideAnalystDesignation?: string;
  modeOfCommunication?: string;
  company?: string;
  sector?: string;
  cmpTarget?: string;
  rationale?: string;
  feedback?: string;
  others?: string;
};

const _POST = async (req: NextRequest) => {
  console.log("[master-admin/export] POST — Excel export with password");

  if (activeExports >= MAX_CONCURRENT_EXPORTS) {
    console.warn("[master-admin/export] Too many concurrent exports, rejecting");
    return NextResponse.json(
      { error: "An export is already in progress. Please wait and try again." },
      { status: 429 }
    );
  }

  const session = await auth();
  if (!session?.user) {
    console.log("[master-admin/export] FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "master_admin") {
    console.log(`[master-admin/export] FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { password } = await req.json();
  if (!password || password.trim().length < 1) {
    console.log("[master-admin/export] FAIL — password missing");
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  activeExports++;

  try {
    await connectDB();
    const submissions = await FormSubmission.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean() as unknown as SubmissionLean[];

    console.log(`[master-admin/export] Building workbook for ${submissions.length} submissions`);

    const wb = new ExcelJS.Workbook();
    wb.creator = "Arihant Capital Markets";
    wb.created = new Date();

    const ws = wb.addWorksheet("All Submissions");

    const HEADER_FILL: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4B0082" },
    };
    const HEADER_FONT: Partial<ExcelJS.Font> = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };
    const BORDER: Partial<ExcelJS.Borders> = {
      top:    { style: "thin", color: { argb: "FFD1D5DB" } },
      left:   { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      right:  { style: "thin", color: { argb: "FFD1D5DB" } },
    };

    ws.columns = [
      { header: "Sr.No",                        key: "srno",      width: 7  },
      { header: "Type",                          key: "type",      width: 14 },
      { header: "Date",                          key: "date",      width: 13 },
      { header: "Arihant Representative",        key: "rep",       width: 24 },
      { header: "Designation",                   key: "desig",     width: 20 },
      { header: "Client Name",                   key: "client",    width: 28 },
      { header: "Buy Side Person",               key: "analyst",   width: 24 },
      { header: "Buy Side Person Designation",   key: "adesig",    width: 28 },
      { header: "Mode of Communication",         key: "mode",      width: 20 },
      { header: "Company",                       key: "company",   width: 24 },
      { header: "Sector",                        key: "sector",    width: 18 },
      { header: "CMP & Target",                  key: "cmp",       width: 18 },
      { header: "Buy / Sell / Hold",             key: "rec",       width: 14 },
      { header: "Rationale",                     key: "rationale", width: 35 },
      { header: "Feedback",                      key: "feedback",  width: 35 },
      { header: "Others",                        key: "others",    width: 35 },
      { header: "Submitted By",                  key: "subBy",     width: 22 },
      { header: "Email",                         key: "email",     width: 30 },
      { header: "Submitted At",                  key: "subAt",     width: 20 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = BORDER;
    });
    headerRow.height = 30;

    submissions.forEach((s, i) => {
      const user = s.userId;
      const rec = s.recommendation;
      const isInsti = s.formType === "institution";
      const subAt = s.submittedAt ? new Date(s.submittedAt) : null;

      const row = ws.addRow({
        srno:      i + 1,
        type:      isInsti ? "Institution" : "Research",
        date:      s.date,
        rep:       s.salesPerson,
        desig:     s.designation,
        client:    s.clientName,
        analyst:   s.analystName,
        adesig:    s.buySideAnalystDesignation,
        mode:      s.modeOfCommunication,
        company:   isInsti ? "" : s.company,
        sector:    isInsti ? "" : s.sector,
        cmp:       isInsti ? "" : s.cmpTarget,
        rec:       isInsti ? "" : rec,
        rationale: s.rationale,
        feedback:  s.feedback,
        others:    s.others,
        subBy:     user?.name ?? "",
        email:     user?.email ?? "",
        subAt:     subAt
          ? subAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          : "",
      });

      // Type cell colour
      const typeCell = row.getCell("type");
      typeCell.font = { bold: true, color: { argb: isInsti ? "FF6B21A8" : "FF1D4ED8" } };

      // Rec cell colour (research only)
      if (!isInsti) {
        const recCell = row.getCell("rec");
        if (rec === "Buy")  recCell.font = { color: { argb: "FF15803D" }, bold: true };
        if (rec === "Sell") recCell.font = { color: { argb: "FFB91C1C" }, bold: true };
        if (rec === "Hold") recCell.font = { color: { argb: "FFB45309" }, bold: true };
      }

      // Light background for institution rows
      if (isInsti) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF5FF" } };
        });
      }

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = BORDER;
        cell.alignment = { vertical: "middle", wrapText: true };
      });
    });

    ws.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();

    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip(Buffer.from(buffer));
    const sheetEntry = zip.getEntry("xl/worksheets/sheet1.xml");
    if (sheetEntry) {
      let xml = sheetEntry.getData().toString("utf8");
      xml = xml.replace(/(<row\b[^>]*?)\s+hidden="1"/g, "$1");
      xml = xml.replace(/<filterColumn[^>]*>[\s\S]*?<\/filterColumn>/g, "");
      xml = xml.replace(/<customFilters[^>]*>[\s\S]*?<\/customFilters>/g, "");
      zip.updateFile("xl/worksheets/sheet1.xml", Buffer.from(xml, "utf8"));
    }

    const { encrypt } = await import("officecrypto-tool");
    const zipBuffer = zip.toBuffer();
    console.log(`[master-admin/export] encrypting — password="${password.trim()}" zipSize=${zipBuffer.length}`);
    const encrypted = await encrypt(zipBuffer, {
      password: password.trim(),
    });
    console.log(`[master-admin/export] encrypted size=${encrypted.length} firstBytes=${Buffer.from(encrypted).slice(0, 4).toString("hex")}`);

    const filename = `All_Submissions_${new Date().toISOString().slice(0, 10)}.xlsx`;
    console.log(`[master-admin/export] Done — ${submissions.length} rows, file=${filename}`);

    return new NextResponse(new Uint8Array(encrypted), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } finally {
    activeExports--;
  }
};

export const POST = withErrorHandler(_POST);
