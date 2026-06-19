import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  await connectDB();
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() },
  });

  if (!user) return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 12);
  await User.updateOne(
    { _id: user._id },
    { $set: { password: hashed }, $unset: { resetToken: "", resetTokenExpiry: "" } }
  );

  return NextResponse.json({ success: true });
}
