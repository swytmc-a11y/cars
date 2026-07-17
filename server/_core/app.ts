import express from "express";
import mysql from "mysql2/promise";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { dailyAlertsHandler } from "../scheduledAlerts";
import { MIGRATE_DDL } from "./migrateDdl";

const MIGRATE_SECRET = "L6AqOjaHSDBqYawzAO6fFoOE3wHx33kl";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/scheduled/daily-alerts", dailyAlertsHandler);

  // Temporary one-time schema bootstrap endpoint. Remove after use.
  app.get("/api/admin/migrate", async (req, res) => {
    if (req.query.secret !== MIGRATE_SECRET) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    if (!process.env.DATABASE_URL) {
      res.status(500).json({ error: "DATABASE_URL not set" });
      return;
    }
    const pool = mysql.createPool({
      uri: process.env.DATABASE_URL.replace(/\?ssl=\{[^}]*\}/, ""),
      ssl: { rejectUnauthorized: true },
    });
    const statements = MIGRATE_DDL.split(";\n").map(s => s.trim()).filter(Boolean);
    const results: { table: string; ok: boolean; error?: string }[] = [];
    for (const stmt of statements) {
      const match = stmt.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/);
      const table = match ? match[1] : "?";
      try {
        await pool.query(stmt);
        results.push({ table, ok: true });
      } catch (e) {
        results.push({ table, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
    await pool.end();
    res.json({ results });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
