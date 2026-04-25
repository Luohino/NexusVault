export default async (req: any, res: any) => {
  const envCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    REDIS_URL: !!process.env.REDIS_URL,
    CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
    VITE_CLERK_PUBLISHABLE_KEY: !!process.env.VITE_CLERK_PUBLISHABLE_KEY,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    environment: envCheck,
    missing: Object.entries(envCheck)
      .filter(([_, v]) => !v)
      .map(([k]) => k),
  });
};
