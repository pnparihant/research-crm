import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/apiHandler";

// Registration is disabled — users are created externally via scripts/seed-user.js
const _POST = async () => {
  console.log("[register] POST — registration is disabled");
  return NextResponse.json({ error: "Registration is disabled" }, { status: 403 });
};

export const POST = withErrorHandler(_POST);
