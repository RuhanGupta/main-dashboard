import mongoose from 'mongoose';
import type { MongoMemoryServer } from 'mongodb-memory-server';

type GlobalWithMongoMemoryServer = typeof globalThis & {
  _mongoMemoryServer?: MongoMemoryServer;
};

let cachedConn: typeof mongoose | null = null;
let cachedPromise: Promise<typeof mongoose> | null = null;

export async function connectToDatabase() {
  if (cachedConn) return cachedConn;
  if (cachedPromise) {
    cachedConn = await cachedPromise;
    return cachedConn;
  }

  const uri = await getMongoUri();

  cachedPromise = mongoose.connect(uri, {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  cachedConn = await cachedPromise;
  return cachedConn;
}

async function getMongoUri(): Promise<string> {
  const envUri = process.env.MONGODB_URI;

  // If a real URI is configured, use it
  if (envUri && !envUri.includes('localhost:27017')) {
    return envUri;
  }

  // Try the configured localhost URI first
  if (envUri && envUri.includes('localhost')) {
    try {
      const testConn = await mongoose.createConnection(envUri, { serverSelectionTimeoutMS: 350 }).asPromise();
      await testConn.close();
      return envUri;
    } catch {
      // Fall through to in-memory
    }
  }

  // In development: use in-memory MongoDB
  if (process.env.NODE_ENV !== 'production') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');

    // Reuse the same server across hot-reloads
    const g = globalThis as GlobalWithMongoMemoryServer;
    if (!g._mongoMemoryServer) {
      g._mongoMemoryServer = await MongoMemoryServer.create();
    }
    return g._mongoMemoryServer.getUri();
  }

  throw new Error('MONGODB_URI must be set in production');
}
