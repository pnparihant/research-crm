import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AdminReport } from "@/models/AdminReport";
import { logAction } from "@/lib/auditLog";
import { auth } from "@/auth";
import { withErrorHandler } from "@/lib/apiHandler";

const ADMIN_ROLES = ["admin", "master_admin"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const _POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ADMIN_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await connectDB();
  const doc = await AdminReport.create({
    adminId:    session.user.id,
    adminName:  session.user.name,
    adminEmail: session.user.email,
    filename:   file.name,
    size:       file.size,
    data:       buffer,
  });

  await logAction(req, session as never, "ADMIN_REPORT_UPLOAD", `Admin uploaded report: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

  return NextResponse.json({ id: doc._id.toString(), filename: file.name }, { status: 201 });
};

export const POST = withErrorHandler(_POST);
