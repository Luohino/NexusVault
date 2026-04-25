import { createApp } from "../src/server/app.js";

let app: any;

export default async (req: any, res: any) => {
  if (!app) {
    app = await createApp();
  }
  return app(req, res);
};
