/**
 * MSSQL Explorer — lists all tables and their columns
 *
 * 1. Fill in your connection details below (or set env vars)
 * 2. Run: node scripts/explore-mssql.js
 */
require("dotenv").config({ path: ".env.local" });
const sql = require("mssql");

const config = {
  server:   process.env.MSSQL_HOST     || "YOUR_SERVER",
  database: process.env.MSSQL_DB       || "YOUR_DATABASE",
  user:     process.env.MSSQL_USER     || "YOUR_USERNAME",
  password: process.env.MSSQL_PASSWORD || "YOUR_PASSWORD",
  port:     Number(process.env.MSSQL_PORT) || 1433,
  options: {
    encrypt: false,           // set true if using Azure
    trustServerCertificate: true,
  },
};

async function main() {
  await sql.connect(config);
  console.log("✓ Connected to MSSQL\n");

  // List all user tables
  const tables = await sql.query`
    SELECT TABLE_SCHEMA, TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_SCHEMA, TABLE_NAME
  `;

  console.log("=== ALL TABLES ===");
  for (const t of tables.recordset) {
    console.log(`\n[${t.TABLE_SCHEMA}].[${t.TABLE_NAME}]`);

    const cols = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = ${t.TABLE_NAME} AND TABLE_SCHEMA = ${t.TABLE_SCHEMA}
      ORDER BY ORDINAL_POSITION
    `;

    for (const c of cols.recordset) {
      console.log(`    ${c.COLUMN_NAME.padEnd(35)} ${c.DATA_TYPE.padEnd(15)} ${c.IS_NULLABLE === "YES" ? "nullable" : "required"}`);
    }
  }

  // Preview first 3 rows of each table
  console.log("\n\n=== SAMPLE DATA (first 3 rows per table) ===");
  for (const t of tables.recordset) {
    try {
      const preview = await sql.query(
        `SELECT TOP 3 * FROM [${t.TABLE_SCHEMA}].[${t.TABLE_NAME}]`
      );
      if (preview.recordset.length) {
        console.log(`\n[${t.TABLE_SCHEMA}].[${t.TABLE_NAME}]`);
        console.table(preview.recordset);
      }
    } catch {
      // skip tables we can't read
    }
  }

  await sql.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
