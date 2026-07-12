import mongoose from "mongoose";
import { readEnv } from "./env";
import { buildUriForDatabase } from "./ticketCompat";

function mongoUri() {
  const env = readEnv();
  const supportDb = env.supportMongodbDatabase?.trim();
  if (supportDb) {
    return buildUriForDatabase(env.mongodbUri, supportDb);
  }
  return env.mongodbUri;
}
type GlobalMongoose = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = global as typeof global & { _hsMongoose?: GlobalMongoose };

if (!g._hsMongoose) {
  g._hsMongoose = { conn: null, promise: null };
}

export async function connectDb() {
  if (g._hsMongoose!.conn) return g._hsMongoose!.conn;
  if (!g._hsMongoose!.promise) {
    g._hsMongoose!.promise = mongoose.connect(mongoUri(), { bufferCommands: false });
  }
  g._hsMongoose!.conn = await g._hsMongoose!.promise;
  return g._hsMongoose!.conn;
}
