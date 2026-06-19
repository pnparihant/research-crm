import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "master_admin"].includes(token.role as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await connectDB();
  const target = await User.findById(userId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // master_admin can disable for anyone; admin can only disable for role=user
  if (token.role === "admin" && target.role !== "user")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await User.findByIdAndUpdate(userId, { twoFactorEnabled: false, twoFactorSecret: null });
  return NextResponse.json({ success: true });
}
