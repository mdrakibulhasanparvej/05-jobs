import { Router } from "express";
import { HealthController } from "./health.controller";

const router = Router();

// mounted at the root: /health (liveness) and /ready (readiness, P9)
router.get("/health", HealthController.healthCheck);
router.get("/ready", HealthController.readyCheck);

export const HealthRoutes = router;
