// Run: node scripts/seed-admin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
const EMAIL    = process.env.ADMIN_EMAIL    || "admin@cms.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "adminpassword";
const NAME     = process.env.ADMIN_NAME     || "Admin User";

const UserSchema = new mongoose.Schema({
  email:             { type: String, required: true, unique: true, lowercase: true },
  password:          { type: String, required: true },
  name:              { type: String, required: true },
  role:              { type: String, default: "user" },
  twoFactorSecret:   { type: String, default: null },
  twoFactorEnabled:  { type: Boolean, default: false },
}, { timestamps: true });

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB:", MONGODB_URI);

  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const existing = await User.findOne({ email: EMAIL });
  if (existing) {
    await User.updateOne({ email: EMAIL }, { $set: { role: "admin" } });
    console.log(`✓ Updated existing user "${EMAIL}" → role: admin`);
  } else {
    const hashed = await bcrypt.hash(PASSWORD, 12);
    await User.create({ email: EMAIL, password: hashed, name: NAME, role: "admin" });
    console.log(`✓ Created admin user`);
    console.log(`  Email:    ${EMAIL}`);
    console.log(`  Password: ${PASSWORD}`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => { console.error(err); process.exit(1); });
