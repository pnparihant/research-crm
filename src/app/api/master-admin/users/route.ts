import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { logAction } from "@/lib/auditLog";
import { auth } from "@/auth";
import type { Session } from "next-auth";

function requireMasterAdmin(session: Session | null, label: string) {
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "master_admin") {
    console.log(`[master-admin/users] ${label} FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  console.log("[master-admin/users] POST — create user");
  const session = await auth();
  const deny = requireMasterAdmin(session, "POST");
  if (deny) return deny;

  const { name, email, password, phone, designation } = await req.json();
  if (!name || !email || !password) {
    console.log("[master-admin/users] POST FAIL — missing required fields");
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    console.log("[master-admin/users] POST FAIL — password too short");
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  await connectDB();
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`[master-admin/users] POST FAIL — email already exists: ${email}`);
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const bcrypt = await import("bcryptjs");
  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashed,
    role: "user",
    phone: phone || null,
    designation: designation || null,
  });

  console.log(`[master-admin/users] POST — created user email=${email.toLowerCase()} by master_admin=${session!.user.email}`);
  await logAction(req, session!, "CREATE_USER", `Created user: ${name} (${email.toLowerCase()})`);
  return NextResponse.json(
    { _id: user._id, name: user.name, email: user.email, role: user.role, designation: user.designation, createdAt: user.createdAt },
    { status: 201 }
  );
}

export async function PUT(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  console.log(`[master-admin/users] PUT — userId=${id}`);
  const session = await auth();
  const deny = requireMasterAdmin(session, "PUT");
  if (deny) return deny;
  if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const { name, email, phone, password, designation } = await req.json();
  if (!name || !email) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  if (password && password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  await connectDB();
  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role !== "user") return NextResponse.json({ error: "Can only edit regular users" }, { status: 400 });

  const conflict = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
  if (conflict) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  user.name = name;
  user.email = email.toLowerCase();
  user.phone = phone || null;
  user.designation = designation || null;
  if (password) {
    const bcrypt = await import("bcryptjs");
    user.password = await bcrypt.hash(password, 12);
  }
  await user.save();

  console.log(`[master-admin/users] PUT — updated user id=${id} by master_admin=${session!.user.email}`);
  await logAction(req, session!, "EDIT_USER", `Edited user: ${user.name} (${user.email})`);
  return NextResponse.json({ _id: user._id, name: user.name, email: user.email, phone: user.phone, designation: user.designation, createdAt: user.createdAt });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  console.log(`[master-admin/users] DELETE — userId=${id}`);
  const session = await auth();
  const deny = requireMasterAdmin(session, "DELETE");
  if (deny) return deny;
  if (!id) {
    console.log("[master-admin/users] DELETE FAIL — user ID missing");
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(id);
  if (!user) {
    console.log(`[master-admin/users] DELETE FAIL — user not found, id=${id}`);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.role !== "user") {
    console.log(`[master-admin/users] DELETE FAIL — cannot delete non-user role=${user.role}`);
    return NextResponse.json({ error: "Can only delete regular users" }, { status: 400 });
  }

  await logAction(req, session!, "DELETE_USER", `Deleted user: ${user.name} (${user.email})`);
  await User.findByIdAndDelete(id);
  console.log(`[master-admin/users] DELETE — deleted user email=${user.email} by master_admin=${session!.user.email}`);
  return NextResponse.json({ success: true });
}
