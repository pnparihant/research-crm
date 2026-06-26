import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { ReportUpload } from "@/models/ReportUpload";
import { withErrorHandler } from "@/lib/apiHandler";

const ADMIN_ROLES = ["admin", "master_admin"];

const _GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await connectDB();
  const report = await ReportUpload.findById(id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = ADMIN_ROLES.includes(session.user.role as string);
  const isOwner = report.userId === (session.user.id as string);

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
};

const _DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ADMIN_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await connectDB();
  const report = await ReportUpload.findById(id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ReportUpload.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
};

export const GET = withErrorHandler(_GET);
export const DELETE = withErrorHandler(_DELETE);
