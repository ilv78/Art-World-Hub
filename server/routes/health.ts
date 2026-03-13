import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({
      status: "ok",
      version: process.env.APP_VERSION ?? "unknown",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: "error",
      message: "Database unreachable",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
