/**
 * Clears SaarthiWorkforce Help & Support data only.
 * Uses MONGODB_URI / SUPPORT_MONGODB_DATABASE from the environment.
 * Does NOT touch SaarthiX `saarthix_support` or any other database.
 */
import mongoose from "mongoose";

const WORKFORCE_COLLECTIONS = [
  "workforce_live_chat_sessions",
  "workforce_live_chat_messages",
  "workforce_support_tickets",
  "workforce_support_ticket_messages",
  "workforce_support_notifications",
  "workforce_support_agents",
  "workforce_callback_requests",
  "workforce_technical_team_members",
];

function buildUriForDatabase(uri, database) {
  const trimmed = uri.trim();
  const qIndex = trimmed.indexOf("?");
  const pathPart = qIndex >= 0 ? trimmed.slice(0, qIndex) : trimmed;
  const query = qIndex >= 0 ? trimmed.slice(qIndex) : "";
  const lastSlash = pathPart.lastIndexOf("/");
  if (lastSlash > pathPart.indexOf("//") + 1) {
    return pathPart.slice(0, lastSlash + 1) + database + query;
  }
  return `${pathPart.replace(/\/$/, "")}/${database}${query}`;
}

function resolveMongoUri() {
  const base = process.env.MONGODB_URI?.trim() || "mongodb://localhost:27017/saarthi_workforce_support";
  const overrideDb = process.env.SUPPORT_MONGODB_DATABASE?.trim();
  if (overrideDb) return buildUriForDatabase(base, overrideDb);
  return base;
}

function databaseNameFromUri(uri) {
  const withoutQuery = uri.split("?")[0];
  const slash = withoutQuery.lastIndexOf("/");
  if (slash <= withoutQuery.indexOf("//") + 1) return "(unknown)";
  return withoutQuery.slice(slash + 1) || "(unknown)";
}

async function main() {
  const uri = resolveMongoUri();
  const dbName = databaseNameFromUri(uri);

  if (dbName === "saarthix_support" || dbName === "saarthix") {
    console.error("Refusing to clear SaarthiX database:", dbName);
    console.error("Set MONGODB_URI to saarthi_workforce_support for workforce Help & Support.");
    process.exit(1);
  }

  console.log(`Connecting to workforce support DB: ${dbName}`);
  await mongoose.connect(uri, { bufferCommands: false });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");

  for (const name of WORKFORCE_COLLECTIONS) {
    const result = await db.collection(name).deleteMany({});
    console.log(`  ${name}: deleted ${result.deletedCount} document(s)`);
  }

  await mongoose.disconnect();
  console.log("Done — workforce Help & Support data cleared.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
