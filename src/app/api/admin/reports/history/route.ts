import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { AdminReport } from "@/models/AdminReport";

const ADMIN_ROLES = ["admin", "master_admin"];

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const t = token as Record<string, unknown>;
  if (!ADMIN_ROLES.includes(t.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const reports = await AdminReport.find({})
    .select("-data")
    .sort({ uploadedAt: -1 })
    .lean();

  return NextResponse.json(reports);
}
