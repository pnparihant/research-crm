import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  console.log("[users/my-clients] GET — fetching assigned clients");
  const token = await getToken({ req });
  if (!token) {
    console.log("[users/my-clients] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Use native collection to bypass cached old-schema model
  const user = await User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(token.id as string) },
    { projection: { assignedClients: 1 } }
  );
  if (!user) {
    console.log(`[users/my-clients] GET FAIL — user not found, id=${token.id}`);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const entries = user.assignedClients ?? [];

  // Handle both old shape (plain ObjectId) and new shape ({ client: ObjectId, ... })
  const clientIds = entries.map((ac: unknown) => {
    if (ac && typeof ac === "object" && "client" in (ac as Record<string, unknown>)) {
      return (ac as { client: mongoose.Types.ObjectId }).client;
    }
    return ac as mongoose.Types.ObjectId;
  }).filter(Boolean);

  if (!clientIds.length) {
    console.log(`[users/my-clients] GET — no assigned clients for user=${token.email}`);
    return NextResponse.json([]);
  }

  const ClientCol = mongoose.connection.collection("clients");
  const clientDocs = await ClientCol.find(
    { _id: { $in: clientIds } },
    { projection: { name: 1, code: 1 } }
  ).toArray();

  console.log(`[users/my-clients] GET — returned ${clientDocs.length} clients for user=${token.email}`);
  return NextResponse.json(clientDocs.map((c) => ({ _id: c._id.toString(), code: c.code, name: c.name })));
}
