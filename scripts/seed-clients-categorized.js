/**
 * Seed categorized institutional clients.
 * Usage: node scripts/seed-clients-categorized.js
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

const DATA = {
  "Mutual Fund": [
    "Baroda BNP Paribhas(Baroda MF)", "J.M Financial Mutual Fund", "LIC Mutual Fund",
    "NJ Mutual Fund", "Nippon Life India Asset Management LTD", "PGIM India Mutual Fund",
    "Quant Money Manager LTD", "Quantum Mutual Fund", "Sundaram Mutual Fund",
    "Groww", "Edelweiss", "Mahindra Manu Life", "Samco Mutual Fund", "Tauras Mutual Fund",
  ],
  "PMS": [
    "Angel One Investment Managers & Advisors Pvt Ltd",
    "Asit C. Mehta Investment Interrmediates Ltd", "Capgrow Capital Advisor LLP",
    "Fort Capital Investment Advisory Pvt. Ltd.", "Findoc Investmart Private Limited",
    "Green Portfolio Pvt. Ltd.", "Jade Wealth Management LLP", "Kitara India Growth Fund",
    "Moneygrow Asset Pvt. Ltd", "Motilal Oswal Wealth Limited", "NV Alfa Fund Management LLP",
    "Oaklane Capital Management LLP", "Profitgate Capital Services LLP",
    "Profusion Investment Advisors LLP", "PRP Edge Wealth Private Limited",
    "Quest Investments", "RBSA Investment Manager LLP", "Swyom Advisors Limited",
    "TCG Advisory Services Pvt. Ltd. Fund 1", "Varanium Indian Opportunity Fund",
    "White Stone Financial Advisors Pvt.Ltd",
  ],
  "AIF": [
    "31 Degrees North Fund I", "Bfly India Opportunities Fund",
    "Blue Lotus Capital Multi Bagger Fund II", "Dalmus Capital Management",
    "Electrum AIF-Viksit Bharat Fund", "Emerge Capital Opportunities Schme",
    "First waters capital Fund - II", "I-Wealth Management", "ITI Long-Short Equity Fund",
    "Monomer Capital Scheme 1", "Nexus Equity Growth Fund",
    "Nuvama Enhanced Dynamic Growth Equity(EDGE)Fund",
    "Oculus Capital Alternative Investment Fund-Oculus Capital Growth Fund",
    "Ohana India Growth Fund", "Swyom India Alpha Fund", "SBI Funds Management Limited",
    "Value Wise Undiscovered Fund", "Venturex Fund I",
  ],
  "Domestic Financial Institution": ["Roha Ventures Firm"],
  "Insurance": ["Star Union Dia-ichi Life Insurance Co.Ltd"],
};

const ClientSchema = new mongoose.Schema({
  code:     { type: String, sparse: true, trim: true },
  name:     { type: String, required: true, trim: true },
  category: { type: String, trim: true },
}, { timestamps: true });

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not set in .env.local");
  await mongoose.connect(process.env.MONGODB_URI);

  // Fix the code index: drop the old non-sparse unique index and recreate it sparse
  // so that multiple documents without a code can coexist.
  try {
    await mongoose.connection.collection("clients").dropIndex("code_1");
    console.log("✓  Dropped old code_1 index");
  } catch {
    // Index didn't exist or already dropped — that's fine
  }
  await mongoose.connection.collection("clients").createIndex(
    { code: 1 },
    { unique: true, sparse: true, background: true }
  );
  console.log("✓  Recreated code_1 as sparse unique index\n");

  const Client = mongoose.models.Client || mongoose.model("Client", ClientSchema);

  let created = 0, updated = 0;
  for (const [category, names] of Object.entries(DATA)) {
    for (const name of names) {
      const existing = await Client.findOne({ name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
      if (existing) {
        await Client.updateOne({ _id: existing._id }, { $set: { category } });
        console.log(`↻  Updated  "${name}" → ${category}`);
        updated++;
      } else {
        await Client.collection.insertOne({ name: name.trim(), category, createdAt: new Date(), updatedAt: new Date() });
        console.log(`✓  Created  "${name}" (${category})`);
        created++;
      }
    }
  }

  console.log(`\nDone. Created: ${created}  Updated: ${updated}`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err.message); process.exit(1); });
