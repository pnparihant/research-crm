import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!Array.isArray(body) || body.length === 0)
    return NextResponse.json({ error: "Expected a non-empty array of entries" }, { status: 400 });

  if (body.length > 500)
    return NextResponse.json({ error: "Maximum 500 entries per upload" }, { status: 400 });

  await connectDB();

  const docs = body.map((row) => ({
    userId: token.id,
    date:                     row.date ?? "",
    salesPerson:              token.name ?? "",
    clientName:               row.clientName ?? "",
    designation:              row.designation ?? "",
    modeOfCommunication:      row.modeOfCommunication ?? "",
    company:                  row.company ?? "",
    sector:                   row.sector ?? "",
    cmpTarget:                row.cmpTarget ?? "",
    recommendation:           row.recommendation ?? "",
    analystName:              row.analystName ?? "",
    buySideAnalystDesignation: row.buySideAnalystDesignation ?? "",
    rationale:                row.rationale ?? "",
    feedback:                 row.feedback ?? "",
    submittedAt:              new Date(),
  }));

  const inserted = await FormSubmission.insertMany(docs, { ordered: false });
  return NextResponse.json({ inserted: inserted.length }, { status: 201 });
}
