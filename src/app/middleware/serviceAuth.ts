import status from "http-status";
import config from "../config";
import type { RequestService } from "../types";
import AppError from "../utils/appError";
import { catchAsync } from "../utils/catchAsync";
import { verifyToken } from "../utils/jwt";

declare global {
	namespace Express {
		interface Request {
			service?: RequestService;
		}
	}
}

/**
 * D19 — service-to-service auth: ES256 token with `aud=internal`,
 * `iss=gs-identity`, `sub=svc:<service>`, 60 s TTL, verified with the public
 * key. Endpoint allow-list is exact: only `PUT /internal/users/:id/profile`.
 */
const serviceAuth = () => {
	return catchAsync(async (req, _, next) => {
		const bearerToken = req.headers.authorization?.startsWith("Bearer ")
			? req.headers.authorization?.split(" ")[1]
			: req.headers.authorization;

		if (!bearerToken) {
			throw new AppError(
				status.UNAUTHORIZED,
				"Service token is required to access this resource.",
			);
		}

		const decoded = verifyToken<{ sub: string }>(
			bearerToken,
			config.jwt_public_key,
			{
				algorithms: ["ES256"],
				issuer: config.jwt_issuer,
				audience: "internal",
			},
		);

		if (!decoded.success || !decoded.data) {
			throw new AppError(status.UNAUTHORIZED, "Invalid service token.");
		}

		const sub = decoded.data.sub;

		if (!sub?.startsWith("svc:")) {
			throw new AppError(status.UNAUTHORIZED, "Invalid service token.");
		}

		req.service = { service: sub.slice("svc:".length) };
		next();
	});
};

export default serviceAuth;
