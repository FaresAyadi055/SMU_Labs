// server/utils/db.ts
import mongoose from "mongoose";
import { useRuntimeConfig } from "#imports";

let cached = globalThis.mongoose as {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
} & typeof globalThis;

if (!cached) {
  cached = globalThis.mongoose = {
    conn: null,
    promise: null,
  };
}

export default async function connectDB() {
  const config = useRuntimeConfig();
  const uri = config.MONGO_URI || process.env.MONGO_URI || process.env.MONGODB_URI || "";

  if (!uri) {
    throw new Error("MONGO_URI not set – configure it in your environment");
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}