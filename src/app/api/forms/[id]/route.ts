import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`[forms/${id}] DELETE — requested by user`);
  const token = await getToken({ req });
  if (!token) {
    console.log(`[forms/${id}] DELETE FAIL — unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const submission = await FormSubmission.findOneAndDelete({
    _id: id,
    userId: token.id,
  });

  if (!submission) {
    console.log(`[forms/${id}] DELETE FAIL — not found or not owned by user=${token.email}`);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  console.log(`[forms/${id}] DELETE — deleted by user=${token.email}`);
  return NextResponse.json({ success: true });
}
