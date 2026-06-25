import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { ClientCategory } from "@/models/MasterData";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const cats = await ClientCategory.find().sort({ name: 1 }).lean();
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const t = token as Record<string, unknown>;
  if (t.role !== "master_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Category name is required" }, { status: 400 });

  await connectDB();
  const existing = await ClientCategory.findOne({ name: name.trim() });
  if (existing) return NextResponse.json({ error: "Category already exists" }, { status: 409 });

  const doc = await ClientCategory.create({ name: name.trim() });
  console.log(`[client-categories] POST — created "${doc.name}" by ${token.email}`);
  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const t = token as Record<string, unknown>;
  if (t.role !== "master_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await connectDB();
  await ClientCategory.findByIdAndDelete(id);
  console.log(`[client-categories] DELETE — id=${id} by ${token.email}`);
  return NextResponse.json({ success: true });
}
