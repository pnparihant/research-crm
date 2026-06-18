import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById(token.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Reuse existing secret if already set — only generate new one if none exists
  let base32Secret = user.twoFactorSecret;
  if (!base32Secret) {
    const generated = speakeasy.generateSecret({ name: `CMS (${user.email})`, length: 20 });
    base32Secret = generated.base32;
    await User.findByIdAndUpdate(token.id, { twoFactorSecret: base32Secret });
  }

  const otpauthUrl = speakeasy.otpauthURL({
    secret: base32Secret,
    label: `CMS (${user.email})`,
    encoding: "base32",
  });
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

  return NextResponse.json({ secret: base32Secret, qrCode: qrCodeUrl });
}
