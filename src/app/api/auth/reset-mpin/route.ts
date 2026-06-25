import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import type { JWT } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as JWT | null;
  if (!token?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { otp, mpin } = await req.json();
  if (!otp || !mpin) return NextResponse.json({ error: "OTP and new MPIN required" }, { status: 400 });
  if (!/^\d{6}$/.test(mpin)) return NextResponse.json({ error: "MPIN must be 6 digits" }, { status: 400 });

  await connectDB();
  const user = await User.findOne({ email: token.email }).select("loginOtp loginOtpExpiry");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.loginOtp || !user.loginOtpExpiry) {
    return NextResponse.json({ error: "No OTP found. Please request a new one." }, { status: 400 });
  }
  if (new Date() > user.loginOtpExpiry) {
    await User.updateOne({ _id: user._id }, { $unset: { loginOtp: "", loginOtpExpiry: "" } });
    return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
  }
  if (user.loginOtp !== otp.trim()) {
    return NextResponse.json({ error: "Incorrect OTP" }, { status: 400 });
  }

  const hash = await bcrypt.hash(mpin, 10);
  await User.updateOne(
    { _id: user._id },
    { $set: { mpin: hash }, $unset: { loginOtp: "", loginOtpExpiry: "" } }
  );

  return NextResponse.json({ success: true });
}
