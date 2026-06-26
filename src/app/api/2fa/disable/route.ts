import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  console.log("[2fa/disable] POST — incoming request");
  const session = await auth();
  if (!session?.user) {
    console.log("[2fa/disable] FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  await User.findByIdAndUpdate(session.user.id, {
    twoFactorEnabled: false,
    twoFactorSecret: null,
  });

  console.log(`[2fa/disable] 2FA disabled for user=${session.user.email}`);
  return NextResponse.json({ success: true });
}
