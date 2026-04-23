import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function checkUsers() {
    try {
        const usersResult = await db.execute('SELECT id, username FROM users');
        console.log('Users in DB:', JSON.stringify(usersResult, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

checkUsers();
