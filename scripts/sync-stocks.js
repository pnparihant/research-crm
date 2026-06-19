/**
 * Sync stock + sector data from CMOTS MSSQL into MongoDB companies collection.
 *
 * Usage:
 *   node scripts/sync-stocks.js
 *
 * What it does:
 *   - Reads all rows from commondb.dbo.tbl_stockmaster (StockName, sect_name)
 *   - For each stock, finds the matching Company in MongoDB by name and updates its sector
 *   - Stocks with no matching Company are skipped (they aren't in the CMS master data)
 *   - Run this whenever CMOTS data changes
 */
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const sql = require("mssql");

// Load .env.local manually (bypasses dotenvx interception)
const envFile = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  });
}

const mssqlConfig = {
  server: process.env.MSSQL_HOST,
  database: process.env.MSSQL_DB,
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  port: parseInt(process.env.MSSQL_PORT || "1433"),
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 15000,
  requestTimeout: 30000,
};

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not loaded");
  if (!process.env.MSSQL_HOST) throw new Error("MSSQL_HOST not loaded");

  console.log("Connecting to MSSQL:", mssqlConfig.server, mssqlConfig.database);
  const pool = await sql.connect(mssqlConfig);
  const result = await pool.request().query(
    "SELECT StockName, sect_name FROM commondb.dbo.tbl_stockmaster ORDER BY StockName"
  );
  const stocks = result.recordset;
  console.log(`Fetched ${stocks.length} stocks from MSSQL`);
  await sql.close();

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  const Company = mongoose.connection.collection("companies");

  // Ensure a default group exists for CMOTS stocks
  const CompanyGroup = mongoose.connection.collection("companygroups");
  let group = await CompanyGroup.findOne({ name: "CMOTS" });
  if (!group) {
    const ins = await CompanyGroup.insertOne({ name: "CMOTS", createdAt: new Date(), updatedAt: new Date() });
    group = { _id: ins.insertedId };
    console.log("Created CompanyGroup: CMOTS");
  }

  let upserted = 0, updated = 0;
  for (const { StockName, sect_name } of stocks) {
    const res = await Company.updateOne(
      { name: StockName },
      { $set: { name: StockName, sector: sect_name ?? "", groupId: group._id, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) upserted++;
    else updated++;
  }

  console.log(`Done. ${upserted} inserted, ${updated} updated.`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err.message); process.exit(1); });
