import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { FormSubmission } from "@/models/FormSubmission";
import { sendEscalationEmail } from "@/lib/mailer";
import { withErrorHandler } from "@/lib/apiHandler";

// Called by server cron at 7:15 PM IST (13:45 UTC) on weekdays — 15 min after the EOD warning.
// Finds users who still haven't submitted after the warning and escalates to master admins.
const _POST = async (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // IST "today" window
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = istFormatter.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const istDateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const todayStartIST = new Date(`${istDateStr}T00:00:00+05:30`);
  const todayEndIST   = new Date(`${istDateStr}T23:59:59+05:30`);
  const timestamp = `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;

  // All regular users expected to submit
  const allUsers = await User.collection
    .find({ role: "user" }, { projection: { name: 1, email: 1 } })
    .toArray();

  if (allUsers.length === 0) {
    return NextResponse.json({ message: "No users to check", escalated: 0 });
  }

  // Users who submitted today
  const submittedDocs = await FormSubmission.collection.distinct("userId", {
    submittedAt: { $gte: todayStartIST, $lte: todayEndIST },
  });
  const submittedSet = new Set(submittedDocs.map((id) => id.toString()));

  const missingUsers = allUsers.filter((u) => !submittedSet.has(u._id.toString()));

  if (missingUsers.length === 0) {
    console.log("[cron/escalation-check] All users submitted — no escalation needed");
    return NextResponse.json({ timestamp, escalated: 0, totalUsers: allUsers.length });
  }

  // Fetch master admin emails from DB
  const masterAdmins = await User.collection
    .find({ role: "master_admin" }, { projection: { email: 1 } })
    .toArray();

  const escalationEmails = [
    ...masterAdmins.map((u) => u.email as string),
    ...(process.env.EOD_NOTIFICATION_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean),
  ].filter((v, i, arr) => arr.indexOf(v) === i); // dedupe

  const errors: string[] = [];
  for (const email of escalationEmails) {
    try {
      await sendEscalationEmail(
        email,
        missingUsers.map((u) => ({ name: u.name, email: u.email })),
        timestamp,
        allUsers.length
      );
    } catch (err) {
      console.error(`[cron/escalation-check] Failed for ${email}:`, err);
      errors.push(email);
    }
  }

  console.log(
    `[cron/escalation-check] Done — missing=${missingUsers.length}, escalatedTo=${escalationEmails.length}`
  );

  return NextResponse.json({
    timestamp,
    totalUsers: allUsers.length,
    notSubmitted: missingUsers.length,
    missingUsers: missingUsers.map((u) => ({ name: u.name, email: u.email })),
    escalatedTo: escalationEmails,
    errors,
  });
};

const _GET = async (req: NextRequest) => {
  return _POST(req);
};

export const POST = withErrorHandler(_POST);
export const GET = withErrorHandler(_GET);
