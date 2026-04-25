import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('CRITICAL: DATABASE_URL is not set.');
} else if (connectionString.includes('[YOUR-PASSWORD]')) {
  console.error('CRITICAL: DATABASE_URL contains placeholder password.');
}

// Technical Hardening: Add connection timeout and optimize for serverless
const client = postgres(connectionString as string, {
  connect_timeout: 10,
  max: 1 // Limit to 1 connection per serverless function to prevent pool exhaustion
});
export const db = drizzle(client, { schema });
