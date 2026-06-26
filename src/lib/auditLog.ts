import { NextRequest } from "next/server";
import { Session } from "next-auth";
import { connectDB } from "./mongodb";
import { ActionLog } from "@/models/ActionLog";

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function logAction(
  req: NextRequest,
  session: Session | null,
  action: string,
  details?: string
) {
  const user = session?.user;
  console.log(`[auditLog] action=${action} user=${user?.email ?? "unknown"} ip=${getClientIp(req)}${details ? ` details="${details}"` : ""}`);
  try {
    await connectDB();
    await ActionLog.create({
      userId:    user?.id    ?? null,
      userName:  user?.name  ?? null,
      userEmail: user?.email ?? null,
      userRole:  user?.role  ?? null,
      action,
      details:   details ?? null,
      ip:        getClientIp(req),
      userAgent: req.headers.get("user-agent") ?? null,
    });
  } catch (err) {
    console.error("[auditLog] Failed to write log:", err);
  }
}
