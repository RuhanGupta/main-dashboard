import mongoose from 'mongoose';
import type { MongoMemoryServer } from 'mongodb-memory-server';

type MongoCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

type GlobalWithMongo = typeof globalThis & {
  _mongoMemoryServer?: MongoMemoryServer;
  _mongooseCache?: MongoCache;
};

const globalWithMongo = globalThis as GlobalWithMongo;

// The cache lives on globalThis, not in module scope: Next.js re-evaluates route
// modules on hot reload and bundles route handlers separately, so a module-level
// cache is dropped constantly and every request pays a fresh Atlas handshake
// (SRV lookup + TLS + SCRAM auth ≈ 200ms, plus ~90ms per new pooled socket).
const cache: MongoCache = (globalWithMongo._mongooseCache ??= { conn: null, promise: null });

export async function connectToDatabase() {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = getMongoUri()
      .then(uri =>
        mongoose.connect(uri, {
          bufferCommands: false,
          maxPoolSize: 10,
          // Open a few sockets up front so the first queries of a request don't
          // each pay the ~90ms cost of growing the pool on demand.
          minPoolSize: 2,
          serverSelectionTimeoutMS: 5000,
        })
      )
      .catch(error => {
        // Don't cache a rejected promise — the next request should retry.
        cache.promise = null;
        throw error;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
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
    if (!globalWithMongo._mongoMemoryServer) {
      globalWithMongo._mongoMemoryServer = await MongoMemoryServer.create();
    }
    return globalWithMongo._mongoMemoryServer.getUri();
  }

  throw new Error('MONGODB_URI must be set in production');
}
