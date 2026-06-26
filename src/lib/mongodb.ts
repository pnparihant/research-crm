import mongoose from "mongoose";


interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };
global.mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error("MONGODB_URI environment variable is not defined");

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    console.log("[mongodb] Connecting to MongoDB...");
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false, maxPoolSize: 100 })
      .catch((err) => {
        cached.promise = null; // allow retry on next request
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error("[mongodb] Connection failed:", err);
    throw new Error("Database connection failed. Please try again later.");
  }

  console.log("[mongodb] Connected to MongoDB");
  return cached.conn;
}
