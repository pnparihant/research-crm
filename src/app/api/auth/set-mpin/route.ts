import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/auth";
import { withErrorHandler } from "@/lib/apiHandler";

const _POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mpin } = await req.json();
  if (!mpin || typeof mpin !== "string" || !/^\d{6}$/.test(mpin)) {
    return NextResponse.json({ error: "MPIN must be 6 digits" }, { status: 400 });
  }

  await connectDB();
  const hash = await bcrypt.hash(mpin, 10);
  const result = await User.updateOne({ email: session.user.email }, { $set: { mpin: hash } });
  if (result.matchedCount === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ success: true });
};

export const POST = withErrorHandler(_POST);
