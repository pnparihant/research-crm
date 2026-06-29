/**
 * Seed dummy FormSubmission records for Excel export testing.
 * Usage: node scripts/seed-submissions.js [count]
 * Default count: 50
 *
 * Requires at least one user in the DB. Uses the first user found if no match.
 */
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

const envFile = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  });
}

const COUNT = parseInt(process.argv[2] || "50", 10);

// ── Sample data pools ────────────────────────────────────────────────────────

const RESEARCH_USERS = [
  { name: "Abhishek Jain",  email: "abhishek.jain@arihantcapital.com",  designation: "Director of Equity Research" },
  { name: "Bala S",         email: "bala@arihantcapital.com",            designation: "Sr Equity Research Analyst" },
  { name: "Ashvath Rajan",  email: "ashvath.rajan@arihantcapital.com",  designation: "Equity Research Analyst" },
  { name: "Natasha Singh",  email: "natasha.singh@arihantcapital.com",  designation: "Institutional Equity Sales Manager" },
  { name: "Deepali Kumari", email: "deepali.kumari@arihantcapital.com", designation: "Equity Research Associate" },
  { name: "Shivani Goyal",  email: "shivani.goyal@arihantcapital.com",  designation: "Sr Manager Sales" },
  { name: "Rashmi Gohil",   email: "rashmi.gohil@arihantcapital.com",   designation: "Equity Research Analyst" },
];

const INSTI_USERS = [
  { name: "Anita Gandhi",      email: "anita.gandhi@arihantcapital.com",     designation: "Head Institutional Equities" },
  { name: "Yogesh Dhumal",     email: "yogesh.dhumal@arihantcapital.com",    designation: "Institutional Sales Trader" },
  { name: "Natasha Singh",     email: "natasha.singh@arihantcapital.com",    designation: "Institutional Equity Sales Manager" },
  { name: "Ketan Gala",        email: "ketan.gala@arihantcapital.com",       designation: "Institution Client Relationship" },
];

const RESEARCH_CLIENTS = [
  "ICICI Prudential AMC", "SBI Mutual Fund", "HDFC AMC", "Nippon India MF",
  "Axis Mutual Fund", "Kotak Mahindra AMC", "DSP Investment Managers",
  "Mirae Asset", "UTI AMC", "Franklin Templeton India",
];

const INSTI_CLIENTS = [
  "ADITYA BIRLA PENSION - E - TIER I", "LIC Pension Fund", "NPS Trust",
  "Employees Provident Fund", "Kotak Mahindra Life Insurance",
  "HDFC Life Insurance", "SBI Life Insurance", "ICICI Prudential Life",
  "Max Life Insurance", "Bajaj Allianz Life Insurance",
];

const STOCKS = [
  { name: "TCS",            sector: "IT - Software" },
  { name: "Infosys",        sector: "IT - Software" },
  { name: "HDFC Bank",      sector: "Banking" },
  { name: "Reliance Ind",   sector: "Oil & Gas" },
  { name: "ITC",            sector: "FMCG" },
  { name: "Wipro",          sector: "IT - Software" },
  { name: "Bajaj Finance",  sector: "NBFC" },
  { name: "Asian Paints",   sector: "Paints" },
  { name: "Sun Pharma",     sector: "Pharma" },
  { name: "Maruti Suzuki",  sector: "Auto" },
  { name: "L&T",            sector: "Capital Goods" },
  { name: "Titan",          sector: "Consumer Durables" },
  { name: "Nestle India",   sector: "FMCG" },
  { name: "ONGC",           sector: "Oil & Gas" },
  { name: "Tata Motors",    sector: "Auto" },
];

const RECOMMENDATIONS = ["Buy", "Sell", "Hold"];
const MODES = ["Phone", "Online Meet", "Physical"];

const ANALYSTS = [
  { name: "Abhishek Jain",  desig: "Director of Equity Research" },
  { name: "Bala S",         desig: "Sr Equity Research Analyst" },
  { name: "Ashvath Rajan",  desig: "Equity Research Analyst" },
  { name: "Rashmi Gohil",   desig: "Equity Research Analyst" },
  { name: "Deepali Kumari", desig: "Equity Research Associate" },
];

const RATIONALES = [
  "Strong Q2 results with revenue beat of 8%. Management guided for healthy double digit growth in FY25.",
  "Margin expansion driven by cost efficiency initiatives and premiumisation strategy paying off.",
  "Valuation comfort after recent correction. Risk-reward favourable at current levels.",
  "New product launches and distribution expansion to drive volume growth over next 2 years.",
  "Sector tailwind from government capex push. Order book at all-time high of ₹4.2L cr.",
  "Export recovery expected in H2. New geography penetration adding incremental revenue.",
  "Debt reduction on track. Free cash flow generation improving quarter on quarter.",
  "Market share gains in core business. Premiumisation driving ASP improvement.",
];

const FEEDBACKS = [
  "Client showed strong interest. Follow up call scheduled for next week.",
  "Client asked for detailed model. Sent across post the call.",
  "Positive reception. Client indicated likely allocation in next rebalancing cycle.",
  "Client already has position. Discussing adding on dips.",
  "Neutral feedback. Client wants to watch one more quarter before deciding.",
  "Client requested a management meet. Coordinating with IR team.",
  "Very engaged discussion. Client shared their own thesis — broadly aligned.",
  "Short call. Client travelling. Will reconnect next week.",
];

