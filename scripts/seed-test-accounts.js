// Creates three fixed test accounts that bypass OTP with magic code 000000
// Run: node scripts/seed-test-accounts.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
const PASSWORD = "Test@1234";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: "user" },
    twoFactorSecret: { type: String, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    assignedClients: { type: Array, default: [] },
    phone: { type: String, default: null },
    loginOtp: { type: String, default: null },
    loginOtpExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

const TEST_ACCOUNTS = [
  { email: "test.client@arihantcapital.com", name: "Test Client", role: "user" },
  { email: "test.admin@arihantcapital.com", name: "Test Admin", role: "admin" },
  { email: "test.masteradmin@arihantcapital.com", name: "Test Master Admin", role: "master_admin" },
];

async function main() {
  if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1); }
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB\n");

  const User = mongoose.models.User || mongoose.model("User", UserSchema);
  const hashed = await bcrypt.hash(PASSWORD, 12);

  for (const account of TEST_ACCOUNTS) {
    const existing = await User.findOne({ email: account.email });
    if (existing) {
      await User.updateOne({ email: account.email }, { $set: { role: account.role, password: hashed } });
      console.log(`✓ Updated  ${account.email}  (role: ${account.role})`);
    } else {
      await User.create({ ...account, password: hashed });
      console.log(`✓ Created  ${account.email}  (role: ${account.role})`);
    }
  }

  console.log(`\nAll test accounts use password: ${PASSWORD}`);
  console.log("OTP: 000000  (magic bypass — no email/SMS needed)");
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
