// import { NextRequest, NextResponse } from "next/server";
// import { auth } from "@/auth";
// import { connectDB } from "@/lib/mongodb";
// import { FormSubmission } from "@/models/FormSubmission";
// import { User } from "@/models/User";
// import { logAction } from "@/lib/auditLog";
// import { withErrorHandler } from "@/lib/apiHandler";
// import mongoose from "mongoose";
// import type { IUser } from "@/models/User";

// const _GET = async (req: NextRequest) => {
//   console.log("[forms] GET — fetching submissions for user");
//   const session = await auth();
//   if (!session?.user) {
//     console.log("[forms] GET FAIL — unauthorized");
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   await connectDB();

//   // Own submissions
//   const own = await FormSubmission.find({ userId: session.user.id })
//     .sort({ createdAt: -1 })
//     .lean();

//   // Find shared colleagues — users who share at least one assigned client
//   const me = await User.findById(session.user.id).select("assignedClients").lean() as Pick<IUser, "assignedClients"> | null;
//   const myClientIds = (me?.assignedClients ?? []).map((ac) => ac.client.toString());

//   let shared: (typeof own[number] & { isShared?: boolean; sharedByName?: string })[] = [];

//   if (myClientIds.length > 0) {
//     const colleagues = await User.find({
//       _id: { $ne: new mongoose.Types.ObjectId(session.user.id) },
//       "assignedClients.client": { $in: myClientIds.map((id) => new mongoose.Types.ObjectId(id)) },
//     }).select("_id name").lean() as unknown as { _id: mongoose.Types.ObjectId; name: string }[];

//     if (colleagues.length > 0) {
//       const nameMap = Object.fromEntries(colleagues.map((c) => [c._id.toString(), c.name]));
//       const colleagueIds = colleagues.map((c) => c._id);
//       const sharedRaw = await FormSubmission.find({ userId: { $in: colleagueIds } })
//         .sort({ createdAt: -1 })
//         .lean();
//       shared = sharedRaw.map((s) => ({
//         ...s,
//         isShared: true,
//         sharedByName: nameMap[s.userId.toString()] ?? "Colleague",
//       }));
//     }
//   }

//   // Merge: own first, then shared; sort combined by createdAt desc
//   const merged = [...own.map((s) => ({ ...s, isShared: false })), ...shared];
//   merged.sort((a, b) => new Date((b as unknown as { createdAt: string }).createdAt).getTime() - new Date((a as unknown as { createdAt: string }).createdAt).getTime());
//   const all = merged;

//   console.log(`[forms] GET — ${own.length} own + ${shared.length} shared submissions for user=${session.user.email}`);
//   return NextResponse.json(all);
// };

// const _POST = async (req: NextRequest) => {
//   console.log("[forms] POST — new form submission");
//   const session = await auth();
//   if (!session?.user) {
//     console.log("[forms] POST FAIL — unauthorized");
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   const body = await req.json();
//   const { formType, date, salesPerson, clientName, designation, modeOfCommunication, company, sector, cmpTarget, recommendation, analystName, buySideAnalystDesignation, rationale, feedback, others } = body;

//   const isInstitution = formType === "institution";

//   const missingBase = !date || !salesPerson || !clientName || !designation || !modeOfCommunication || !analystName;
//   const missingResearch = !isInstitution && (!company || !cmpTarget || !recommendation);

//   if (missingBase || missingResearch) {
//     console.log(`[forms] POST FAIL — missing required fields, user=${session.user.email}`);
//     return NextResponse.json({ error: "All fields are required" }, { status: 400 });
//   }

//   await connectDB();
//   const submission = await FormSubmission.create({
//     userId: session.user.id,
//     formType: isInstitution ? "institution" : "research",
//     date,
//     salesPerson,
//     clientName,
//     designation,
//     modeOfCommunication,
//     company: company ?? "",
//     sector: sector ?? "",
//     cmpTarget: cmpTarget ?? "",
//     recommendation: recommendation ?? "",
//     analystName,
//     buySideAnalystDesignation: buySideAnalystDesignation ?? "",
//     rationale: rationale ?? "",
//     feedback: feedback ?? "",
//     others: others ?? "",
//     submittedAt: new Date(),
//   });

