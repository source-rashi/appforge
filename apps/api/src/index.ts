import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes";
import appRoutes from "./routes/app.routes";
import importRoutes from "./routes/import.routes";
import notificationRoutes from "./routes/notification.routes";
import { errorHandler } from "./middleware/error.middleware";

import morgan from "morgan";

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "4000", 10);
// Railway sets FRONTEND_URL, default to localhost
const CORS_ORIGIN = process.env.FRONTEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ─── App bootstrap ────────────────────────────────────────────────────────────

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export const dynamicRouter = express.Router();
app.use("/api/auth", authRoutes);
app.use("/api/apps", appRoutes);
app.use("/api/apps", importRoutes);
app.use("/api/apps", dynamicRouter);
app.use("/api/notifications", notificationRoutes);

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

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`\n  🔧 AppForge API running at http://localhost:${PORT}`);
    console.log(`  📋 Health check:          http://localhost:${PORT}/health\n`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('SIGTERM or SIGINT received. Shutting down gracefully...');
    server.close(async () => {
      console.log('HTTP server closed.');
      const { prisma } = await import('./db/prisma');
      await prisma.$disconnect();
      console.log('Database connection closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
