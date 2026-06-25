import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { sendLoginOtpEmail } from "@/lib/mailer";
import { sendLoginOtpSms } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond the same way to prevent enumeration
  if (!user || user.role !== "user") return NextResponse.json({ success: true });

  const TEST_EMAILS = ["test.client@arihantcapital.com", "test.admin@arihantcapital.com", "test.masteradmin@arihantcapital.com"];
  const isTestAccount = TEST_EMAILS.includes(user.email);
  console.log(`[send-login-otp] email=${user.email} role=${user.role} isTestAccount=${isTestAccount}`);

  // One OTP per calendar day (IST): reuse if a valid one already exists
  const now = new Date();
  let otp: string;
  let expiry: Date;

  if (!isTestAccount && user.loginOtp && user.loginOtpExpiry && user.loginOtpExpiry > now) {
    // Valid OTP already exists for today — reuse it
    otp = user.loginOtp;
    expiry = user.loginOtpExpiry;
    console.log(`[send-login-otp] Reusing existing OTP for ${user.email} (expiry: ${expiry.toISOString()})`);
  } else {
    // Generate new OTP expiring at next midnight IST
    otp = isTestAccount ? "000000" : crypto.randomInt(100000, 999999).toString();
    // IST = UTC+5:30; advance to next midnight IST
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
    nowIST.setUTCHours(0, 0, 0, 0);
    nowIST.setUTCDate(nowIST.getUTCDate() + 1); // move to next day 00:00 IST
    expiry = new Date(nowIST.getTime() - IST_OFFSET_MS); // back to UTC

    await User.updateOne(
      { _id: user._id },
      { $set: { loginOtp: otp, loginOtpExpiry: expiry } }
    );
    console.log(`[send-login-otp] New OTP stored for ${user.email} (expiry: ${expiry.toISOString()})`);
  }

  // Skip delivery for test accounts — use magic OTP 000000
  if (isTestAccount) {
    console.log(`[send-login-otp] Test account — skipping email/SMS, magic OTP=000000`);
    return NextResponse.json({ success: true });
  }

  const hasSms = !!(process.env.ARIHANT_SMS_AUTH && process.env.ARIHANT_SMS_APIKEY);
  const rawPhone = (user.phone ?? "").replace(/\D/g, "");
  const hasPhone = rawPhone.length === 10;

  console.log(`[OTP] user=${user.email} hasSms=${hasSms} hasPhone=${hasPhone} phone=${rawPhone || "none"}`);

  // Send SMS and email in parallel — both channels, not one-or-the-other
  const tasks: Promise<void>[] = [];

  if (hasSms && hasPhone) {
    tasks.push(
      sendLoginOtpSms(rawPhone, otp, user.name)
        .then(() => console.log(`[OTP] SMS sent to ${rawPhone}`))
        .catch((err) => console.error("[OTP] SMS failed:", err))
    );
  }

  if (process.env.SMTP_HOST) {
    tasks.push(
      sendLoginOtpEmail(user.email, otp)
        .then(() => console.log(`[OTP] Email sent to ${user.email}`))
        .catch((err) => console.error("[OTP] Email failed:", err))
    );
  }

  if (tasks.length === 0) {
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({ success: true, ...(isDev ? { otp } : {}) });
  }

  // Fire-and-forget — don't block the response on delivery
  Promise.all(tasks).catch((err) => console.error("[OTP] delivery error:", err));
  return NextResponse.json({ success: true });
}
