import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";
import { logAction } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  console.log("[forms] GET — fetching submissions for user");
  const session = await auth();
  if (!session?.user) {
    console.log("[forms] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const submissions = await FormSubmission.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  console.log(`[forms] GET — returned ${submissions.length} submissions for user=${session.user.email}`);
  return NextResponse.json(submissions);
}

export async function POST(req: NextRequest) {
  console.log("[forms] POST — new form submission");
  const session = await auth();
  if (!session?.user) {
    console.log("[forms] POST FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, salesPerson, clientName, designation, modeOfCommunication, company, sector, cmpTarget, recommendation, analystName, buySideAnalystDesignation, rationale, feedback, others } = body;

  if (!date || !salesPerson || !clientName || !designation || !modeOfCommunication || !company || !cmpTarget || !recommendation || !analystName) {
    console.log(`[forms] POST FAIL — missing required fields, user=${session.user.email}`);
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  await connectDB();
  const submission = await FormSubmission.create({
    userId: session.user.id,
    date,
    salesPerson,
    clientName,
    designation,
    modeOfCommunication,
    company,
    sector: sector ?? "",
    cmpTarget,
    recommendation,
    analystName,
    buySideAnalystDesignation: buySideAnalystDesignation ?? "",
    rationale: rationale ?? "",
    feedback: feedback ?? "",
    others: others ?? "",
    submittedAt: new Date(),
  });

  console.log(`[forms] POST — submission created id=${submission._id} user=${session.user.email} client="${clientName}" company="${company}"`);
  await logAction(req, session, "FORM_SUBMIT", `Client: ${clientName}, Company: ${company}`);
  return NextResponse.json(submission, { status: 201 });
}
