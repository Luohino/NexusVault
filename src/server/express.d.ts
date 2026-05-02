// src/server/express.d.ts
// Extends Express Request with typed userId to eliminate all (req as any).userId casts
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
