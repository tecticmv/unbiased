/**
 * Main API entry point
 * Routes are organized into modular files under routes/
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HonoEnv } from "./lib/types";

// Import route modules
import { healthRoutes } from "./routes/health";
import { reportRoutes } from "./routes/reports";
import { analysisRoutes } from "./routes/analysis";
import { translationRoutes } from "./routes/translation";
import { jobRoutes } from "./routes/jobs";
import { discussionRoutes } from "./routes/discussion";
import { presenceRoutes } from "./routes/presence";
import { websocketRoutes } from "./routes/websocket";

// Create main app with base path
const app = new Hono<HonoEnv>().basePath("/api");

// Apply CORS middleware
app.use("/*", cors());

// Mount all route modules
app.route("/", healthRoutes);
app.route("/", reportRoutes);
app.route("/", analysisRoutes);
app.route("/", translationRoutes);
app.route("/", jobRoutes);
app.route("/", discussionRoutes);
app.route("/", presenceRoutes);
app.route("/", websocketRoutes);

export default app;
