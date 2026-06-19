import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";
import { logAction } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const submissions = await FormSubmission.find({ userId: token.id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(submissions);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, salesPerson, clientName, designation, modeOfCommunication, company, sector, cmpTarget, recommendation, analystName, buySideAnalystDesignation, rationale, feedback } = body;

  if (!date || !salesPerson || !clientName || !designation || !modeOfCommunication || !company || !cmpTarget || !recommendation || !analystName) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  await connectDB();
  const submission = await FormSubmission.create({
    userId: token.id,
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
    submittedAt: new Date(),
  });

  await logAction(req, token, "FORM_SUBMIT", `Client: ${clientName}, Company: ${company}`);
  return NextResponse.json(submission, { status: 201 });
}
