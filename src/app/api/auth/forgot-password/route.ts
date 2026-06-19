import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

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

  // Try sending email if SMTP is configured
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to: user.email,
        subject: "CMS — Reset your password",
        html: `
          <p>Hi ${user.name},</p>
          <p>Click the link below to reset your password. The link expires in <strong>1 hour</strong>.</p>
          <p><a href="${resetUrl}" style="color:#0f766e;font-weight:bold;">Reset Password</a></p>
          <p>If you did not request this, ignore this email.</p>
          <p style="color:#9ca3af;font-size:12px;">Arihant Capital Markets — CMS</p>
        `,
      });
    } catch {
      // Email failed but token is saved — fall through so admin can share link manually
    }
  }

  // In dev or when no SMTP, return the reset URL so it can be shared manually
  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ success: true, ...(isDev || !smtpHost ? { resetUrl } : {}) });
}
