import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  console.log("[2fa/verify] POST — incoming request");
  const jwtToken = await getToken({ req });
  if (!jwtToken) {
    console.log("[2fa/verify] FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, enable } = await req.json();
  if (!token) {
    console.log(`[2fa/verify] FAIL — token missing, user=${jwtToken.email}`);
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(jwtToken.id);
  if (!user?.twoFactorSecret) {
    console.log(`[2fa/verify] FAIL — 2FA not set up for user=${jwtToken.email}`);
    return NextResponse.json({ error: "2FA not set up" }, { status: 400 });
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
    window: 2, // ±60 seconds tolerance for clock skew
  });

  if (!verified) {
    console.log(`[2fa/verify] FAIL — invalid TOTP token for user=${jwtToken.email}`);
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  if (enable) {
    await User.findByIdAndUpdate(jwtToken.id, { twoFactorEnabled: true });
    console.log(`[2fa/verify] 2FA enabled for user=${jwtToken.email}`);
  } else {
    // Login verify — mark session as 2FA verified
    // The session update happens client-side via update()
    console.log(`[2fa/verify] Login 2FA verified for user=${jwtToken.email}`);
  }

  return NextResponse.json({ success: true });
}
