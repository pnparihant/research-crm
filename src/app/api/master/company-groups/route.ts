import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CompanyGroup } from "@/models/MasterData";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  console.log("[company-groups] GET — fetching all groups");
  const session = await auth();
  if (!session?.user) {
    console.log("[company-groups] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const groups = await CompanyGroup.find().sort({ name: 1 }).lean();
  console.log(`[company-groups] GET — returned ${groups.length} groups`);
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  console.log("[company-groups] POST — create group");
  const session = await auth();
  if (!session?.user) {
    console.log("[company-groups] POST FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "master_admin") {
    console.log(`[company-groups] POST FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name } = await req.json();
  if (!name?.trim()) {
    console.log("[company-groups] POST FAIL — name missing");
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  await connectDB();
  const doc = await CompanyGroup.create({ name: name.trim() });
  console.log(`[company-groups] POST — created group name="${name.trim()}" by user=${session.user.email}`);
  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  console.log(`[company-groups] DELETE — id=${id}`);
  const session = await auth();
  if (!session?.user) {
    console.log("[company-groups] DELETE FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "master_admin") {
    console.log(`[company-groups] DELETE FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!id) {
    console.log("[company-groups] DELETE FAIL — id missing");
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }
  await connectDB();
  await CompanyGroup.findByIdAndDelete(id);
  console.log(`[company-groups] DELETE — deleted group id=${id} by user=${session.user.email}`);
  return NextResponse.json({ success: true });
}
