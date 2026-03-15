import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import path from "path";
import pinoHttp from "pino-http";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { registerMcpRoutes } from "./mcp";
import healthRouter from "./routes/health";
import { logger } from "./logger";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security headers via helmet
// In development, Vite uses inline scripts and eval for HMR — relax CSP accordingly
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? undefined // use helmet defaults in production
        : false, // disable CSP in development (Vite HMR needs inline scripts)
  }),
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Health check endpoint (registered before auth/session middleware)
app.use("/", healthRouter);

// Structured request logging via pino-http
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => {
        // Only log API requests; skip static assets, health checks, etc.
        const url = (req as Request).originalUrl || req.url || "";
        return !url.startsWith("/api");
      },
    },
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

(async () => {
  // Seed database with initial data (disabled by default in production).
  // Enable explicitly with SEED_DB=true.
  if (process.env.SEED_DB === "true") {
    await seedDatabase();
  }

  await registerRoutes(httpServer, app);

  // Serve uploaded images (before MCP and static/vite catch-all)
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  registerMcpRoutes(app);
  logger.info({ module: "mcp" }, "MCP server registered at /mcp");

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error({ err, status }, "Unhandled server error");

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      logger.info({ port }, "Server listening");
    },
  );
})();
