import { NextRequest } from "next/server";
import { JWT } from "next-auth/jwt";
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
  token: JWT | null,
  action: string,
  details?: string
) {
  console.log(`[auditLog] action=${action} user=${token?.email ?? "unknown"} ip=${getClientIp(req)}${details ? ` details="${details}"` : ""}`);
  try {
    await connectDB();
    await ActionLog.create({
      userId:    token?.id    ?? null,
      userName:  token?.name  ?? null,
      userEmail: (token?.email as string) ?? null,
      userRole:  token?.role  ?? null,
      action,
      details:   details ?? null,
      ip:        getClientIp(req),
      userAgent: req.headers.get("user-agent") ?? null,
    });
  } catch (err) {
    console.error("[auditLog] Failed to write log:", err);
  }
}
