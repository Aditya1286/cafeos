import mongoose from 'mongoose';
import { config } from '../config';

export const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
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
