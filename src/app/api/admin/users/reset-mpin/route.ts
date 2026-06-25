import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { logAction } from "@/lib/auditLog";
import type { JWT } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as JWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "admin" && token.role !== "master_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await connectDB();
  const user = await User.findById(userId).select("name email");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await User.updateOne({ _id: userId }, { $set: { mpin: null } });
  await logAction(req, token as never, "ADMIN_RESET_MPIN", `Reset MPIN for ${user.email}`);

  return NextResponse.json({ success: true });
}
