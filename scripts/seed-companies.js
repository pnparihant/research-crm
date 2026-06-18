/**
 * Seeds client company names into MongoDB (CompanyGroup + Company collections)
 * Run: node scripts/seed-companies.js
 */
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const CompanyGroupSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true } });
const CompanySchema = new mongoose.Schema({
  name:    { type: String, required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyGroup", required: true },
});

const DATA = {
  "Mutual Fund": [
    "Baroda BNP Paribhas(Baroda MF)",
    "J.M Financial Mutual Fund",
    "LIC Mutual Fund",
    "NJ Mutual Fund",
    "Nippon Life India Asset Management LTD",
    "PGIM India Mutual Fund",
    "Quant Money Manager LTD",
    "Quantum Mutual Fund",
    "Sundaram Mutual Fund",
    "Groww",
    "Edelweiss",
    "Mahindra Manu Life",
    "Samco Mutual Fund",
    "Tauras Mutual Fund",
  ],
  "PMS": [
    "Angel One Investment Managers & Advisors Pvt Ltd",
    "Asit C. Mehta Investment Interrmediates Ltd",
    "Capgrow Capital Advisor LLP",
    "Fort Capital Investment Advisory Pvt. Ltd.",
    "Findoc Investmart Private Limited",
    "Green Portfolio Pvt. Ltd.",
    "Jade Wealth Management LLP",
    "Kitara India Growth Fund",
    "Moneygrow Asset Pvt. Ltd",
    "Motilal Oswal Wealth Limited",
    "NV Alfa Fund Management LLP",
    "Oaklane Capital Management LLP",
    "Profitgate Capital Services LLP",
    "Profusion Investment Advisors LLP",
    "PRP Edge Wealth Private Limited",
    "Quest Investments",
    "RBSA Investment Manager LLP",
    "Swyom Advisors Limited",
    "TCG Advisory Services Pvt. Ltd. Fund 1",
    "Varanium Indian Opportunity Fund",
    "White Stone Financial Advisors Pvt.Ltd",
  ],
  "AIF": [
    "31 Degrees North Fund I",
    "Bfly India Opportunities Fund",
    "Blue Lotus Capital Multi Bagger Fund II",
    "Dalmus Capital Management",
    "Electrum AIF-Viksit Bharat Fund",
    "Emerge Capital Opportunities Schme",
    "First waters capital Fund - II",
    "I-Wealth Management",
    "ITI Long-Short Equity Fund",
    "Monomer Capital Scheme 1",
    "Nexus Equity Growth Fund",
    "Nuvama Enhanced Dynamic Growth Equity(EDGE)Fund",
    "Oculus Capital Alternative Investment Fund-Oculus Capital Growth Fund",
    "Ohana India Growth Fund",
    "Swyom India Alpha Fund",
    "SBI Funds Management Limited",
    "Value Wise Undiscovered Fund",
    "Venturex Fund I",
  ],
  "Domestic Financial Institution": [
    "Roha Ventures Firm",
  ],
  "Insurance": [
    "Star Union Dia-ichi Life Insurance Co.Ltd",
  ],
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB\n");

  const CompanyGroup = mongoose.models.CompanyGroup || mongoose.model("CompanyGroup", CompanyGroupSchema);
  const Company      = mongoose.models.Company      || mongoose.model("Company", CompanySchema);

  let groupsCreated = 0, companiesCreated = 0, skipped = 0;

  for (const [groupName, companies] of Object.entries(DATA)) {
    // Upsert group
    let group = await CompanyGroup.findOne({ name: groupName });
    if (!group) {
      group = await CompanyGroup.create({ name: groupName });
      groupsCreated++;
      console.log(`+ Group: ${groupName}`);
    } else {
      console.log(`  Group exists: ${groupName}`);
    }

    // Upsert each company
    for (const companyName of companies) {
      const exists = await Company.findOne({ name: companyName, groupId: group._id });
      if (!exists) {
        await Company.create({ name: companyName, groupId: group._id });
        companiesCreated++;
        console.log(`  + ${companyName}`);
      } else {
        skipped++;
      }
    }
  }

  console.log(`\nDone — ${groupsCreated} groups created, ${companiesCreated} companies added, ${skipped} already existed`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
