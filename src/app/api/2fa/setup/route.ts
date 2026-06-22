import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET(req: NextRequest) {
  console.log("[2fa/setup] GET — fetching 2FA setup for user");
  const token = await getToken({ req });
  if (!token) {
    console.log("[2fa/setup] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(token.id);
  if (!user) {
    console.log(`[2fa/setup] GET FAIL — user not found, id=${token.id}`);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Reuse existing secret if already set — only generate new one if none exists
  let base32Secret = user.twoFactorSecret;
  if (!base32Secret) {
    const generated = speakeasy.generateSecret({ name: `CRM (${user.email})`, length: 20 });
    base32Secret = generated.base32;
    await User.findByIdAndUpdate(token.id, { twoFactorSecret: base32Secret });
    console.log(`[2fa/setup] New 2FA secret generated for user=${user.email}`);
  } else {
    console.log(`[2fa/setup] Reusing existing 2FA secret for user=${user.email}`);
  }

  const otpauthUrl = speakeasy.otpauthURL({
    secret: base32Secret,
    label: `CRM (${user.email})`,
    encoding: "base32",
  });
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

  console.log(`[2fa/setup] QR code generated for user=${user.email}`);
  return NextResponse.json({ secret: base32Secret, qrCode: qrCodeUrl });
}
