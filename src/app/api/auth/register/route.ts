import { NextResponse } from "next/server";

// Registration is disabled — users are created externally via scripts/seed-user.js
export async function POST() {
  console.log("[register] POST — registration is disabled");
  return NextResponse.json({ error: "Registration is disabled" }, { status: 403 });
}