//   console.log(`[forms] POST — submission created id=${submission._id} user=${session.user.email} client="${clientName}" company="${company}"`);
//   await logAction(req, session, "FORM_SUBMIT", `Client: ${clientName}, Company: ${company}`);
//   return NextResponse.json(submission, { status: 201 });
// };

// export const GET = withErrorHandler(_GET);
// export const POST = withErrorHandler(_POST);
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";
import { User } from "@/models/User";
import { Client } from "@/models/MasterData";
import { logAction } from "@/lib/auditLog";
import { withErrorHandler } from "@/lib/apiHandler";
import mongoose from "mongoose";
import type { IUser } from "@/models/User";

const normalize = (s: string) => s.trim().toLowerCase();

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

  // My assigned client IDs
  const me = await User.findById(session.user.id).select("assignedClients").lean() as Pick<IUser, "assignedClients"> | null;
  const myClientIds = (me?.assignedClients ?? []).map((ac) => ac.client.toString());

  let shared: (typeof own[number] & { isShared?: boolean; sharedByName?: string })[] = [];

  if (myClientIds.length > 0) {
    const myClientIdSet = new Set(myClientIds);

    // Colleagues who share at least one assigned client, with their own assignedClients
    const colleagues = await User.find({
      _id: { $ne: new mongoose.Types.ObjectId(session.user.id) },
      "assignedClients.client": { $in: myClientIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).select("_id name assignedClients").lean() as unknown as {
      _id: mongoose.Types.ObjectId;
      name: string;
      assignedClients: { client: mongoose.Types.ObjectId }[];
    }[];

    if (colleagues.length > 0) {
      // Per-colleague: the client IDs actually shared with me
      const colleagueSharedClientIds = new Map<string, Set<string>>();
      const allSharedClientIds = new Set<string>();

      for (const c of colleagues) {
        const overlap = (c.assignedClients ?? [])
          .map((ac) => ac.client.toString())
          .filter((id) => myClientIdSet.has(id));
        if (overlap.length > 0) {
          colleagueSharedClientIds.set(c._id.toString(), new Set(overlap));
          overlap.forEach((id) => allSharedClientIds.add(id));
        }
      }

      // Resolve shared client IDs to names so we can match against the free-text clientName field
      const sharedClientDocs = await Client.find({
        _id: { $in: Array.from(allSharedClientIds).map((id) => new mongoose.Types.ObjectId(id)) },
      }).select("_id name").lean() as unknown as { _id: mongoose.Types.ObjectId; name: string }[];
      const clientIdToName = new Map(sharedClientDocs.map((c) => [c._id.toString(), normalize(c.name)]));

      const nameMap = Object.fromEntries(colleagues.map((c) => [c._id.toString(), c.name]));
      const colleagueIds = colleagues
        .filter((c) => (colleagueSharedClientIds.get(c._id.toString())?.size ?? 0) > 0)
        .map((c) => c._id);

      if (colleagueIds.length > 0) {
        const sharedRaw = await FormSubmission.find({ userId: { $in: colleagueIds } })
          .sort({ createdAt: -1 })
          .lean();

        shared = sharedRaw
          .filter((s) => {
            const colleagueId = s.userId.toString();
            const sharedIds = colleagueSharedClientIds.get(colleagueId);
            if (!sharedIds || sharedIds.size === 0) return false;
            const submissionClientName = normalize(s.clientName ?? "");
            // Keep only submissions for a client actually assigned to both this colleague and me
            for (const clientId of sharedIds) {
              if (clientIdToName.get(clientId) === submissionClientName) return true;
            }
            return false;
          })
          .map((s) => ({
            ...s,
            isShared: true,
            sharedByName: nameMap[s.userId.toString()] ?? "Colleague",
          }));
      }
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