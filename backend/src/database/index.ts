import mongoose from 'mongoose';
import { config } from '../config';

if (config.nodeEnv !== 'production') {
  mongoose.set('debug', true);
}

// When a replica set is configured (MONGO_REPLICA_SET_NAME + MONGO_REPLICA_HOSTS in
// config/index.ts), read from secondaries where possible instead of hammering the
// primary. No-op for a single-node connection.
const connectOptions: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 2000,
  ...(config.mongoReplicaSetName
    ? { replicaSet: config.mongoReplicaSetName, readPreference: 'secondaryPreferred' }
    : {})
};

// A freshly started container's outbound DNS (and the mongodb+srv:// lookup it depends
// on) can briefly ECONNREFUSED in the first instant after boot, before Docker's network
// namespace is fully wired up — a handful of short retries rides that out in-process
// instead of exiting and making `restart: always` recreate the whole container (which
// just re-triggers the same cold-start race every time).
const CONNECT_RETRIES = 5;
const CONNECT_RETRY_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectDB = async (): Promise<typeof mongoose> => {
  try {
    let lastError: unknown;
    for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt++) {
      try {
        const conn = await mongoose.connect(config.mongoUri, connectOptions);
        console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
        return conn;
      } catch (error) {
        lastError = error;
        if (attempt < CONNECT_RETRIES) {
          console.warn(`[Database] Connection attempt ${attempt}/${CONNECT_RETRIES} failed, retrying in ${CONNECT_RETRY_DELAY_MS}ms...`, error);
          await sleep(CONNECT_RETRY_DELAY_MS);
        }
      }
    }
    throw lastError;
  } catch (error) {
    if (config.nodeEnv === 'production') {
      // Never fail open into fake storage in production — an unreachable
      // MONGO_URI must crash the process loudly (and page whoever's on call),
      // not silently start serving traffic against data that vanishes on restart.
      console.error(`[Database] Could not connect to MongoDB at ${config.mongoUri}:`, error);
      process.exit(1);
    }

    console.warn(`[Database] Local MongoDB not reachable at ${config.mongoUri}. Starting MongoMemoryServer for local dev...`);
    try {
      // Lazy-required: mongodb-memory-server is a devDependency and must never
      // be needed outside development/test (see the production branch above).
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoMemoryServer = await MongoMemoryServer.create();
      const uri = mongoMemoryServer.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`[Database] In-Memory MongoDB Connected (dev only): ${uri}`);
      return conn;
    } catch (memErr) {
      console.error(`[Database] Error starting MongoMemoryServer:`, memErr);
      process.exit(1);
    }
  }
};
