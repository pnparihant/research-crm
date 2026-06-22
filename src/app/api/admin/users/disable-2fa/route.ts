import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  console.log("[admin/users/disable-2fa] POST — incoming request");
  const token = await getToken({ req });
  if (!token) {
    console.log("[admin/users/disable-2fa] FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["admin", "master_admin"].includes(token.role as string)) {
    console.log(`[admin/users/disable-2fa] FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) {
    console.log("[admin/users/disable-2fa] FAIL — userId missing");
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await connectDB();
  const target = await User.findById(userId);
  if (!target) {
    console.log(`[admin/users/disable-2fa] FAIL — target user not found, id=${userId}`);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // master_admin can disable for anyone; admin can only disable for role=user
  if (token.role === "admin" && target.role !== "user") {
    console.log(`[admin/users/disable-2fa] FAIL — admin cannot disable 2FA for role=${target.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await User.findByIdAndUpdate(userId, { twoFactorEnabled: false, twoFactorSecret: null });
  console.log(`[admin/users/disable-2fa] 2FA disabled for userId=${userId} (${target.email}) by ${token.email}`);
  return NextResponse.json({ success: true });
}
