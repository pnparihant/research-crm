import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  console.log("[2fa/disable] POST — incoming request");
  const token = await getToken({ req });
  if (!token) {
    console.log("[2fa/disable] FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  await User.findByIdAndUpdate(token.id, {
    twoFactorEnabled: false,
    twoFactorSecret: null,
  });

  console.log(`[2fa/disable] 2FA disabled for user=${token.email}`);
  return NextResponse.json({ success: true });
}
