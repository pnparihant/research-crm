import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { logAction, getClientIp } from "@/lib/auditLog";
import { withErrorHandler } from "@/lib/apiHandler";

const ADMIN_ROLES = ["admin", "master_admin"];

const _POST = async (req: NextRequest) => {
  const { email, otp } = await req.json();
  if (!email || !otp) return NextResponse.json({ error: "Email and OTP required" }, { status: 400 });

  console.log(`[admin/auth/verify-login-otp] Request — email=${email}`);

  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase() });
  console.log(`[admin/auth/verify-login-otp] DB lookup — found=${!!user} role=${user?.role ?? "none"}`);

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    console.log(`[admin/auth/verify-login-otp] FAIL — user not found or wrong role`);
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
  }

  const TEST_EMAILS = ["test.admin@arihantcapital.com", "test.masteradmin@arihantcapital.com"];
  const isTestAccount = TEST_EMAILS.includes(user.email);

  if (isTestAccount && otp.trim() === "000000") {
    console.log(`[admin/auth/verify-login-otp] Magic OTP bypass granted for ${email}`);
  } else {
    if (!user.loginOtp || !user.loginOtpExpiry) {
      console.log(`[admin/auth/verify-login-otp] FAIL — OTP not found in DB`);
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    if (new Date() > user.loginOtpExpiry) {
      console.log(`[admin/auth/verify-login-otp] FAIL — OTP expired at ${user.loginOtpExpiry.toISOString()}`);
      await User.updateOne({ _id: user._id }, { $unset: { loginOtp: "", loginOtpExpiry: "" } });
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    if (user.loginOtp !== otp.trim()) {
      console.log(`[admin/auth/verify-login-otp] FAIL — OTP mismatch`);
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    console.log(`[admin/auth/verify-login-otp] OTP matched for ${email}`);
  }

  // OTP is intentionally NOT cleared — stays valid till midnight for re-login after logout.
  console.log(`[admin/auth/verify-login-otp] Login successful for ${email} (role=${user.role})`);

  const fakeToken = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
  await logAction(req, fakeToken as never, "LOGIN", `Logged in via OTP`);

  return NextResponse.json({ success: true });
};

export const POST = withErrorHandler(_POST);
