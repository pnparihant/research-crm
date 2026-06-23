import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";
import { logAction } from "@/lib/auditLog";
import { verifyTemplateSignature } from "@/lib/templateGenerator";

function todayISTLabel(): string {
  return new Date()
    .toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "-"); // "DD-MM-YYYY"
}

export async function POST(req: NextRequest) {
  console.log("[forms/bulk] POST — bulk upload");
  const token = await getToken({ req });
  if (!token) {
    console.log("[forms/bulk] POST FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Support both old format (array) and new format ({ filename, signature, rows })
  const filename: string  = body?.filename  ?? "";
  const signature: string = body?.signature ?? "";
  const rows = Array.isArray(body) ? body : (Array.isArray(body?.rows) ? body.rows : null);

  if (!rows || rows.length === 0) {
    console.log(`[forms/bulk] POST FAIL — invalid body, user=${token.email}`);
    return NextResponse.json({ error: "Expected a non-empty array of entries" }, { status: 400 });
  }

  if (rows.length > 500) {
    console.log(`[forms/bulk] POST FAIL — too many entries (${rows.length}), user=${token.email}`);
    return NextResponse.json({ error: "Maximum 500 entries per upload" }, { status: 400 });
  }

  // Server-side filename date validation
  if (filename) {
    const dateMatch = filename.match(/CRM_Template_(\d{2}-\d{2}-\d{4})/);
    const today = todayISTLabel();

    if (!dateMatch) {
      const details = `User=${token.email} uploaded file="${filename}" — not an official template`;
      console.log(`[forms/bulk] POST FAIL — invalid template filename, user=${token.email}`);
      await connectDB();
      await logAction(req, token, "BULK_UPLOAD_DATE_MISMATCH", details);
      return NextResponse.json(
        { error: "Invalid file — please use the official template downloaded from this portal." },
        { status: 400 }
      );
    }

    const fileDate = dateMatch[1];
    if (fileDate !== today) {
      const details = `User=${token.email} uploaded template for ${fileDate} but today is ${today}. File="${filename}"`;
      console.log(`[forms/bulk] POST FAIL — date mismatch, user=${token.email}, fileDate=${fileDate}, today=${today}`);
      await connectDB();
      await logAction(req, token, "BULK_UPLOAD_DATE_MISMATCH", details);
      return NextResponse.json(
        { error: `Date mismatch — this sheet is for ${fileDate}, but today is ${today}. Please download today's sheet.` },
        { status: 400 }
      );
    }

    // Verify HMAC signature — prevents renamed/tampered files from passing
    if (!signature) {
      const details = `User=${token.email} uploaded file without a security signature. File="${filename}"`;
      console.log(`[forms/bulk] POST FAIL — missing signature, user=${token.email}`);
      await connectDB();
      await logAction(req, token, "BULK_UPLOAD_TAMPERED", details);
      return NextResponse.json(
        { error: "This file is missing a security signature. Please download a fresh template from this portal." },
        { status: 400 }
      );
    }

    const isValid = verifyTemplateSignature(token.id as string, today, signature);
    if (!isValid) {
      const details = `User=${token.email} uploaded a tampered or reused sheet. Signature mismatch. File="${filename}"`;
      console.log(`[forms/bulk] POST FAIL — signature mismatch (tampered file), user=${token.email}`);
      await connectDB();
      await logAction(req, token, "BULK_UPLOAD_TAMPERED", details);
      return NextResponse.json(
        { error: "Security check failed — this file appears to have been tampered with or does not belong to your account. Please download a fresh template." },
        { status: 400 }
      );
    }
  }

  console.log(`[forms/bulk] POST — inserting ${rows.length} entries for user=${token.email}`);
  await connectDB();

  const docs = rows.map((row: Record<string, string>) => ({
    userId:                   token.id,
    date:                     row.date ?? "",
    salesPerson:              token.name ?? "",
    clientName:               row.clientName ?? "",
    designation:              row.designation ?? "",
    modeOfCommunication:      row.modeOfCommunication ?? "",
    company:                  row.company ?? "",
    sector:                   row.sector ?? "",
    cmpTarget:                row.cmpTarget ?? "",
    recommendation:           row.recommendation ?? "",
    analystName:              row.analystName ?? "",
    buySideAnalystDesignation: row.buySideAnalystDesignation ?? "",
    rationale:                row.rationale ?? "",
    feedback:                 row.feedback ?? "",
    submittedAt:              new Date(),
  }));

  const inserted = await FormSubmission.insertMany(docs, { ordered: false });
  console.log(`[forms/bulk] POST — inserted ${inserted.length} entries for user=${token.email}`);
  return NextResponse.json({ inserted: inserted.length }, { status: 201 });
}
