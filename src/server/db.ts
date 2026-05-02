import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('CRITICAL: DATABASE_URL is not set.');
} else if (connectionString.includes('[YOUR-PASSWORD]')) {
  console.error('CRITICAL: DATABASE_URL contains placeholder password.');
}

// Institutional Scaling: Primary Write Instance
const poolSize = Number(process.env.DB_POOL_SIZE || '10');
const writeClient = postgres(connectionString as string, {
  connect_timeout: 10,
  idle_timeout: 20,
  max: poolSize,
  onnotice: () => {},
  transform: { undefined: null }
});

// High-Performance Read Replica (Optional)
const readConnectionString = process.env.READ_REPLICA_URL || connectionString;
const readClient = postgres(readConnectionString as string, {
  connect_timeout: 5,
  idle_timeout: 30,
  max: Math.max(poolSize, 20), // Reads usually need more capacity
  onnotice: () => {},
  transform: { undefined: null }
});

export const db = drizzle(writeClient, { schema });
export const readDb = drizzle(readClient, { schema });
