import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AdminReport } from "@/models/AdminReport";
import { auth } from "@/auth";

const ADMIN_ROLES = ["admin", "master_admin"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ADMIN_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const reports = await AdminReport.find({})
    .select("-data")
    .sort({ uploadedAt: -1 })
    .lean();

  return NextResponse.json(reports);
}
