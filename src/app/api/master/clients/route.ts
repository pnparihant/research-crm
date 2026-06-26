import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Client } from "@/models/MasterData";
import { auth } from "@/auth";
import type { Session } from "next-auth";

function requireAdminOrAbove(session: Session | null) {
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "master_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const clients = await Client.find().sort({ category: 1, name: 1 }).lean();
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const deny = requireAdminOrAbove(session);
  if (deny) return deny;

  const { name, category } = await req.json();
  if (!name?.trim() || !category?.trim())
    return NextResponse.json({ error: "Name and category are required" }, { status: 400 });

  await connectDB();
  const existing = await Client.findOne({ name: name.trim(), category: category.trim() });
  if (existing)
    return NextResponse.json({ error: "A client with this name already exists in that category" }, { status: 409 });

  const doc = await Client.create({ name: name.trim(), category: category.trim() });
  console.log(`[master/clients] POST — created "${doc.name}" (${doc.category}) by ${session!.user.email}`);
  return NextResponse.json(doc, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  const session = await auth();
  const deny = requireAdminOrAbove(session);
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
  console.log(`[master/clients] PUT — updated id=${id} to "${doc.name}" (${doc.category}) by ${session!.user.email}`);
  return NextResponse.json(doc);
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  const session = await auth();
  const deny = requireAdminOrAbove(session);
  if (deny) return deny;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await connectDB();
  await Client.findByIdAndDelete(id);
  console.log(`[master/clients] DELETE — deleted id=${id} by ${session!.user.email}`);
  return NextResponse.json({ success: true });
}
