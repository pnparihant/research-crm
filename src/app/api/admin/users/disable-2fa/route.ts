import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  console.log("[admin/users/disable-2fa] POST — incoming request");
  const session = await auth();
  if (!session?.user) {
    console.log("[admin/users/disable-2fa] FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["admin", "master_admin"].includes(session.user.role as string)) {
    console.log(`[admin/users/disable-2fa] FAIL — forbidden, role=${session.user.role}`);
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
  if (session.user.role === "admin" && target.role !== "user") {
    console.log(`[admin/users/disable-2fa] FAIL — admin cannot disable 2FA for role=${target.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await User.findByIdAndUpdate(userId, { twoFactorEnabled: false, twoFactorSecret: null });
  console.log(`[admin/users/disable-2fa] 2FA disabled for userId=${userId} (${target.email}) by ${session.user.email}`);
  return NextResponse.json({ success: true });
}
