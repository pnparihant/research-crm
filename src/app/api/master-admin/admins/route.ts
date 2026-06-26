import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { logAction } from "@/lib/auditLog";
import { maskEmail, maskPhone } from "@/lib/mask";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  console.log("[master-admin/admins] GET — fetching all admins");
  const session = await auth();
  if (!session?.user) {
    console.log("[master-admin/admins] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "master_admin") {
    console.log(`[master-admin/admins] GET FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const admins = await User.find({ role: "admin" }, "name email phone role createdAt twoFactorEnabled").lean();
  const masked = admins.map((a) => ({ ...a, email: maskEmail(a.email), phone: maskPhone(a.phone) }));
  console.log(`[master-admin/admins] GET — returned ${admins.length} admins`);
  return NextResponse.json(masked);
}

export async function PATCH(req: NextRequest) {
  console.log("[master-admin/admins] PATCH — promote/demote");
  const session = await auth();
  if (!session?.user) {
    console.log("[master-admin/admins] PATCH FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "master_admin") {
    console.log(`[master-admin/admins] PATCH FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, action } = await req.json();
  if (!userId || !action) {
    console.log("[master-admin/admins] PATCH FAIL — userId or action missing");
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }
  if (!["promote", "demote"].includes(action)) {
    console.log(`[master-admin/admins] PATCH FAIL — invalid action="${action}"`);
    return NextResponse.json({ error: "action must be promote or demote" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(userId);
  if (!user) {
    console.log(`[master-admin/admins] PATCH FAIL — user not found, id=${userId}`);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (action === "promote" && user.role !== "user") {
    console.log(`[master-admin/admins] PATCH FAIL — cannot promote role=${user.role}`);
    return NextResponse.json({ error: "User is not a regular employee" }, { status: 400 });
  }
  if (action === "demote" && user.role !== "admin") {
    console.log(`[master-admin/admins] PATCH FAIL — cannot demote role=${user.role}`);
    return NextResponse.json({ error: "User is not an admin" }, { status: 400 });
  }

  user.role = action === "promote" ? "admin" : "user";
  await user.save();

  console.log(`[master-admin/admins] PATCH — ${action}d user=${user.email} → role=${user.role} by master_admin=${session.user.email}`);
  await logAction(req, session,
    action === "promote" ? "PROMOTE_TO_ADMIN" : "DEMOTE_TO_USER",
    action === "promote"
      ? `Promoted ${user.name} (${user.email}) to Admin`
      : `Demoted ${user.name} (${user.email}) to User`
  );
  return NextResponse.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
}

export async function POST(req: NextRequest) {
  console.log("[master-admin/admins] POST — create admin");
  const session = await auth();
  if (!session?.user) {
    console.log("[master-admin/admins] POST FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "master_admin") {
    console.log(`[master-admin/admins] POST FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, password, phone } = await req.json();
  if (!name || !email || !password) {
    console.log("[master-admin/admins] POST FAIL — missing required fields");
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }
  if (password.length < 8) {
    console.log("[master-admin/admins] POST FAIL — password too short");
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  await connectDB();
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`[master-admin/admins] POST FAIL — email already exists: ${email}`);
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const admin = await User.create({ name, email: email.toLowerCase(), password: hashed, role: "admin", phone: phone || null });

  console.log(`[master-admin/admins] POST — created admin email=${email.toLowerCase()} by master_admin=${session.user.email}`);
  await logAction(req, session, "CREATE_ADMIN", `Created admin: ${name} (${email.toLowerCase()})`);
  return NextResponse.json({ _id: admin._id, name: admin.name, email: admin.email, role: admin.role }, { status: 201 });
}
