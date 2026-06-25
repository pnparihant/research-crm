import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { ReportUpload } from "@/models/ReportUpload";

const ADMIN_ROLES = ["admin", "master_admin"];

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const t = token as Record<string, unknown>;
  if (!ADMIN_ROLES.includes(t.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  await connectDB();

  const query = userId ? { userId } : {};
  const reports = await ReportUpload.find(query)
    .select("-data")
    .sort({ uploadedAt: -1 })
    .lean();

  return NextResponse.json(reports);
}
