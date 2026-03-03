// server/utils/db.ts
import mongoose from "mongoose";

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

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
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}