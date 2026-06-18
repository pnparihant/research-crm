import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  // Use native collection to bypass cached old-schema model
  const user = await User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(token.id as string) },
    { projection: { assignedClients: 1 } }
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const entries = user.assignedClients ?? [];

  // Handle both old shape (plain ObjectId) and new shape ({ client: ObjectId, ... })
  const clientIds = entries.map((ac: unknown) => {
    if (ac && typeof ac === "object" && "client" in (ac as Record<string, unknown>)) {
      return (ac as { client: mongoose.Types.ObjectId }).client;
    }
    return ac as mongoose.Types.ObjectId;
  }).filter(Boolean);

  if (!clientIds.length) return NextResponse.json([]);

  const Company = mongoose.connection.collection("companies");
  const companies = await Company.find(
    { _id: { $in: clientIds } },
    { projection: { name: 1 } }
  ).toArray();

  return NextResponse.json(companies.map((c) => ({ _id: c._id.toString(), name: c.name })));
}
