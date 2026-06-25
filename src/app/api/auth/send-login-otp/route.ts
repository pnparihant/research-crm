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

  const now = new Date();

  // Next midnight IST (UTC+5:30)
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
    // Atomic: only write a new OTP if no valid one exists.
    // If two requests race, only the first write succeeds; the second reads back the same OTP.
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
      // This request won the race — new OTP was stored
      otp = candidate;
      expiry = midnightUTC;
      console.log(`[send-login-otp] New OTP stored for ${user.email} (expiry: ${midnightUTC.toISOString()})`);
    } else {
      // Another request already stored a valid OTP — reuse it
      const fresh = await User.findById(user._id).lean();
      otp = fresh!.loginOtp as string;
      expiry = fresh!.loginOtpExpiry as Date;
      console.log(`[send-login-otp] Reusing existing OTP for ${user.email} (expiry: ${expiry.toISOString()})`);
    }
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
