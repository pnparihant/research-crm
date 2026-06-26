import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ActionLog } from "@/models/ActionLog";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const action = searchParams.get("action") ?? "";
  const search = searchParams.get("search") ?? "";
  console.log(`[master-admin/logs] GET — page=${page} limit=${limit} action="${action}" search="${search}"`);

  const session = await auth();
  if (!session?.user) {
    console.log("[master-admin/logs] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "master_admin") {
    console.log(`[master-admin/logs] GET FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (search) {
    filter.$or = [
      { userName:  { $regex: search, $options: "i" } },
      { userEmail: { $regex: search, $options: "i" } },
      { ip:        { $regex: search, $options: "i" } },
      { details:   { $regex: search, $options: "i" } },
    ];
  }

  const [logs, total] = await Promise.all([
    ActionLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ActionLog.countDocuments(filter),
  ]);

  console.log(`[master-admin/logs] GET — returned ${logs.length}/${total} logs to user=${session.user.email}`);
  return NextResponse.json({ logs, total, page, limit });
}

export async function DELETE(req: NextRequest) {
  console.log("[master-admin/logs] DELETE — clearing all logs");
  const session = await auth();
  if (!session?.user) {
    console.log("[master-admin/logs] DELETE FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "master_admin") {
    console.log(`[master-admin/logs] DELETE FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  await ActionLog.deleteMany({});
  console.log(`[master-admin/logs] DELETE — all logs cleared by user=${session.user.email}`);
  return NextResponse.json({ success: true });
}
