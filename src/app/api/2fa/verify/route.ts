import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/auth";
import { withErrorHandler } from "@/lib/apiHandler";

const _POST = async (req: NextRequest) => {
  console.log("[2fa/verify] POST — incoming request");
  const session = await auth();
  if (!session?.user) {
    console.log("[2fa/verify] FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, enable } = await req.json();
  if (!token) {
    console.log(`[2fa/verify] FAIL — token missing, user=${session.user.email}`);
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(session.user.id);
  if (!user?.twoFactorSecret) {
    console.log(`[2fa/verify] FAIL — 2FA not set up for user=${session.user.email}`);
    return NextResponse.json({ error: "2FA not set up" }, { status: 400 });
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
    window: 2, // ±60 seconds tolerance for clock skew
  });

  if (!verified) {
    console.log(`[2fa/verify] FAIL — invalid TOTP token for user=${session.user.email}`);
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  if (enable) {
    await User.findByIdAndUpdate(session.user.id, { twoFactorEnabled: true });
    console.log(`[2fa/verify] 2FA enabled for user=${session.user.email}`);
  } else {
    // Login verify — mark session as 2FA verified
    // The session update happens client-side via update()
    console.log(`[2fa/verify] Login 2FA verified for user=${session.user.email}`);
  }

  return NextResponse.json({ success: true });
};

export const POST = withErrorHandler(_POST);
