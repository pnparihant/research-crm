import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";
import { User } from "@/models/User";
import { logAction } from "@/lib/auditLog";
import { withErrorHandler } from "@/lib/apiHandler";
import mongoose from "mongoose";
import type { IUser } from "@/models/User";

const _GET = async (req: NextRequest) => {
  console.log("[forms] GET — fetching submissions for user");
  const session = await auth();
  if (!session?.user) {
    console.log("[forms] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Own submissions
  const own = await FormSubmission.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  // Find shared colleagues — users who share at least one assigned client
  const me = await User.findById(session.user.id).select("assignedClients").lean() as Pick<IUser, "assignedClients"> | null;
  const myClientIds = (me?.assignedClients ?? []).map((ac) => ac.client.toString());

  let shared: (typeof own[number] & { isShared?: boolean; sharedByName?: string })[] = [];

  if (myClientIds.length > 0) {
    const colleagues = await User.find({
      _id: { $ne: new mongoose.Types.ObjectId(session.user.id) },
      "assignedClients.client": { $in: myClientIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).select("_id name").lean() as unknown as { _id: mongoose.Types.ObjectId; name: string }[];

    if (colleagues.length > 0) {
      const nameMap = Object.fromEntries(colleagues.map((c) => [c._id.toString(), c.name]));
      const colleagueIds = colleagues.map((c) => c._id);
      const sharedRaw = await FormSubmission.find({ userId: { $in: colleagueIds } })
        .sort({ createdAt: -1 })
        .lean();
      shared = sharedRaw.map((s) => ({
        ...s,
        isShared: true,
        sharedByName: nameMap[s.userId.toString()] ?? "Colleague",
      }));
    }
  }

  // Merge: own first, then shared; sort combined by createdAt desc
  const merged = [...own.map((s) => ({ ...s, isShared: false })), ...shared];
  merged.sort((a, b) => new Date((b as unknown as { createdAt: string }).createdAt).getTime() - new Date((a as unknown as { createdAt: string }).createdAt).getTime());
  const all = merged;

  console.log(`[forms] GET — ${own.length} own + ${shared.length} shared submissions for user=${session.user.email}`);
  return NextResponse.json(all);
};

const _POST = async (req: NextRequest) => {
  console.log("[forms] POST — new form submission");
  const session = await auth();
  if (!session?.user) {
    console.log("[forms] POST FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { formType, date, salesPerson, clientName, designation, modeOfCommunication, company, sector, cmpTarget, recommendation, analystName, buySideAnalystDesignation, rationale, feedback, others } = body;

  const isInstitution = formType === "institution";

  const missingBase = !date || !salesPerson || !clientName || !designation || !modeOfCommunication || !analystName;
  const missingResearch = !isInstitution && (!company || !cmpTarget || !recommendation);

  if (missingBase || missingResearch) {
    console.log(`[forms] POST FAIL — missing required fields, user=${session.user.email}`);
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  await connectDB();
  const submission = await FormSubmission.create({
    userId: session.user.id,
    formType: isInstitution ? "institution" : "research",
    date,
    salesPerson,
    clientName,
    designation,
    modeOfCommunication,
    company: company ?? "",
    sector: sector ?? "",
    cmpTarget: cmpTarget ?? "",
    recommendation: recommendation ?? "",
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
};

export const GET = withErrorHandler(_GET);
export const POST = withErrorHandler(_POST);
