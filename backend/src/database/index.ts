import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from '../config';

let mongoMemoryServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<typeof mongoose> => {
  try {
    // 1. Try connecting to default MONGO_URI
    const conn = await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`[Database] MongoDB Connected to local instance: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[Database] Local MongoDB not reachable at ${config.mongoUri}. Starting MongoMemoryServer...`);
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const uri = mongoMemoryServer.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`[Database] In-Memory MongoDB Connected: ${uri}`);
      return conn;
    } catch (memErr) {
      console.error(`[Database] Error starting MongoMemoryServer:`, memErr);
      process.exit(1);
    }
  }
};
