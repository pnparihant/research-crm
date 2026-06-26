import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { logAction } from "@/lib/auditLog";
import { auth } from "@/auth";
import { withErrorHandler } from "@/lib/apiHandler";

const _POST = async (req: NextRequest) => {
  console.log("[change-password] POST — incoming request");
  const session = await auth();
  if (!session?.user) {
    console.log("[change-password] FAIL — unauthorized (no token)");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    console.log(`[change-password] FAIL — missing fields, user=${session.user.email}`);
    return NextResponse.json({ error: "Both fields required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    console.log(`[change-password] FAIL — new password too short, user=${session.user.email}`);
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(session.user.id).select("+password");
  if (!user) {
    console.log(`[change-password] FAIL — user not found, id=${session.user.id}`);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    console.log(`[change-password] FAIL — incorrect current password, user=${user.email}`);
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  console.log(`[change-password] Password changed successfully for user=${user.email}`);
  await logAction(req, session, "CHANGE_PASSWORD", `Password changed by ${session.user.name ?? session.user.email}`);
  return NextResponse.json({ success: true });
};

export const POST = withErrorHandler(_POST);
