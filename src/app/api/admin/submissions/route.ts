import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";

const DEFAULT_LIMIT = 500;

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "admin" && token.role !== "master_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const all = searchParams.get("all") === "true";
  const limit = all ? 0 : parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const search = searchParams.get("search")?.trim() ?? "";

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { clientName:   { $regex: search, $options: "i" } },
      { salesPerson:  { $regex: search, $options: "i" } },
      { company:      { $regex: search, $options: "i" } },
      { analystName:  { $regex: search, $options: "i" } },
    ];
  }

  await connectDB();
  const query = FormSubmission.find(filter)
    .populate<{ userId: { name: string; email: string } }>("userId", "name email")
    .sort({ createdAt: -1 })
    .lean();

  if (limit > 0) query.limit(limit);

  const submissions = await query;
  console.log(`[admin/submissions] returned ${submissions.length} (limit=${limit || "all"} search="${search}") to ${token.email}`);
  return NextResponse.json(submissions);
}
