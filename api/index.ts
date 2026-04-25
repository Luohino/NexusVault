import { createApp } from "../src/server/app.js";

let app: any;

export default async (req: any, res: any) => {
  try {
    if (!app) {
      console.log('Sovereign Bridge: Cold start detected. Initializing application...');
      app = await createApp();
    }
    return await app(req, res);
  } catch (error: any) {
    console.error('CRITICAL DEPLOYMENT ANOMALY:', error);
    res.status(500).json({ 
      error: 'Institutional Server Error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
};
