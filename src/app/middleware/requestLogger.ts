import crypto from "node:crypto";
import type { RequestHandler } from "express";
import config from "../config";

/**
 * P9 observability minimum: one structured line per request with a request id,
 * service, method, path (no query string), status and latency.
 * Never logs bodies, tokens, cookies or PII.
 */
export const requestLogger = (): RequestHandler => (req, res, next) => {
	const incoming = req.headers["x-request-id"];
	const requestId =
		typeof incoming === "string" && incoming.length > 0
			? incoming.slice(0, 100)
			: crypto.randomUUID();

	res.setHeader("x-request-id", requestId);

	const path = req.originalUrl.split("?")[0] ?? req.originalUrl;
	const quiet =
		path === "/health" ||
		path === "/ready" ||
		// integration suites fire hundreds of requests — keep their output clean
		config.environment === "test";

	const started = process.hrtime.bigint();

	res.on("finish", () => {
		if (quiet) {
			return;
		}

		const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;

		console.log(
			JSON.stringify({
				level: res.statusCode >= 500 ? "error" : "info",
				service: config.service_name ?? "gs-service",
				requestId,
				method: req.method,
				path,
				status: res.statusCode,
				durationMs: Math.round(durationMs * 100) / 100,
			}),
		);
	});

	next();
};

export default requestLogger;
