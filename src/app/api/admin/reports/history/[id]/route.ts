import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AdminReport } from "@/models/AdminReport";
import { logAction } from "@/lib/auditLog";
import { auth } from "@/auth";

const ADMIN_ROLES = ["admin", "master_admin"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ADMIN_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const report = await AdminReport.findById(id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(report.data, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Content-Length": report.size.toString(),
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ADMIN_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const report = await AdminReport.findByIdAndDelete(id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAction(req, session as never, "ADMIN_REPORT_DELETE", `Admin deleted report: ${report.filename}`);

  return NextResponse.json({ success: true });
}
