import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond the same way to prevent email enumeration
  if (!user) return NextResponse.json({ success: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await User.updateOne(
    { _id: user._id },
    { $set: { resetToken: token, resetTokenExpiry: expiry } }
  );

  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  if (process.env.SMTP_HOST) {
    try {
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
    } catch {
      // Email failed but token is saved — admin can share link manually
    }
  }

  // In dev or when no SMTP, return the reset URL so it can be shared manually
  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ success: true, ...(isDev || !process.env.SMTP_HOST ? { resetUrl } : {}) });
}
