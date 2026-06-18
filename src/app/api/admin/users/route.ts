import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "admin" && token.role !== "master_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  // Use native collection to avoid cached old-schema model issues
  const users = await User.collection
    .find({ role: "user" }, { projection: { name: 1, email: 1, assignedClients: 1, createdAt: 1 } })
    .toArray();

  // Populate client names manually
  const Company = mongoose.connection.collection("companies");
  const allClientIds = users.flatMap((u) =>
    (u.assignedClients ?? []).map((ac: { client: mongoose.Types.ObjectId }) => ac.client).filter(Boolean)
  );
  const uniqueIds = [...new Set(allClientIds.map((id) => id?.toString()))].filter(Boolean);
  const companies = uniqueIds.length
    ? await Company.find({ _id: { $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)) } }, { projection: { name: 1 } }).toArray()
    : [];
  const companyMap = Object.fromEntries(companies.map((c) => [c._id.toString(), c.name]));

  const result = users.map((u) => ({
    ...u,
    assignedClients: (u.assignedClients ?? []).map((ac: { client: mongoose.Types.ObjectId; assignedByName: string; assignedAt: Date }) => ({
      client: ac.client ? { _id: ac.client.toString(), name: companyMap[ac.client.toString()] ?? "—" } : null,
      assignedByName: ac.assignedByName ?? "",
      assignedAt: ac.assignedAt ?? null,
    })).filter((ac: { client: unknown }) => ac.client),
  }));

  return NextResponse.json(result);
}

// PATCH body: { action: "add" | "remove", clientId: string }
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "admin" && token.role !== "master_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const { action, clientId } = await req.json();
  if (!action || !clientId) return NextResponse.json({ error: "action and clientId required" }, { status: 400 });

  await connectDB();

  // Use native collection to bypass Mongoose model cache issues with schema changes
  const col = User.collection;
  const userId = new mongoose.Types.ObjectId(id);
  const cId = new mongoose.Types.ObjectId(clientId);

  if (action === "add") {
    await col.updateOne(
      { _id: userId },
      {
        $addToSet: {
          assignedClients: {
            client: cId,
            assignedBy: new mongoose.Types.ObjectId(token.id as string),
            assignedByName: token.name ?? "Admin",
            assignedAt: new Date(),
          },
        },
      }
    );
  } else if (action === "remove") {
    await col.updateOne(
      { _id: userId },
      { $pull: { assignedClients: { client: cId } } }
    );
  } else {
    return NextResponse.json({ error: "action must be add or remove" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
