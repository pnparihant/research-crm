import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { Client } from "@/models/MasterData";

function requireAdminOrAbove(token: Awaited<ReturnType<typeof getToken>>) {
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "admin" && token.role !== "master_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const clients = await Client.find().sort({ category: 1, name: 1 }).lean();
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  const deny = requireAdminOrAbove(token);
  if (deny) return deny;

  const { name, category } = await req.json();
  if (!name?.trim() || !category?.trim())
    return NextResponse.json({ error: "Name and category are required" }, { status: 400 });

  await connectDB();
  const existing = await Client.findOne({ name: name.trim(), category: category.trim() });
  if (existing)
    return NextResponse.json({ error: "A client with this name already exists in that category" }, { status: 409 });

  const doc = await Client.create({ name: name.trim(), category: category.trim() });
  console.log(`[master/clients] POST — created "${doc.name}" (${doc.category}) by ${token!.email}`);
  return NextResponse.json(doc, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  const token = await getToken({ req });
  const deny = requireAdminOrAbove(token);
  if (deny) return deny;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const { name, category } = await req.json();
  if (!name?.trim() || !category?.trim())
    return NextResponse.json({ error: "Name and category are required" }, { status: 400 });

  await connectDB();
  const doc = await Client.findById(id);
  if (!doc) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const conflict = await Client.findOne({ name: name.trim(), category: category.trim(), _id: { $ne: doc._id } });
  if (conflict)
    return NextResponse.json({ error: "A client with this name already exists in that category" }, { status: 409 });

  doc.name = name.trim();
  doc.category = category.trim();
  await doc.save();
  console.log(`[master/clients] PUT — updated id=${id} to "${doc.name}" (${doc.category}) by ${token!.email}`);
  return NextResponse.json(doc);
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  const token = await getToken({ req });
  const deny = requireAdminOrAbove(token);
  if (deny) return deny;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await connectDB();
  await Client.findByIdAndDelete(id);
  console.log(`[master/clients] DELETE — deleted id=${id} by ${token!.email}`);
  return NextResponse.json({ success: true });
}
