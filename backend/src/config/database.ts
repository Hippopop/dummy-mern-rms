import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}

export function registerShutdownHooks(): void {
  const shutdown = async () => {
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}
