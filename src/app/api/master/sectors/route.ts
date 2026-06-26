import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Sector } from "@/models/MasterData";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  console.log("[sectors] GET — fetching all sectors");
  const session = await auth();
  if (!session?.user) {
    console.log("[sectors] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const sectors = await Sector.find().sort({ name: 1 }).lean();
  console.log(`[sectors] GET — returned ${sectors.length} sectors`);
  return NextResponse.json(sectors);
}

export async function POST(req: NextRequest) {
  console.log("[sectors] POST — create sector");
  const session = await auth();
  if (!session?.user) {
    console.log("[sectors] POST FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "master_admin") {
    console.log(`[sectors] POST FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name } = await req.json();
  if (!name?.trim()) {
    console.log("[sectors] POST FAIL — name missing");
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  await connectDB();
  const doc = await Sector.create({ name: name.trim() });
  console.log(`[sectors] POST — created sector name="${name.trim()}" by user=${session.user.email}`);
  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  console.log(`[sectors] DELETE — id=${id}`);
  const session = await auth();
  if (!session?.user) {
    console.log("[sectors] DELETE FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "master_admin") {
    console.log(`[sectors] DELETE FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!id) {
    console.log("[sectors] DELETE FAIL — id missing");
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }
  await connectDB();
  await Sector.findByIdAndDelete(id);
  console.log(`[sectors] DELETE — deleted sector id=${id} by user=${session.user.email}`);
  return NextResponse.json({ success: true });
}
