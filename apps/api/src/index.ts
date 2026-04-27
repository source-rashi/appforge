import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes";
import appRoutes from "./routes/app.routes";
import { errorHandler } from "./middleware/error.middleware";

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const CORS_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ─── App bootstrap ────────────────────────────────────────────────────────────

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/apps", appRoutes);

/** Health-check endpoint */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/** API info */
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "AppForge API",
    version: "0.1.0",
    docs: "/health",
  });
});

// ─── 404 catch-all ────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  🔧 AppForge API running at http://localhost:${PORT}`);
  console.log(`  📋 Health check:          http://localhost:${PORT}/health\n`);
});

export default app;
