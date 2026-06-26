import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";
import { auth } from "@/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`[admin/submissions/${id}] DELETE — requested by admin`);
  const session = await auth();
  if (!session?.user) {
    console.log(`[admin/submissions/${id}] DELETE FAIL — unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "master_admin") {
    console.log(`[admin/submissions/${id}] DELETE FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const submission = await FormSubmission.findByIdAndDelete(id);
  if (!submission) {
    console.log(`[admin/submissions/${id}] DELETE FAIL — not found`);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  console.log(`[admin/submissions/${id}] DELETE — deleted by user=${session.user.email}`);
  return NextResponse.json({ success: true });
}
