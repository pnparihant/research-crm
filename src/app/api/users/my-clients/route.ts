import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import mongoose from "mongoose";
import { withErrorHandler } from "@/lib/apiHandler";

const _GET = async (req: NextRequest) => {
  console.log("[users/my-clients] GET — fetching assigned clients");
  const session = await auth();
  if (!session?.user) {
    console.log("[users/my-clients] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Admins and master admins see every client — no manual assignment needed
  if (session.user.role === "admin" || session.user.role === "master_admin") {
    const allClients = await mongoose.connection.collection("clients")
      .find({}, { projection: { name: 1, code: 1 } })
      .toArray();
    console.log(`[users/my-clients] GET — returned all ${allClients.length} clients for ${session.user.role}=${session.user.email}`);
    return NextResponse.json(allClients.map((c) => ({ _id: c._id.toString(), code: c.code, name: c.name })));
  }

  // Use native collection to bypass cached old-schema model
  const user = await User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(session.user.id as string) },
    { projection: { assignedClients: 1 } }
  );
  if (!user) {
    console.log(`[users/my-clients] GET FAIL — user not found, id=${session.user.id}`);
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
    console.log(`[users/my-clients] GET — no assigned clients for user=${session.user.email}`);
    return NextResponse.json([]);
  }

  const ClientCol = mongoose.connection.collection("clients");
  const clientDocs = await ClientCol.find(
    { _id: { $in: clientIds } },
    { projection: { name: 1, code: 1 } }
  ).toArray();

  console.log(`[users/my-clients] GET — returned ${clientDocs.length} clients for user=${session.user.email}`);
  return NextResponse.json(clientDocs.map((c) => ({ _id: c._id.toString(), code: c.code, name: c.name })));
};

export const GET = withErrorHandler(_GET);
