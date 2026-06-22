import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { Company } from "@/models/MasterData";

export async function GET(req: NextRequest) {
  const groupId = new URL(req.url).searchParams.get("groupId");
  console.log(`[companies] GET — fetching companies groupId=${groupId ?? "all"}`);
  const token = await getToken({ req });
  if (!token) {
    console.log("[companies] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const query = groupId ? { groupId } : {};
  const companies = await Company.find(query).sort({ name: 1 }).lean();
  console.log(`[companies] GET — returned ${companies.length} companies`);
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  console.log("[companies] POST — create company");
  const token = await getToken({ req });
  if (!token) {
    console.log("[companies] POST FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "admin" && token.role !== "master_admin") {
    console.log(`[companies] POST FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name, groupId } = await req.json();
  if (!name?.trim() || !groupId) {
    console.log("[companies] POST FAIL — name or groupId missing");
    return NextResponse.json({ error: "Name and groupId required" }, { status: 400 });
  }
  await connectDB();
  const doc = await Company.create({ name: name.trim(), groupId });
  console.log(`[companies] POST — created company name="${name.trim()}" groupId=${groupId} by user=${token.email}`);
  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  console.log(`[companies] DELETE — id=${id}`);
  const token = await getToken({ req });
  if (!token) {
    console.log("[companies] DELETE FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "admin" && token.role !== "master_admin") {
    console.log(`[companies] DELETE FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!id) {
    console.log("[companies] DELETE FAIL — id missing");
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }
  await connectDB();
  await Company.findByIdAndDelete(id);
  console.log(`[companies] DELETE — deleted company id=${id} by user=${token.email}`);
  return NextResponse.json({ success: true });
}
