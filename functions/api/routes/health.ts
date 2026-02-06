/**
 * Health and configuration endpoints
 */

import { Hono } from "hono";
import type { HonoEnv } from "../lib/types";
import { supportedCountries } from "../lib/constants";

const healthRoutes = new Hono<HonoEnv>();

// Health check
healthRoutes.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: c.env.APP_NAME || "Unbiased API",
    timestamp: new Date().toISOString(),
  });
});

// Get supported countries
healthRoutes.get("/countries", (c) => {
  return c.json({
    countries: supportedCountries,
  });
});

export { healthRoutes };
