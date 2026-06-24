import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import mongoose from "mongoose";
import { logAction } from "@/lib/auditLog";
import { maskEmail, maskPhone } from "@/lib/mask";

export async function GET(req: NextRequest) {
  console.log("[admin/users] GET — fetching all users");
  const token = await getToken({ req });
  if (!token) {
    console.log("[admin/users] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "admin" && token.role !== "master_admin") {
    console.log(`[admin/users] GET FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  // Fetch regular users + the requesting admin themselves (so admins can assign clients to themselves)
  const users = await User.collection
    .find(
      { $or: [{ role: "user" }, { _id: new mongoose.Types.ObjectId(token.id as string) }] },
      { projection: { name: 1, email: 1, phone: 1, role: 1, assignedClients: 1, createdAt: 1, twoFactorEnabled: 1 } }
    )
    .toArray();

  // Populate client names + codes from the clients collection
  const ClientCol = mongoose.connection.collection("clients");
  const allClientIds = users.flatMap((u) =>
    (u.assignedClients ?? []).map((ac: { client: mongoose.Types.ObjectId }) => ac.client).filter(Boolean)
  );
  const uniqueIds = [...new Set(allClientIds.map((id) => id?.toString()))].filter(Boolean);
  const clientDocs = uniqueIds.length
    ? await ClientCol.find({ _id: { $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)) } }, { projection: { name: 1, code: 1 } }).toArray()
    : [];
  const clientMap = Object.fromEntries(clientDocs.map((c) => [c._id.toString(), { name: c.name, code: c.code }]));

  const result = users.map((u) => ({
    ...u,
    email: maskEmail(u.email),
    phone: maskPhone(u.phone),
    assignedClients: (u.assignedClients ?? []).map((ac: { client: mongoose.Types.ObjectId; assignedByName: string; assignedAt: Date }) => ({
      client: ac.client ? { _id: ac.client.toString(), name: clientMap[ac.client.toString()]?.name ?? "—", code: clientMap[ac.client.toString()]?.code ?? "" } : null,
      assignedByName: ac.assignedByName ?? "",
      assignedAt: ac.assignedAt ?? null,
    })).filter((ac: { client: unknown }) => ac.client),
  }));

  console.log(`[admin/users] GET — returned ${result.length} users to requester=${token.email}`);
  return NextResponse.json(result);
}

// PATCH body: { action: "add" | "remove", clientId: string }
export async function PATCH(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  console.log(`[admin/users] PATCH — userId=${id}`);
  const token = await getToken({ req });
  if (!token) {
    console.log("[admin/users] PATCH FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "admin" && token.role !== "master_admin") {
    console.log(`[admin/users] PATCH FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!id) {
    console.log("[admin/users] PATCH FAIL — user ID missing");
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const { action, clientId } = await req.json();
  if (!action || !clientId) {
    console.log(`[admin/users] PATCH FAIL — action or clientId missing, userId=${id}`);
    return NextResponse.json({ error: "action and clientId required" }, { status: 400 });
  }

  await connectDB();

  // Use native collection to bypass Mongoose model cache issues with schema changes
  const col = User.collection;
  const userId = new mongoose.Types.ObjectId(id);
  const cId = new mongoose.Types.ObjectId(clientId);

  // Fetch user and client names for human-readable audit log
  const ClientCol = mongoose.connection.collection("clients");
  const [targetUser, clientDoc] = await Promise.all([
    col.findOne({ _id: userId }, { projection: { name: 1, email: 1 } }),
    ClientCol.findOne({ _id: cId }, { projection: { name: 1, code: 1 } }),
  ]);
  const targetLabel = targetUser ? `${targetUser.name} (${targetUser.email})` : id;
  const clientLabel = clientDoc ? `${clientDoc.name}${clientDoc.code ? ` [${clientDoc.code}]` : ""}` : clientId;

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
    console.log(`[admin/users] PATCH — assigned clientId=${clientId} to userId=${id} by admin=${token.email}`);
  } else if (action === "remove") {
    await col.updateOne(
      { _id: userId },
      { $pull: { assignedClients: { client: cId } as unknown as never } }
    );
    console.log(`[admin/users] PATCH — removed clientId=${clientId} from userId=${id} by admin=${token.email}`);
  } else {
    console.log(`[admin/users] PATCH FAIL — unknown action="${action}"`);
    return NextResponse.json({ error: "action must be add or remove" }, { status: 400 });
  }

  await logAction(req, token, action === "add" ? "ASSIGN_CLIENT" : "REMOVE_CLIENT",
    `${action === "add" ? "Assigned" : "Removed"} client ${clientLabel} ${action === "add" ? "to" : "from"} user ${targetLabel}`);
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  console.log("[admin/users] POST — create user");
  const token = await getToken({ req });
  if (!token) {
    console.log("[admin/users] POST FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "master_admin") {
    console.log(`[admin/users] POST FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, password, phone } = await req.json();
  if (!name || !email || !password) {
    console.log("[admin/users] POST FAIL — missing required fields");
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    console.log("[admin/users] POST FAIL — password too short");
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  await connectDB();
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`[admin/users] POST FAIL — email already exists: ${email}`);
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const bcrypt = await import("bcryptjs");
  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashed,
    role: "user",
    phone: phone || null,
  });

  console.log(`[admin/users] POST — created user email=${email.toLowerCase()} by master_admin=${token.email}`);
  await logAction(req, token, "CREATE_USER", `Created user: ${name} (${email.toLowerCase()})`);
  return NextResponse.json(
    { _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    { status: 201 }
  );
}

export async function PUT(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  console.log(`[admin/users] PUT — userId=${id}`);
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "master_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const { name, email, phone, password } = await req.json();
  if (!name || !email) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  if (password && password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  await connectDB();
  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role !== "user") return NextResponse.json({ error: "Can only edit regular users" }, { status: 400 });

  const conflict = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
  if (conflict) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  user.name = name;
  user.email = email.toLowerCase();
  user.phone = phone || null;
  if (password) {
    const bcrypt = await import("bcryptjs");
    user.password = await bcrypt.hash(password, 12);
  }
  await user.save();

  console.log(`[admin/users] PUT — updated user id=${id} by master_admin=${token.email}`);
  await logAction(req, token, "EDIT_USER", `Edited user: ${user.name} (${user.email})`);
  return NextResponse.json({ _id: user._id, name: user.name, email: user.email, phone: user.phone, createdAt: user.createdAt });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  console.log(`[admin/users] DELETE — userId=${id}`);
  const token = await getToken({ req });
  if (!token) {
    console.log("[admin/users] DELETE FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "master_admin") {
    console.log(`[admin/users] DELETE FAIL — forbidden, role=${token.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!id) {
    console.log("[admin/users] DELETE FAIL — user ID missing");
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(id);
  if (!user) {
    console.log(`[admin/users] DELETE FAIL — user not found, id=${id}`);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.role !== "user") {
    console.log(`[admin/users] DELETE FAIL — cannot delete non-user role=${user.role}`);
    return NextResponse.json({ error: "Can only delete regular users" }, { status: 400 });
  }

  await logAction(req, token, "DELETE_USER", `Deleted user: ${user.name} (${user.email})`);
  await User.findByIdAndDelete(id);
  console.log(`[admin/users] DELETE — deleted user email=${user.email} by master_admin=${token.email}`);
  return NextResponse.json({ success: true });
}
