import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { SalesExecutive } from "@/models/MasterData";

export async function GET(req: NextRequest) {
  console.log("[sales-executives] GET — fetching all executives");
  const token = await getToken({ req });
  if (!token) {
    console.log("[sales-executives] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const execs = await SalesExecutive.find().sort({ name: 1 }).lean();
  console.log(`[sales-executives] GET — returned ${execs.length} executives`);
  return NextResponse.json(execs);
}

export async function POST(req: NextRequest) {
  console.log("[sales-executives] POST — create executive");
  const token = await getToken({ req });
  if (!token) {
    console.log("[sales-executives] POST FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "admin" && token.role !== "master_admin") {
    console.log(`[sales-executives] POST FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name } = await req.json();
  if (!name?.trim()) {
    console.log("[sales-executives] POST FAIL — name missing");
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  await connectDB();
  const doc = await SalesExecutive.create({ name: name.trim() });
  console.log(`[sales-executives] POST — created executive name="${name.trim()}" by user=${token.email}`);
  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  console.log(`[sales-executives] DELETE — id=${id}`);
  const token = await getToken({ req });
  if (!token) {
    console.log("[sales-executives] DELETE FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "admin" && token.role !== "master_admin") {
    console.log(`[sales-executives] DELETE FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!id) {
    console.log("[sales-executives] DELETE FAIL — id missing");
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }
  await connectDB();
  await SalesExecutive.findByIdAndDelete(id);
  console.log(`[sales-executives] DELETE — deleted executive id=${id} by user=${token.email}`);
  return NextResponse.json({ success: true });
}
