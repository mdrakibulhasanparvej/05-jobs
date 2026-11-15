import crypto from "node:crypto";
import status from "http-status";
import config from "../config";
import redisClient from "../lib/redis";
import AppError from "../utils/appError";
import { catchAsync } from "../utils/catchAsync";

export interface IRateLimitOptions {
	/** sliding window length in seconds */
	windowSeconds: number;
	/** max requests inside the window */
	max: number;
	/** route identity, e.g. `login`, `students-post`, `chat` */
	prefix: string;
}

/**
 * D18 — sliding-window rate limit per IP+user (design §7.5).
 * Applied to: login, register, admissions POST, chat, translate, result lookup.
 * Fail-open when Redis is down (design §7.5) — except the 429 we raised
 * ourselves, which must propagate.
 */
export const rateLimit = (options: IRateLimitOptions) => {
	return catchAsync(async (req, _, next) => {
		// integration tests normally bypass the limiter; the limiter itself is
		// verified in a dedicated test with RATE_LIMIT_BYPASS=false
		if (config.rate_limit_bypass) {
			return next();
		}

		const identity = req.user?.id ?? req.ip ?? "anonymous";
		const key = `ratelimit:${options.prefix}:${identity}`;

		try {
			const now = Date.now();
			const windowStart = now - options.windowSeconds * 1000;

			await redisClient.zRemRangeByScore(key, "0", String(windowStart));

			const count = await redisClient.zCard(key);

			if (count >= options.max) {
				throw new AppError(
					status.TOO_MANY_REQUESTS,
					"Too many requests. Please try again later.",
				);
			}

			await redisClient.zAdd(key, {
				score: now,
				value: `${now}:${crypto.randomUUID()}`,
			});
			await redisClient.expire(key, options.windowSeconds);

			return next();
		} catch (error) {
			if (error instanceof AppError) {
				throw error;
			}
			// Redis unavailable → fail-open
			return next();
		}
	});
};

export default rateLimit;
