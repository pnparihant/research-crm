import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  await User.findByIdAndUpdate(token.id, {
    twoFactorEnabled: false,
    twoFactorSecret: null,
  });

  return NextResponse.json({ success: true });
}
