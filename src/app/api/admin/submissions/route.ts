import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";

export async function GET(req: NextRequest) {
  console.log("[admin/submissions] GET — fetching all submissions");
  const token = await getToken({ req });
  if (!token) {
    console.log("[admin/submissions] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "admin" && token.role !== "master_admin") {
    console.log(`[admin/submissions] GET FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const submissions = await FormSubmission.find()
    .populate<{ userId: { name: string; email: string } }>("userId", "name email")
    .sort({ createdAt: -1 })
    .lean();

  console.log(`[admin/submissions] GET — returned ${submissions.length} submissions to user=${token.email}`);
  return NextResponse.json(submissions);
}
