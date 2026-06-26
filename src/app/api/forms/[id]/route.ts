import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";
import { withErrorHandler } from "@/lib/apiHandler";

const _DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  console.log(`[forms/${id}] DELETE — requested by user`);
  const session = await auth();
  if (!session?.user) {
    console.log(`[forms/${id}] DELETE FAIL — unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const submission = await FormSubmission.findOneAndDelete({
    _id: id,
    userId: session.user.id,
  });

  if (!submission) {
    console.log(`[forms/${id}] DELETE FAIL — not found or not owned by user=${session.user.email}`);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  console.log(`[forms/${id}] DELETE — deleted by user=${session.user.email}`);
  return NextResponse.json({ success: true });
};

export const DELETE = withErrorHandler(_DELETE);
