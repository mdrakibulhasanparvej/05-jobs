import config from "../../config/index";
import redisClient from "../../lib/redis";
import { catchAsync } from "../../utils/catchAsync";
import { prisma } from "../../../db/client";
import status from "http-status";

/**
 * GET /health — liveness + DB reachability (P0 gate).
 * Shape fixed by the plan: `{ status: "ok", service, db: "up" | "down" }`.
 */
const healthCheck = catchAsync(async (_, res) => {
	let db: "up" | "down" = "down";

	try {
		await prisma.$queryRaw`SELECT 1`;
		db = "up";
	} catch {
		db = "down";
	}

	res.status(200).json({
		status: "ok",
		service: config.service_name,
		db,
	});
});

/**
 * GET /ready — readiness (P9): DB must answer; Redis is reported but does not
 * fail readiness (design §7.5 keeps Redis fail-open).
 */
const readyCheck = catchAsync(async (_, res) => {
	let db: "up" | "down" = "down";
	let redis: "up" | "down" = "down";

	try {
		await prisma.$queryRaw`SELECT 1`;
		db = "up";
	} catch {
		db = "down";
	}

	try {
		redis = (await redisClient.ping()) === "PONG" ? "up" : "down";
	} catch {
		redis = "down";
	}

	const ready = db === "up";

	res.status(ready ? status.OK : status.SERVICE_UNAVAILABLE).json({
		status: ready ? "ready" : "not-ready",
		service: config.service_name,
		db,
		redis,
	});
});

export const HealthController = { healthCheck, readyCheck };