const INSTI_RATIONALES = [
  "Discussed overall market outlook and sector rotation strategy for Q3.",
  "Portfolio review meeting. Discussed rebalancing towards defensive names.",
  "Quarterly strategy update shared. Client aligned on large-cap bias for now.",
  "Discussed upcoming IPO pipeline and subscription strategy.",
  "Budget impact analysis shared. Client wants sector-wise impact note.",
  "ESG screening discussion. Client moving towards responsible investing framework.",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomDate(daysBack = 180) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  return d.toISOString().slice(0, 10);
}

function randomCmpTarget() {
  const cmp = (Math.random() * 4000 + 200).toFixed(0);
  const target = (parseFloat(cmp) * (1 + (Math.random() * 0.4 - 0.1))).toFixed(0);
  return `${cmp} / ${target}`;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  name:  { type: String },
  role:  { type: String },
}, { timestamps: true });

const FormSubmissionSchema = new mongoose.Schema({
  userId:                   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  formType:                 { type: String, enum: ["research", "institution"], required: true },
  date:                     { type: String, required: true },
  salesPerson:              { type: String, required: true },
  clientName:               { type: String, required: true },
  designation:              { type: String, default: "" },
  modeOfCommunication:      { type: String, required: true },
  company:                  { type: String, default: "" },
  sector:                   { type: String, default: "" },
  cmpTarget:                { type: String, default: "" },
  recommendation:           { type: String, default: "" },
  analystName:              { type: String, default: "" },
  buySideAnalystDesignation:{ type: String, default: "" },
  rationale:                { type: String, default: "" },
  feedback:                 { type: String, default: "" },
  others:                   { type: String, default: "" },
  submittedAt:              { type: Date, default: Date.now },
}, { timestamps: true });

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not set in .env.local");
  await mongoose.connect(process.env.MONGODB_URI);

  const User = mongoose.models.User || mongoose.model("User", UserSchema);
  const FormSubmission = mongoose.models.FormSubmission || mongoose.model("FormSubmission", FormSubmissionSchema);

  // Resolve user IDs by email
  async function resolveUserId(email, fallbackUser) {
    const u = await User.findOne({ email: email.toLowerCase() }).select("_id name");
    return u ? u._id : fallbackUser._id;
  }

  const fallback = await User.findOne({ role: "user" }).select("_id");
  if (!fallback) throw new Error("No users found in DB. Run seed-users-bulk.js first.");

  const submissions = [];

  // 60% research, 40% institution
  const researchCount = Math.round(COUNT * 0.6);
  const instiCount = COUNT - researchCount;

  console.log(`Generating ${researchCount} research + ${instiCount} institution submissions...`);

  // Research submissions
  for (let i = 0; i < researchCount; i++) {
    const rep = pick(RESEARCH_USERS);
    const analyst = pick(ANALYSTS);
    const stock = pick(STOCKS);
    const meetingDate = randomDate(180);
    const submittedAt = new Date(meetingDate);
    submittedAt.setHours(Math.floor(Math.random() * 10 + 8), Math.floor(Math.random() * 60));

    const userId = await resolveUserId(rep.email, fallback);

    submissions.push({
      userId,
      formType: "research",
      date: meetingDate,
      salesPerson: rep.name,
      designation: rep.designation,
      clientName: pick(RESEARCH_CLIENTS),
      modeOfCommunication: pick(MODES),
      company: stock.name,
      sector: stock.sector,
      cmpTarget: randomCmpTarget(),
      recommendation: pick(RECOMMENDATIONS),
      analystName: analyst.name,
      buySideAnalystDesignation: analyst.desig,
      rationale: pick(RATIONALES),
      feedback: pick(FEEDBACKS),
      others: Math.random() > 0.7 ? "Client requested NDR with management." : "",
      submittedAt,
    });
  }

  // Institution submissions
  for (let i = 0; i < instiCount; i++) {
    const rep = pick(INSTI_USERS);
    const meetingDate = randomDate(180);
    const submittedAt = new Date(meetingDate);
    submittedAt.setHours(Math.floor(Math.random() * 10 + 8), Math.floor(Math.random() * 60));

    const userId = await resolveUserId(rep.email, fallback);

    submissions.push({
      userId,
      formType: "institution",
      date: meetingDate,
      salesPerson: rep.name,
      designation: rep.designation,
      clientName: pick(INSTI_CLIENTS),
      modeOfCommunication: pick(MODES),
      company: "",
      sector: "",
      cmpTarget: "",
      recommendation: "",
      analystName: rep.name,
      buySideAnalystDesignation: rep.designation,
      rationale: pick(INSTI_RATIONALES),
      feedback: pick(FEEDBACKS),
      others: Math.random() > 0.7 ? "Follow-up deck sent post meeting." : "",
      submittedAt,
    });
  }

  await FormSubmission.insertMany(submissions);
  console.log(`✓ Inserted ${submissions.length} submissions (${researchCount} research, ${instiCount} institution)`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err.message); process.exit(1); });
