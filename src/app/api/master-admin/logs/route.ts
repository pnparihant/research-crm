import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { ActionLog } from "@/models/ActionLog";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "master_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const action = searchParams.get("action") ?? "";
  const search = searchParams.get("search") ?? "";

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

  return NextResponse.json({ logs, total, page, limit });
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "master_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  await ActionLog.deleteMany({});
  return NextResponse.json({ success: true });
}
