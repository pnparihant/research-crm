import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { Client } from "@/models/MasterData";

export async function GET(req: NextRequest) {
  console.log("[master/clients] GET — fetching all clients");
  const token = await getToken({ req });
  if (!token) {
    console.log("[master/clients] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const clients = await Client.find().sort({ name: 1 }).lean();
  console.log(`[master/clients] GET — returned ${clients.length} clients`);
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  console.log("[master/clients] POST — create client");
  const token = await getToken({ req });
  if (!token) {
    console.log("[master/clients] POST FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "admin" && token.role !== "master_admin") {
    console.log(`[master/clients] POST FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { code, name } = await req.json();
  if (!code?.trim() || !name?.trim()) {
    console.log("[master/clients] POST FAIL — code or name missing");
    return NextResponse.json({ error: "Code and name required" }, { status: 400 });
  }
  await connectDB();
  const existing = await Client.findOne({ code: code.trim().toUpperCase() });
  if (existing) {
    console.log(`[master/clients] POST FAIL — code already exists: ${code}`);
    return NextResponse.json({ error: "Client code already exists" }, { status: 409 });
  }
  const doc = await Client.create({ code: code.trim().toUpperCase(), name: name.trim() });
  console.log(`[master/clients] POST — created client code=${doc.code} name="${doc.name}" by user=${token.email}`);
  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  console.log(`[master/clients] DELETE — id=${id}`);
  const token = await getToken({ req });
  if (!token) {
    console.log("[master/clients] DELETE FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "admin" && token.role !== "master_admin") {
    console.log(`[master/clients] DELETE FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!id) {
    console.log("[master/clients] DELETE FAIL — id missing");
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }
  await connectDB();
  await Client.findByIdAndDelete(id);
  console.log(`[master/clients] DELETE — deleted client id=${id} by user=${token.email}`);
  return NextResponse.json({ success: true });
}
