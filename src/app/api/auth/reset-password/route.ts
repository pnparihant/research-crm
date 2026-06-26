import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { withErrorHandler } from "@/lib/apiHandler";

const _POST = async (req: NextRequest) => {
  console.log("[reset-password] POST — incoming request");
  const { token, password } = await req.json();
  if (!token || !password) {
    console.log("[reset-password] FAIL — missing token or password");
    return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    console.log("[reset-password] FAIL — password too short");
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() },
  });

  if (!user) {
    console.log("[reset-password] FAIL — invalid or expired reset token");
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  console.log(`[reset-password] Token valid for user=${user.email}, resetting password`);
  const hashed = await bcrypt.hash(password, 12);
  await User.updateOne(
    { _id: user._id },
    { $set: { password: hashed }, $unset: { resetToken: "", resetTokenExpiry: "" } }
  );

  console.log(`[reset-password] Password reset successful for user=${user.email}`);
  return NextResponse.json({ success: true });
};

export const POST = withErrorHandler(_POST);
