import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { ReportUpload } from "@/models/ReportUpload";

const ADMIN_ROLES = ["admin", "master_admin"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await connectDB();
  const report = await ReportUpload.findById(id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const t = token as Record<string, unknown>;
  const isAdmin = ADMIN_ROLES.includes(t.role as string);
  const isOwner = report.userId === (token.id as string);

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new NextResponse(report.data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Content-Length": report.size.toString(),
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const t = token as Record<string, unknown>;
  if (!ADMIN_ROLES.includes(t.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await connectDB();
  const report = await ReportUpload.findById(id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ReportUpload.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
