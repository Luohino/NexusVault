export default async (req: any, res: any) => {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET (length: ' + process.env.DATABASE_URL.length + ')' : 'MISSING',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? 'SET' : 'MISSING',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      REDIS_URL: process.env.REDIS_URL ? 'SET' : 'MISSING',
      VERCEL_URL: process.env.VERCEL_URL || 'NOT SET',
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL || 'NOT SET',
    }
  };

  // Test 1: Can we import the db module?
  try {
    const { db } = await import("../src/server/db.js");
    results.dbImport = 'OK';

    // Test 2: Can we run a simple query?
    try {
      const { users } = await import("../src/server/schema.js");
      const { sql } = await import("drizzle-orm");
      const testResult = await db.execute(sql`SELECT 1 as test`);
      results.dbQuery = 'OK';
      results.dbQueryResult = testResult;
    } catch (queryErr: any) {
      results.dbQuery = 'FAILED';
      results.dbQueryError = queryErr.message;
      results.dbQueryStack = queryErr.stack;
    }
  } catch (importErr: any) {
    results.dbImport = 'FAILED';
    results.dbImportError = importErr.message;
    results.dbImportStack = importErr.stack;
  }

  // Test 3: Can we create the Express app?
  try {
    const { createApp } = await import("../src/server/app.js");
    const app = await createApp();
    results.appCreate = 'OK';
  } catch (appErr: any) {
    results.appCreate = 'FAILED';
    results.appCreateError = appErr.message;
  }

  res.status(200).json(results);
};
