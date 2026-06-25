import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import type { JWT } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as JWT | null;
  if (!token?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mpin } = await req.json();
  if (!mpin || typeof mpin !== "string" || !/^\d{6}$/.test(mpin)) {
    return NextResponse.json({ error: "MPIN must be 6 digits" }, { status: 400 });
  }

  await connectDB();
  const hash = await bcrypt.hash(mpin, 10);
  const result = await User.updateOne({ email: token.email }, { $set: { mpin: hash } });
  if (result.matchedCount === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
