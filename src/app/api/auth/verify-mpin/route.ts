import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { logAction } from "@/lib/auditLog";
import type { JWT } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as JWT | null;
  if (!token?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mpin } = await req.json();
  if (!mpin || typeof mpin !== "string" || !/^\d{6}$/.test(mpin)) {
    return NextResponse.json({ error: "MPIN must be 6 digits" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email: token.email }).select("mpin name role");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.mpin) {
    return NextResponse.json({ error: "MPIN not set. Please set your MPIN first." }, { status: 400 });
  }

  const match = await bcrypt.compare(mpin, user.mpin);
  if (!match) {
    return NextResponse.json({ error: "Incorrect MPIN" }, { status: 400 });
  }

  await logAction(req, token as never, "LOGIN", "Logged in via MPIN");
  return NextResponse.json({ success: true });
}
