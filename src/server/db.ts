import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString || connectionString.includes('[YOUR-PASSWORD]')) {
  console.error('ERROR: DATABASE_URL is not set or contains placeholder password.');
}

const client = postgres(connectionString as string);
export const db = drizzle(client, { schema });
