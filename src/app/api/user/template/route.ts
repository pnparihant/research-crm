import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import { generateTemplateBuffer } from "@/lib/templateGenerator";

// GET /api/user/template — returns the personalized blank template as an Excel download
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const user = await mongoose.connection.collection("users").findOne(
    { _id: new mongoose.Types.ObjectId(session.user.id as string) },
    { projection: { name: 1, assignedClients: 1 } }
  );

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Resolve client names
  const clientIds = (user.assignedClients ?? [])
    .map((ac: { client: mongoose.Types.ObjectId }) => ac.client)
    .filter(Boolean);

  const clientDocs = clientIds.length
    ? await mongoose.connection.collection("clients")
        .find(
          { _id: { $in: clientIds.map((id: mongoose.Types.ObjectId) => new mongoose.Types.ObjectId(id)) } },
          { projection: { name: 1 } }
        )
        .toArray()
    : [];

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).replace(/\//g, "-");

  const clientNames = clientDocs.map((c) => c.name as string);
  const buffer = await generateTemplateBuffer(clientNames, session.user.id as string, dateLabel);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="CRM_Sheet_${dateLabel}.xlsx"`,
    },
  });
}
