import mongoose from 'mongoose';
import { env } from './env.js';

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  if (!cached.promise) {
    const dbName = env.NODE_ENV === 'test' ? 'the-space-story-test' : 'the-space-story';
    cached.promise = mongoose
      .connect(env.MONGODB_URI, {
        dbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
      })
      .then((m) => {
        console.log(`✅ MongoDB connected: ${dbName}`);
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB connection failed:', e);
    throw e;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
