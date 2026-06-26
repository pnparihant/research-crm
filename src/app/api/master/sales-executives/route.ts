import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SalesExecutive } from "@/models/MasterData";
import { auth } from "@/auth";
import { withErrorHandler } from "@/lib/apiHandler";

const _GET = async (req: NextRequest) => {
  console.log("[sales-executives] GET — fetching all executives");
  const session = await auth();
  if (!session?.user) {
    console.log("[sales-executives] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const execs = await SalesExecutive.find().sort({ name: 1 }).lean();
  console.log(`[sales-executives] GET — returned ${execs.length} executives`);
  return NextResponse.json(execs);
};

const _POST = async (req: NextRequest) => {
  console.log("[sales-executives] POST — create executive");
  const session = await auth();
  if (!session?.user) {
    console.log("[sales-executives] POST FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "master_admin") {
    console.log(`[sales-executives] POST FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name } = await req.json();
  if (!name?.trim()) {
    console.log("[sales-executives] POST FAIL — name missing");
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  await connectDB();
  const doc = await SalesExecutive.create({ name: name.trim() });
  console.log(`[sales-executives] POST — created executive name="${name.trim()}" by user=${session.user.email}`);
  return NextResponse.json(doc, { status: 201 });
};

const _DELETE = async (req: NextRequest) => {
  const id = new URL(req.url).searchParams.get("id");
  console.log(`[sales-executives] DELETE — id=${id}`);
  const session = await auth();
  if (!session?.user) {
    console.log("[sales-executives] DELETE FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "master_admin") {
    console.log(`[sales-executives] DELETE FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!id) {
    console.log("[sales-executives] DELETE FAIL — id missing");
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }
  await connectDB();
  await SalesExecutive.findByIdAndDelete(id);
  console.log(`[sales-executives] DELETE — deleted executive id=${id} by user=${session.user.email}`);
  return NextResponse.json({ success: true });
};

export const GET = withErrorHandler(_GET);
export const POST = withErrorHandler(_POST);
export const DELETE = withErrorHandler(_DELETE);
