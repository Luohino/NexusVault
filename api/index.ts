import { createApp } from "../src/server/app.js";

let app: any;

export default async (req: any, res: any) => {
  try {
    if (!app) {
      app = await createApp();
    }
    return app(req, res);
  } catch (error: any) {
    console.error('API handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};
