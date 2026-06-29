/**
 * Generate a dummy Excel file for testing export format.
 * Usage: node scripts/generate-excel.js [count]
 * Output: scripts/dummy-submissions.xlsx
 */
const path = require("path");
const ExcelJS = require("exceljs");

const COUNT = parseInt(process.argv[2] || "60", 10);

const RESEARCH_REPS = [
  { name: "Abhishek Jain",  desig: "Director of Equity Research" },
  { name: "Bala S",         desig: "Sr Equity Research Analyst" },
  { name: "Ashvath Rajan",  desig: "Equity Research Analyst" },
  { name: "Natasha Singh",  desig: "Institutional Equity Sales Manager" },
  { name: "Deepali Kumari", desig: "Equity Research Associate" },
  { name: "Shivani Goyal",  desig: "Sr Manager Sales" },
  { name: "Rashmi Gohil",   desig: "Equity Research Analyst" },
  { name: "Poonam Jain",    desig: "Institutional Equity Sales Manager" },
];

const INSTI_REPS = [
  { name: "Anita Gandhi",   desig: "Head Institutional Equities" },
  { name: "Yogesh Dhumal",  desig: "Institutional Sales Trader" },
  { name: "Natasha Singh",  desig: "Institutional Equity Sales Manager" },
  { name: "Ketan Gala",     desig: "Institution Client Relationship" },
];

const RESEARCH_CLIENTS = [
  "ICICI Prudential AMC", "SBI Mutual Fund", "HDFC AMC",
  "Nippon India MF", "Axis Mutual Fund", "Kotak Mahindra AMC",
  "DSP Investment Managers", "Mirae Asset", "UTI AMC", "Franklin Templeton India",
];

const INSTI_CLIENTS = [
  "ADITYA BIRLA PENSION - E - TIER I", "LIC Pension Fund", "NPS Trust",
  "Employees Provident Fund", "Kotak Mahindra Life Insurance",
  "HDFC Life Insurance", "SBI Life Insurance", "ICICI Prudential Life",
  "Max Life Insurance", "Bajaj Allianz Life Insurance",
];

const STOCKS = [
  { name: "TCS",           sector: "IT - Software" },
  { name: "Infosys",       sector: "IT - Software" },
  { name: "HDFC Bank",     sector: "Banking" },
  { name: "Reliance Ind",  sector: "Oil & Gas" },
  { name: "ITC",           sector: "FMCG" },
  { name: "Wipro",         sector: "IT - Software" },
  { name: "Bajaj Finance", sector: "NBFC" },
  { name: "Asian Paints",  sector: "Paints" },
  { name: "Sun Pharma",    sector: "Pharma" },
  { name: "Maruti Suzuki", sector: "Auto" },
  { name: "L&T",           sector: "Capital Goods" },
  { name: "Titan",         sector: "Consumer Durables" },
  { name: "Nestle India",  sector: "FMCG" },
  { name: "ONGC",          sector: "Oil & Gas" },
  { name: "Tata Motors",   sector: "Auto" },
];

const ANALYSTS = [
  { name: "Abhishek Jain",  desig: "Director of Equity Research" },
  { name: "Bala S",         desig: "Sr Equity Research Analyst" },
  { name: "Ashvath Rajan",  desig: "Equity Research Analyst" },
  { name: "Rashmi Gohil",   desig: "Equity Research Analyst" },
  { name: "Deepali Kumari", desig: "Equity Research Associate" },
];

const RECS = ["Buy", "Sell", "Hold"];
const MODES = ["Phone", "Online Meet", "Physical"];

const RESEARCH_RATIONALES = [
  "Strong Q2 results with revenue beat of 8%. Management guided for healthy double digit growth in FY25.",
  "Margin expansion driven by cost efficiency and premiumisation strategy.",
  "Valuation comfort after recent correction. Risk-reward favourable at current levels.",
  "New product launches and distribution expansion to drive volume growth over next 2 years.",
  "Sector tailwind from government capex push. Order book at all-time high of ₹4.2L cr.",
  "Export recovery expected in H2. New geography penetration adding incremental revenue.",
  "Debt reduction on track. Free cash flow generation improving quarter on quarter.",
  "Market share gains in core business. Premiumisation driving ASP improvement.",
];

const INSTI_RATIONALES = [
  "Discussed overall market outlook and sector rotation strategy for Q3.",
  "Portfolio review meeting. Discussed rebalancing towards defensive names.",
  "Quarterly strategy update shared. Client aligned on large-cap bias for now.",
  "Discussed upcoming IPO pipeline and subscription strategy.",
  "Budget impact analysis shared. Client wants sector-wise impact note.",
  "ESG screening discussion. Client moving towards responsible investing framework.",
];

const FEEDBACKS = [
  "Client showed strong interest. Follow-up call scheduled for next week.",
  "Client asked for detailed model. Sent across post the call.",
  "Positive reception. Client indicated likely allocation in next rebalancing cycle.",
  "Client already has position. Discussing adding on dips.",
  "Neutral feedback. Client wants to watch one more quarter before deciding.",
  "Client requested a management meet. Coordinating with IR team.",
  "Very engaged discussion. Client shared their own thesis — broadly aligned.",
  "Short call. Client travelling. Will reconnect next week.",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomDate(daysBack = 180) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  return d.toISOString().slice(0, 10);
}

