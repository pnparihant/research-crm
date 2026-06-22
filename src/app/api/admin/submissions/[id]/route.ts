import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`[admin/submissions/${id}] DELETE — requested by admin`);
  const token = await getToken({ req });
  if (!token) {
    console.log(`[admin/submissions/${id}] DELETE FAIL — unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "admin" && token.role !== "master_admin") {
    console.log(`[admin/submissions/${id}] DELETE FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const submission = await FormSubmission.findByIdAndDelete(id);
  if (!submission) {
    console.log(`[admin/submissions/${id}] DELETE FAIL — not found`);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  console.log(`[admin/submissions/${id}] DELETE — deleted by user=${token.email}`);
  return NextResponse.json({ success: true });
}
