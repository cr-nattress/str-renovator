import "dotenv/config";
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { clerkAuth, requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import { startWorkers } from "./jobs/worker.js";

import propertiesRouter from "./routes/properties.js";
import photosRouter from "./routes/photos.js";
import analysesRouter from "./routes/analyses.js";
import renovationsRouter from "./routes/renovations.js";
import designJourneyRouter from "./routes/design-journey.js";
import webhooksRouter from "./routes/webhooks.js";
import scrapeRouter from "./routes/scrape.js";

const app = express();

// CORS
app.use(cors({ origin: env.frontendUrl, credentials: true }));

// Webhooks need raw body for signature verification — mount BEFORE json parser
app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  webhooksRouter
);

// JSON body parser for everything else
app.use(express.json());

// Clerk middleware
app.use("/api/v1", clerkAuth);

// Auth required for all /api/v1 routes
app.use("/api/v1", requireAuth);

// Health check (no auth required)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Mount routes
app.use("/api/v1/properties", propertiesRouter);
app.use("/api/v1", photosRouter);
app.use("/api/v1", analysesRouter);
app.use("/api/v1", renovationsRouter);
app.use("/api/v1", designJourneyRouter);
app.use("/api/v1", scrapeRouter);

// Global error handler
app.use(errorHandler);

// Start server + workers
app.listen(env.port, () => {
  console.log(`[server] API running on http://localhost:${env.port}`);
  startWorkers();
});

export default app;
