/**
 * Run once to create the admin account:
 *   npx ts-node --project tsconfig.scripts.json scripts/create-admin.ts
 *
 * Or set role directly in MongoDB:
 *   db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@crm.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@1234";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Admin";

async function main() {
  await mongoose.connect(MONGODB_URI);

  const UserSchema = new mongoose.Schema({
    email: String,
    password: String,
    name: String,
    role: { type: String, default: "user" },
    twoFactorSecret: { type: String, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
  }, { timestamps: true });

  const User = mongoose.models.User ?? mongoose.model("User", UserSchema);

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    await User.updateOne({ email: ADMIN_EMAIL }, { $set: { role: "admin" } });
    console.log(`Updated existing user ${ADMIN_EMAIL} to admin role.`);
  } else {
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.create({ email: ADMIN_EMAIL, password: hashed, name: ADMIN_NAME, role: "admin" });
    console.log(`Created admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
