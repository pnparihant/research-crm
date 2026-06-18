import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { Company } from "@/models/MasterData";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const groupId = new URL(req.url).searchParams.get("groupId");
  const query = groupId ? { groupId } : {};
  const companies = await Company.find(query).sort({ name: 1 }).lean();
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "admin" && token.role !== "master_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, groupId } = await req.json();
  if (!name?.trim() || !groupId) return NextResponse.json({ error: "Name and groupId required" }, { status: 400 });
  await connectDB();
  const doc = await Company.create({ name: name.trim(), groupId });
  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "admin" && token.role !== "master_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await connectDB();
  await Company.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
