import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "master_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const admins = await User.find({ role: "admin" }, "name email role createdAt twoFactorEnabled").lean();
  return NextResponse.json(admins);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (token.role !== "master_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: "All fields required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  await connectDB();
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const admin = await User.create({ name, email: email.toLowerCase(), password: hashed, role: "admin" });
  return NextResponse.json({ _id: admin._id, name: admin.name, email: admin.email, role: admin.role }, { status: 201 });
}
