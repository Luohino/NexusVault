export default async (req: any, res: any) => {
  try {
    const { createApp } = await import("../src/server/app.js");
    const app = await createApp();
    res.status(200).json({ status: 'app_created_successfully' });
  } catch (error: any) {
    res.status(500).json({
      status: 'app_creation_failed',
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
  }
};
