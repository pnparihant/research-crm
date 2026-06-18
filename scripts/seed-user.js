/**
 * Create or update a CMS user from outside the app.
 *
 * Usage:
 *   node scripts/seed-user.js <email> <password> <name> [role]
 *
 * Examples:
 *   node scripts/seed-user.js john@arihant.com Pass@1234 "John Doe"
 *   node scripts/seed-user.js admin@cms.com    Pass@1234 "Admin"  admin
 */
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

const [,, email, password, name, role = "user"] = process.argv;

if (!email || !password || !name) {
  console.error("Usage: node scripts/seed-user.js <email> <password> <name> [role]");
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  email:            { type: String, required: true, unique: true, lowercase: true },
  password:         { type: String, required: true },
  name:             { type: String, required: true },
  role:             { type: String, enum: ["user", "admin", "master_admin"], default: "user" },
  twoFactorSecret:  { type: String, default: null },
  twoFactorEnabled: { type: Boolean, default: false },
}, { timestamps: true });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const hashed  = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    await User.updateOne({ email: email.toLowerCase() }, { $set: { password: hashed, name, role } });
    console.log(`✓ Updated user: ${email}  role: ${role}`);
  } else {
    await User.create({ email: email.toLowerCase(), password: hashed, name, role });
    console.log(`✓ Created user:`);
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role:     ${role}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
