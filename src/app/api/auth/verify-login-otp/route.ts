import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  const { email, otp } = await req.json();
  if (!email || !otp) return NextResponse.json({ error: "Email and OTP required" }, { status: 400 });

  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user || !user.loginOtp || !user.loginOtpExpiry) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
  }

  if (new Date() > user.loginOtpExpiry) {
    await User.updateOne({ _id: user._id }, { $unset: { loginOtp: "", loginOtpExpiry: "" } });
    return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
  }

  if (user.loginOtp !== otp.trim()) {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
  }

  // Clear OTP after successful verification
  await User.updateOne({ _id: user._id }, { $unset: { loginOtp: "", loginOtpExpiry: "" } });

  return NextResponse.json({ success: true });
}
