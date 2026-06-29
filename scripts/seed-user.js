/**
 * Create or update a CRM user from outside the app.
 *
 * Usage:
 *   node scripts/seed-user.js <email> <password> <name> [role] [phone] [dept]
 *
 * Examples:
 *   node scripts/seed-user.js john@arihant.com Pass@1234 "John Doe"
 *   node scripts/seed-user.js john@arihant.com Pass@1234 "John Doe" user 9920869996 research
 *   node scripts/seed-user.js admin@crm.com    Pass@1234 "Admin"    admin "" institution
 */
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Read .env.local manually — bypasses dotenvx interception
const envFile = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  });
}

const [,, email, password, name, role = "user", phone = null, dept = null] = process.argv;

if (!email || !password || !name) {
  console.error("Usage: node scripts/seed-user.js <email> <password> <name> [role] [phone] [dept]");
  process.exit(1);
}

if (dept && !["research", "institution"].includes(dept)) {
  console.error("dept must be 'research' or 'institution'");
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  email:            { type: String, required: true, unique: true, lowercase: true },
  password:         { type: String, required: true },
  name:             { type: String, required: true },
  role:             { type: String, enum: ["user", "admin", "master_admin"], default: "user" },
  dept:             { type: String, enum: ["research", "institution", null], default: null },
  phone:            { type: String, default: null },
  twoFactorSecret:  { type: String, default: null },
  twoFactorEnabled: { type: Boolean, default: false },
}, { timestamps: true });

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not loaded from .env.local");
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const hashed = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    await User.updateOne({ email: email.toLowerCase() }, { $set: { password: hashed, name, role, dept: dept || null, ...(phone ? { phone } : {}) } });
    console.log(`✓ Updated user: ${email}  role: ${role}  dept: ${dept || "none"}`);
  } else {
    await User.create({ email: email.toLowerCase(), password: hashed, name, role, phone, dept: dept || null });
    console.log(`✓ Created user:`);
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role:     ${role}`);
    console.log(`  Dept:     ${dept || "none"}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err.message); process.exit(1); });
