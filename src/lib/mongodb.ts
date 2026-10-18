import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI environment variable');
}

/**
 * Serverless functions can be invoked many times per second, each in a
 * fresh execution context. Without caching, every invocation would open a
 * new MongoDB connection -> connection storms and exhausted Atlas connection
 * limits. We cache the connection (and the in-flight connect promise) on
 * the Node.js global object, which *is* reused across warm invocations.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // allow retry on next call instead of caching a rejected promise
    throw err;
  }

  return cached.conn;
}
