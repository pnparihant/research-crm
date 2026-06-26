import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { FormSubmission } from "@/models/FormSubmission";
import { sendEODReminderEmail, sendEODSummaryEmail } from "@/lib/mailer";
import { withErrorHandler } from "@/lib/apiHandler";

// Called by Vercel Cron at 7 PM IST (13:30 UTC) on weekdays.
// Also callable manually: POST /api/cron/eod-check with Authorization: Bearer <CRON_SECRET>
//
// Env variables:
//   CRON_SECRET              — shared secret to protect this endpoint
//   EOD_NOTIFICATION_EMAILS  — comma-separated list of manager/admin emails to receive the summary
const _POST = async (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // IST "today" window: midnight-to-midnight in Asia/Kolkata
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = istFormatter.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const istDateStr = `${get("year")}-${get("month")}-${get("day")}`;

  // Start/end of today in UTC, derived from IST midnight (IST = UTC+5:30)
  const todayStartIST = new Date(`${istDateStr}T00:00:00+05:30`);
  const todayEndIST   = new Date(`${istDateStr}T23:59:59+05:30`);

  const timestamp = `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;

  // All users who are expected to submit (role=user; admins are excluded)
  const allUsers = await User.collection
    .find(
      { role: "user" },
      { projection: { name: 1, email: 1 } }
    )
    .toArray();

  if (allUsers.length === 0) {
    return NextResponse.json({ message: "No users to check", notSubmitted: 0 });
  }

  // Users who DID submit today
  const submittedDocs = await FormSubmission.collection
    .distinct("userId", {
      submittedAt: { $gte: todayStartIST, $lte: todayEndIST },
    });
  const submittedSet = new Set(submittedDocs.map((id) => id.toString()));

  const missingUsers = allUsers.filter((u) => !submittedSet.has(u._id.toString()));

  // Send individual reminders to each user who hasn't submitted
  let remindersSent = 0;
  const reminderErrors: string[] = [];
  for (const user of missingUsers) {
    try {
      await sendEODReminderEmail(user.email, user.name, timestamp);
      remindersSent++;
    } catch (err) {
      console.error(`[cron/eod-check] Reminder failed for ${user.email}:`, err);
      reminderErrors.push(user.email);
    }
  }

  // Send summary email to configured notification addresses
  const notificationEmails = (process.env.EOD_NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const summaryErrors: string[] = [];
  for (const email of notificationEmails) {
    try {
      await sendEODSummaryEmail(
        email,
        missingUsers.map((u) => ({ name: u.name, email: u.email })),
        timestamp,
        allUsers.length
      );
    } catch (err) {
      console.error(`[cron/eod-check] Summary failed for ${email}:`, err);
      summaryErrors.push(email);
    }
  }

  console.log(
    `[cron/eod-check] Done — total=${allUsers.length}, missing=${missingUsers.length}, remindersSent=${remindersSent}`
  );

  return NextResponse.json({
    timestamp,
    totalUsers: allUsers.length,
    submitted: allUsers.length - missingUsers.length,
    notSubmitted: missingUsers.length,
    missingUsers: missingUsers.map((u) => ({ name: u.name, email: u.email })),
    remindersSent,
    reminderErrors,
    summaryErrors,
  });
};

const _GET = async (req: NextRequest) => {
  return _POST(req);
};

export const POST = withErrorHandler(_POST);
export const GET = withErrorHandler(_GET);
