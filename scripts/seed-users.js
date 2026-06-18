const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

const users = [
  { name: "Abhishek Jain",      email: "abhishek.jain@arihantcapital.com" },
  { name: "Yomika Agarwal",     email: "yomika.agarwal@arihantcapital.com" },
  { name: "Bala S",             email: "bala@arihantcapital.com" },
  { name: "Ashvath Rajan",      email: "ashvath.rajan@arihantcapital.com" },
  { name: "Natasha Singh",      email: "natasha.singh@arihantcapital.com" },
  { name: "Deepali Kumari",     email: "deepali.kumari@arihantcapital.com" },
  { name: "Khushi Parekh",      email: "khushi.parekh@arihantcapital.com" },
  { name: "Kunjal Agarwal",     email: "kunjal.agarwal@arihantcapital.com" },
  { name: "Ronak Osthwal",      email: "ronak.osthwal@arihantcapital.com" },
  { name: "Rohan Baranwal",     email: "rohan.baranwal@arihantcapital.com" },
  { name: "Shivani Goyal",      email: "shivani.goyal@arihantcapital.com" },
  { name: "Poonam Jain",        email: "poonam.jain@arihantcapital.com" },
  { name: "Rashmi Gohil",       email: "rashmi.gohil@arihantcapital.com" },
  { name: "Juhi Manwani",       email: "juhi.manwani@arihantcapital.com" },
  { name: "Riddhesh Kadam",     email: "riddhesh.kadam@arihantcapital.com" },
  { name: "Ananya Mathur",      email: "ananya.mathur@arihantcapital.com" },
  { name: "Anita Gandhi",       email: "anita.gandhi@arihantcapital.com" },
  { name: "Yogesh Dhumal",      email: "yogesh.dhumal@arihantcapital.com" },
  { name: "Jagdish Chaurasia",  email: "jagdish.chaurasia@arihantcapital.com" },
  { name: "Chandresh Kasurde",  email: "chandresh.kasurde@arihantcapital.com" },
  { name: "Sonam Gupta",        email: "sonam.gupta@arihantcapital.com" },
  { name: "Vikrant Kadam",      email: "vikrant.kadam@arihantcapital.com" },
  { name: "Ketan Gala",         email: "ketan.gala@arihantcapital.com" },
  { name: "Vinod Shirke",       email: "vinod.shirke@arihantcapital.com" },
  { name: "Samrudhi Kamble",    email: "samrudhi.kamble@arihantcapital.com" },
  { name: "Rucchi Modi",        email: "rucchi.modi@arihantcapital.com" },
  // Khushi Solanki skipped — no email provided
];

const DEFAULT_PASSWORD = "Arihant@2027$";

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, default: "user" },
  twoFactorEnabled: { type: Boolean, default: false },
  assignedClients: { type: [mongoose.Schema.Types.ObjectId], default: [] },
}, { collection: "users" });

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB\n");

  const User = mongoose.model("User", UserSchema);
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  let created = 0, skipped = 0;

  for (const u of users) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`  SKIP  ${u.email} (already exists)`);
      skipped++;
      continue;
    }
    await User.create({ name: u.name, email: u.email, password: hashed, role: "user" });
    console.log(`  OK    ${u.name} <${u.email}>`);
    created++;
  }

  console.log(`\nDone. Created: ${created}  Skipped: ${skipped}`);
  console.log(`Default password: ${DEFAULT_PASSWORD}`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
