import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { logAction } from "@/lib/auditLog";

export async function POST(req: NextRequest) {
  console.log("[change-password] POST — incoming request");
  const token = await getToken({ req });
  if (!token) {
    console.log("[change-password] FAIL — unauthorized (no token)");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    console.log(`[change-password] FAIL — missing fields, user=${token.email}`);
    return NextResponse.json({ error: "Both fields required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    console.log(`[change-password] FAIL — new password too short, user=${token.email}`);
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(token.id).select("+password");
  if (!user) {
    console.log(`[change-password] FAIL — user not found, id=${token.id}`);
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
  await logAction(req, token, "CHANGE_PASSWORD");
  return NextResponse.json({ success: true });
}