function randomCmpTarget() {
  const cmp = (Math.random() * 4000 + 200).toFixed(0);
  const target = (parseFloat(cmp) * (1 + (Math.random() * 0.4 - 0.05))).toFixed(0);
  return `${cmp} / ${target}`;
}

function randomSubmittedAt(dateStr) {
  const d = new Date(dateStr);
  d.setHours(Math.floor(Math.random() * 10 + 8), Math.floor(Math.random() * 60));
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Arihant Capital Markets";
  wb.created = new Date();

  const ws = wb.addWorksheet("All Submissions");

  const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4B0082" } };
  const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const BORDER = {
    top:    { style: "thin", color: { argb: "FFD1D5DB" } },
    left:   { style: "thin", color: { argb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    right:  { style: "thin", color: { argb: "FFD1D5DB" } },
  };

  ws.columns = [
    { header: "Sr.No",                       key: "srno",      width: 7  },
    { header: "Type",                         key: "type",      width: 14 },
    { header: "Date",                         key: "date",      width: 13 },
    { header: "Arihant Representative",       key: "rep",       width: 24 },
    { header: "Designation",                  key: "desig",     width: 22 },
    { header: "Client Name",                  key: "client",    width: 30 },
    { header: "Buy Side Person",              key: "analyst",   width: 24 },
    { header: "Buy Side Person Designation",  key: "adesig",    width: 28 },
    { header: "Mode of Communication",        key: "mode",      width: 20 },
    { header: "Company",                      key: "company",   width: 22 },
    { header: "Sector",                       key: "sector",    width: 18 },
    { header: "CMP & Target",                 key: "cmp",       width: 18 },
    { header: "Buy / Sell / Hold",            key: "rec",       width: 14 },
    { header: "Rationale",                    key: "rationale", width: 40 },
    { header: "Feedback",                     key: "feedback",  width: 40 },
    { header: "Others",                       key: "others",    width: 30 },
    { header: "Submitted By",                 key: "subBy",     width: 22 },
    { header: "Email",                        key: "email",     width: 32 },
    { header: "Submitted At",                 key: "subAt",     width: 22 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = BORDER;
  });
  headerRow.height = 30;

  const researchCount = Math.round(COUNT * 0.6);
  const instiCount = COUNT - researchCount;
  const rows = [];

  for (let i = 0; i < researchCount; i++) {
    const rep = pick(RESEARCH_REPS);
    const analyst = pick(ANALYSTS);
    const stock = pick(STOCKS);
    const date = randomDate();
    rows.push({
      type: "Research", date, rep: rep.name, desig: rep.desig,
      client: pick(RESEARCH_CLIENTS), analyst: analyst.name, adesig: analyst.desig,
      mode: pick(MODES), company: stock.name, sector: stock.sector,
      cmp: randomCmpTarget(), rec: pick(RECS),
      rationale: pick(RESEARCH_RATIONALES), feedback: pick(FEEDBACKS),
      others: Math.random() > 0.7 ? "Client requested NDR with management." : "",
      subBy: rep.name, email: rep.name.toLowerCase().replace(" ", ".") + "@arihantcapital.com",
      subAt: randomSubmittedAt(date),
    });
  }

  for (let i = 0; i < instiCount; i++) {
    const rep = pick(INSTI_REPS);
    const date = randomDate();
    rows.push({
      type: "Institution", date, rep: rep.name, desig: rep.desig,
      client: pick(INSTI_CLIENTS), analyst: rep.name, adesig: rep.desig,
      mode: pick(MODES), company: "", sector: "", cmp: "", rec: "",
      rationale: pick(INSTI_RATIONALES), feedback: pick(FEEDBACKS),
      others: Math.random() > 0.7 ? "Follow-up deck sent post meeting." : "",
      subBy: rep.name, email: rep.name.toLowerCase().replace(" ", ".") + "@arihantcapital.com",
      subAt: randomSubmittedAt(date),
    });
  }

  // Sort by date desc
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));

  rows.forEach((r, i) => {
    const isInsti = r.type === "Institution";
    const row = ws.addRow({ srno: i + 1, ...r });

    const typeCell = row.getCell("type");
    typeCell.font = { bold: true, color: { argb: isInsti ? "FF6B21A8" : "FF1D4ED8" } };

    if (!isInsti && r.rec) {
      const recCell = row.getCell("rec");
      if (r.rec === "Buy")  recCell.font = { color: { argb: "FF15803D" }, bold: true };
      if (r.rec === "Sell") recCell.font = { color: { argb: "FFB91C1C" }, bold: true };
      if (r.rec === "Hold") recCell.font = { color: { argb: "FFB45309" }, bold: true };
    }

    if (isInsti) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF5FF" } };
      });
    }

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = BORDER;
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];

  const outPath = path.resolve(__dirname, "dummy-submissions.xlsx");
  await wb.xlsx.writeFile(outPath);
  console.log(`✓ Generated ${COUNT} rows (${researchCount} research + ${instiCount} institution)`);
  console.log(`  File: ${outPath}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
