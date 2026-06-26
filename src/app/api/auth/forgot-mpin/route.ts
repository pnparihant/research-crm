import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { sendLoginOtpEmail } from "@/lib/mailer";
import { auth } from "@/auth";
import { withErrorHandler } from "@/lib/apiHandler";

const _POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findOne({ email: session.user.email }).select("email name loginOtp loginOtpExpiry");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const now = new Date();

  // Reuse existing OTP if still valid (within the same day)
  if (user.loginOtp && user.loginOtpExpiry && user.loginOtpExpiry > now) {
    if (process.env.SMTP_HOST) {
      sendLoginOtpEmail(user.email, user.loginOtp).catch((e) =>
        console.error("[forgot-mpin] email failed:", e)
      );
    }
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({ success: true, ...(isDev ? { otp: user.loginOtp } : {}) });
  }

  // Generate new OTP valid for 15 minutes
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiry = new Date(now.getTime() + 15 * 60 * 1000);
  await User.updateOne({ _id: user._id }, { $set: { loginOtp: otp, loginOtpExpiry: expiry } });

  if (process.env.SMTP_HOST) {
    sendLoginOtpEmail(user.email, otp).catch((e) =>
      console.error("[forgot-mpin] email failed:", e)
    );
  }

  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ success: true, ...(isDev ? { otp } : {}) });
};

export const POST = withErrorHandler(_POST);
