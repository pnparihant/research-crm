/**
 * Seed the default client categories into the ClientCategory collection.
 * These were previously hardcoded in ManageClients.tsx.
 *
 * Usage:
 *   node scripts/seed-client-categories.js
 *
 * Safe to re-run — skips categories that already exist.
 */

const path = require("path");
const fs   = require("fs");
const mongoose = require("mongoose");

const envFile = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envFile)) {
  require("dotenv").config({ path: envFile });
} else {
  require("dotenv").config();
}

const CATEGORIES = [
  "Mutual Fund",
  "PMS",
  "AIF",
  "Domestic Financial Institution",
  "Insurance",
];

const ClientCategorySchema = new mongoose.Schema(
  { name: { type: String, required: true, unique: true, trim: true } },
  { timestamps: true }
);

const ClientCategory =
  mongoose.models.ClientCategory ||
  mongoose.model("ClientCategory", ClientCategorySchema);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌  MONGODB_URI is not set. Check your .env.local file.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅  Connected to MongoDB\n");

  let created = 0;
  let skipped = 0;

  for (const name of CATEGORIES) {
    const existing = await ClientCategory.findOne({ name });
    if (existing) {
      console.log(`  — skipped (already exists): "${name}"`);
      skipped++;
    } else {
      await ClientCategory.create({ name });
      console.log(`  + created: "${name}"`);
      created++;
    }
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
