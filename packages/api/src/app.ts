import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { clerkAuth, requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import { requestLogger } from "./middleware/request-logger.js";

import propertiesRouter from "./routes/properties.js";
import photosRouter from "./routes/photos.js";
import analysesRouter from "./routes/analyses.js";
import renovationsRouter from "./routes/renovations.js";
import designJourneyRouter from "./routes/design-journey.js";
import webhooksRouter from "./routes/webhooks.js";
import scrapeRouter from "./routes/scrape.js";
import adminRouter from "./routes/admin.js";
import editHistoryRouter from "./routes/edit-history.js";

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({ origin: env.frontendUrl, credentials: true }));

// Request logging
app.use(requestLogger);

// Webhooks need raw body for signature verification — mount BEFORE json parser
app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  webhooksRouter
);

// JSON body parser for everything else
app.use(express.json());

// SSE token-in-query-string support: EventSource can't set headers,
// so copy ?token= into the Authorization header before Clerk sees it.
app.use("/api/v1", (req, _res, next) => {
  if (!req.headers.authorization && typeof req.query.token === "string") {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
});

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
app.use("/api/v1", adminRouter);
app.use("/api/v1", editHistoryRouter);

// Global error handler
app.use(errorHandler);

export default app;
