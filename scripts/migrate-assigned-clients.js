const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const users = await db.collection("users").find({ role: "user" }).toArray();
  let migrated = 0;

  for (const user of users) {
    const existing = user.assignedClients ?? [];
    if (existing.length === 0) continue;

    // Already migrated if first entry has a "client" key
    if (existing[0] && typeof existing[0] === "object" && existing[0].client) {
      console.log(`  SKIP  ${user.email} (already migrated)`);
      continue;
    }

    // Old shape: array of ObjectIds — convert to new shape
    const newShape = existing.map((clientId) => ({
      client: clientId,
      assignedBy: user._id, // attribute to the user themselves as placeholder
      assignedByName: "Migration",
      assignedAt: new Date(),
    }));

    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { assignedClients: newShape } }
    );
    console.log(`  OK    ${user.email} — migrated ${existing.length} client(s)`);
    migrated++;
  }

  console.log(`\nDone. ${migrated} user(s) migrated.`);
  await mongoose.disconnect();
}

migrate().catch((err) => { console.error(err); process.exit(1); });
