import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { withErrorHandler } from "@/lib/apiHandler";

const _POST = async (req: NextRequest) => {
  console.log("[forgot-password] POST — incoming request");
  const { email } = await req.json();
  if (!email) {
    console.log("[forgot-password] FAIL — email missing");
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond the same way to prevent email enumeration
  if (!user) {
    console.log(`[forgot-password] User not found for email=${email} — returning success silently`);
    return NextResponse.json({ success: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await User.updateOne(
    { _id: user._id },
    { $set: { resetToken: token, resetTokenExpiry: expiry } }
  );
  console.log(`[forgot-password] Reset token generated for user=${user.email} (expiry: ${expiry.toISOString()})`);

  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  if (process.env.SMTP_HOST) {
    try {
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
      console.log(`[forgot-password] Reset email sent to ${user.email}`);
    } catch (err) {
      console.error(`[forgot-password] Failed to send reset email to ${user.email}:`, err);
      // Email failed but token is saved — admin can share link manually
    }
  } else {
    console.log(`[forgot-password] SMTP_HOST not set — skipping email, resetUrl=${resetUrl}`);
  }

  // In dev or when no SMTP, return the reset URL so it can be shared manually
  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ success: true, ...(isDev || !process.env.SMTP_HOST ? { resetUrl } : {}) });
};

export const POST = withErrorHandler(_POST);
