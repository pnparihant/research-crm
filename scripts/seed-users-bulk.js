/**
 * Bulk create/update CRM users with phone numbers and designations.
 * Usage: node scripts/seed-users-bulk.js [defaultPassword]
 * Default password: Arihant@1234
 */
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const envFile = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  });
}

const DEFAULT_PASSWORD = process.argv[2] || "Arihant@1234";

const USERS = [
  // Research Dept
  { name: "Abhishek Jain",     email: "abhishek.jain@arihantcapital.com",    phone: "9920869996", designation: "Director of Equity Research",                             dept: "research" },
  { name: "Yomika Agarwal",    email: "yomika.agarwal@arihantcapital.com",   phone: "9820354995", designation: "Executive Vice President - Institutional Equity Sales",    dept: "research" },
  { name: "Bala S",            email: "bala@arihantcapital.com",              phone: "9962825618", designation: "Sr Equity Research Analyst",                              dept: "research" },
  { name: "Ashvath Rajan",     email: "ashvath.rajan@arihantcapital.com",    phone: "9320088900", designation: "Equity Research Analyst",                                 dept: "research" },
  { name: "Natasha Singh",     email: "natasha.singh@arihantcapital.com",    phone: "7264831451", designation: "Institutional Equity Sales Manager",                      dept: "research" },
  { name: "Deepali Kumari",    email: "deepali.kumari@arihantcapital.com",   phone: "9980402982", designation: "Equity Research Associate",                               dept: "research" },
  { name: "Khushi Parekh",     email: "khushi.parekh@arihantcapital.com",    phone: "8369259948", designation: "Institutional Equity Sales Manager",                      dept: "research" },
  { name: "Kunjal Agarwal",    email: "kunjal.agarwal@arihantcapital.com",   phone: "9636030652", designation: "Equity Research Associate",                               dept: "research" },
  { name: "Ronak Osthwal",     email: "ronak.osthwal@arihantcapital.com",    phone: "9284382120", designation: "Equity Research Associate",                               dept: "research" },
  { name: "Rohan Baranwal",    email: "rohan.baranwal@arihantcapital.com",   phone: "9819224665", designation: "Equity Research Associate",                               dept: "research" },
  { name: "Shivani Goyal",     email: "shivani.goyal@arihantcapital.com",    phone: "9152220399", designation: "Sr Manager Sales",                                        dept: "research" },
  { name: "Poonam Jain",       email: "poonam.jain@arihantcapital.com",      phone: "9324837300", designation: "Institutional Equity Sales Manager",                      dept: "research" },
  { name: "Rashmi Gohil",      email: "rashmi.gohil@arihantcapital.com",     phone: "8975530350", designation: "Equity Research Analyst",                                 dept: "research" },
  { name: "Juhi Manwani",      email: "juhi.manwani@arihantcapital.com",     phone: "6375931935", designation: "Intern",                                                  dept: "research" },
  { name: "Riddhesh Kadam",    email: "riddhesh.kadam@arihantcapital.com",   phone: "9321426099", designation: "Intern",                                                  dept: "research" },
  { name: "Ananya Mathur",     email: "ananya.mathur@arihantcapital.com",    phone: "9619554977", designation: "Intern",                                                  dept: "research" },
  { name: "Khushi Solanki",    email: null,                                   phone: "9773821447", designation: "Intern",                                                  dept: "research" },
  { name: "Aditya Banerjee",   email: "aditya.banerjee@arihantcapital.com",  phone: "8850330976", designation: "Intern",                                                  dept: "research" },
  // Institutional Dept
  { name: "Anita Gandhi",      email: "anita.gandhi@arihantcapital.com",     phone: "9892336365", designation: "Head Institutional Equities",                             dept: "institution" },
  { name: "Yogesh Dhumal",     email: "yogesh.dhumal@arihantcapital.com",    phone: "7666765786", designation: "Institutional Sales Trader",                              dept: "institution" },
  { name: "Jagdish Chaurasia", email: "jagdish.chaurasia@arihantcapital.com", phone: "9833393093", designation: "Institutional Dealer",                                   dept: "institution" },
  { name: "Chandresh Kasurde", email: "chandresh.kasurde@arihantcapital.com", phone: "9820391188", designation: "Institutional Dealer",                                   dept: "institution" },
  { name: "Sonam Gupta",       email: "sonam.gupta@arihantcapital.com",      phone: "9594942663", designation: "Institutional Dealer",                                    dept: "institution" },
  { name: "Vikrant Kadam",     email: "vikrant.kadam@arihantcapital.com",    phone: "9004294299", designation: "Institutional Dealer",                                    dept: "institution" },
  { name: "Ketan Gala",        email: "ketan.gala@arihantcapital.com",       phone: "9820199882", designation: "Institution Client Relationship",                         dept: "institution" },
  { name: "Vinod Shirke",      email: "vinod.shirke@arihantcapital.com",     phone: "9833652183", designation: "Insti Backoffice Executive",                              dept: "institution" },
  { name: "Samrudhi Kamble",   email: "samrudhi.kamble@arihantcapital.com",  phone: "8879125056", designation: "Insti Backoffice Executive",                              dept: "institution" },
  { name: "Rucchi Modi",       email: "rucchi.modi@arihantcapital.com",      phone: "9833445854", designation: "Back Office Operations",                                  dept: "institution" },
];

const UserSchema = new mongoose.Schema({
  email:            { type: String, unique: true, lowercase: true, sparse: true },
  password:         { type: String, required: true },
  name:             { type: String, required: true },
  role:             { type: String, enum: ["user", "admin", "master_admin"], default: "user" },
  dept:             { type: String, enum: ["research", "institution", null], default: null },
  designation:      { type: String, default: null },
  phone:            { type: String, default: null },
  twoFactorSecret:  { type: String, default: null },
  twoFactorEnabled: { type: Boolean, default: false },
  loginOtp:         { type: String, default: null },
  loginOtpExpiry:   { type: Date, default: null },
}, { timestamps: true });

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not set in .env.local");
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  let created = 0, updated = 0, skipped = 0;

  for (const u of USERS) {
    if (!u.email) {
      console.log(`⚠  Skipped ${u.name} — no email address`);
      skipped++;
      continue;
    }
    const existing = await User.findOne({ email: u.email.toLowerCase() });
    if (existing) {
      await User.updateOne(
        { email: u.email.toLowerCase() },
        { $set: { phone: u.phone, name: u.name, designation: u.designation, dept: u.dept } }
      );
      console.log(`↻  Updated  ${u.name} (${u.email}) — ${u.designation} [${u.dept}]`);
      updated++;
    } else {
      await User.create({
        email: u.email.toLowerCase(),
        password: hashed,
        name: u.name,
        phone: u.phone,
        designation: u.designation,
        dept: u.dept,
        role: "user",
      });
      console.log(`✓  Created  ${u.name} (${u.email}) — ${u.designation} [${u.dept}]`);
      created++;
    }
  }

  console.log(`\nDone. Created: ${created}  Updated: ${updated}  Skipped: ${skipped}`);
  console.log(`Default password: ${DEFAULT_PASSWORD}`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err.message); process.exit(1); });
