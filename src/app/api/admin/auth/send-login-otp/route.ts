import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { sendLoginOtpEmail } from "@/lib/mailer";
import { sendLoginOtpSms } from "@/lib/sms";
import { withErrorHandler } from "@/lib/apiHandler";

const ADMIN_ROLES = ["admin", "master_admin"];

const _POST = async (req: NextRequest) => {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond the same way to prevent enumeration
  if (!user || !ADMIN_ROLES.includes(user.role)) return NextResponse.json({ success: true });

  const TEST_EMAILS = ["test.admin@arihantcapital.com", "test.masteradmin@arihantcapital.com"];
  const isTestAccount = TEST_EMAILS.includes(user.email);
  console.log(`[admin/auth/send-login-otp] email=${user.email} role=${user.role} isTestAccount=${isTestAccount}`);

  const now = new Date();

  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
  nowIST.setUTCHours(0, 0, 0, 0);
  nowIST.setUTCDate(nowIST.getUTCDate() + 1);
  const midnightUTC = new Date(nowIST.getTime() - IST_OFFSET_MS);

  let otp: string;
  let expiry: Date;

  if (isTestAccount) {
    otp = "000000";
    expiry = midnightUTC;
  } else {
    const candidate = crypto.randomInt(100000, 999999).toString();
    const written = await User.findOneAndUpdate(
      {
        _id: user._id,
        $or: [
          { loginOtp: null },
          { loginOtpExpiry: null },
          { loginOtpExpiry: { $lte: now } },
        ],
      },
      { $set: { loginOtp: candidate, loginOtpExpiry: midnightUTC } },
      { new: true }
    );

    if (written) {
      otp = candidate;
      expiry = midnightUTC;
      console.log(`[admin/auth/send-login-otp] New OTP stored for ${user.email} (expiry: ${midnightUTC.toISOString()})`);
    } else {
      const fresh = await User.findOne({ _id: user._id }).select("loginOtp loginOtpExpiry");
      otp = fresh!.loginOtp as string;
      expiry = fresh!.loginOtpExpiry as Date;
      console.log(`[admin/auth/send-login-otp] Reusing existing OTP for ${user.email} (expiry: ${expiry.toISOString()})`);
    }
  }

  if (isTestAccount) {
    console.log(`[admin/auth/send-login-otp] Test account — skipping email/SMS, magic OTP=000000`);
    return NextResponse.json({ success: true });
  }

  const hasSms = !!(process.env.ARIHANT_SMS_AUTH && process.env.ARIHANT_SMS_APIKEY);
  const rawPhone = (user.phone ?? "").replace(/\D/g, "");
  const hasPhone = rawPhone.length === 10;

  console.log(`[admin/auth/send-login-otp] user=${user.email} hasSms=${hasSms} hasPhone=${hasPhone}`);

  const tasks: Promise<void>[] = [];

  if (hasSms && hasPhone) {
    tasks.push(
      sendLoginOtpSms(rawPhone, otp, user.name)
        .then(() => console.log(`[admin/auth/send-login-otp] SMS sent to ${rawPhone}`))
        .catch((err) => console.error("[admin/auth/send-login-otp] SMS failed:", err))
    );
  }

  if (process.env.SMTP_HOST) {
    tasks.push(
      sendLoginOtpEmail(user.email, otp)
        .then(() => console.log(`[admin/auth/send-login-otp] Email sent to ${user.email}`))
        .catch((err) => console.error("[admin/auth/send-login-otp] Email failed:", err))
    );
  }

  if (tasks.length === 0) {
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({ success: true, ...(isDev ? { otp } : {}) });
  }

  Promise.all(tasks).catch((err) => console.error("[admin/auth/send-login-otp] delivery error:", err));
  return NextResponse.json({ success: true });
};

export const POST = withErrorHandler(_POST);
