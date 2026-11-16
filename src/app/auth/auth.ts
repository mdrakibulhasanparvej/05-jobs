import type { Role } from "../../generated/enums";
import status from "http-status";
import config from "../config";
import redisClient from "../lib/redis";
import type { RequestUser } from "../types";
import AppError from "../utils/appError";
import { catchAsync } from "../utils/catchAsync";
import { verifyToken } from "../utils/jwt";

declare global {
	namespace Express {
		interface User extends RequestUser {}
		interface Request {
			user?: User;
		}
	}
}

export const denylistKey = (userId: string) => `denylist:user:${userId}`;

/** fail-open: a Redis outage must not lock everyone out (D18) */
const isDenied = async (userId: string): Promise<boolean> => {
	try {
		return (await redisClient.get(denylistKey(userId))) !== null;
	} catch {
		return false;
	}
};

/**
 * D12 — claims-only auth (design §7.4): no DB read per request.
 *
 * Changes from Task Orbit:
 * 1. verify with the PUBLIC key, algorithms pinned to ES256 + issuer/audience,
 * 2. only the `access_token` cookie / bearer header is accepted — the refresh
 *    cookie is opaque and must never authenticate an API call,
 * 3. Redis denylist check (`denylist:user:{id}` — written on block/role change),
 * 4. role allow-list comes from the caller's `auth(...roles)` array,
 * 5. `req.user = { id, role, status }` straight from the claims.
 *
 * A blocked user stays valid for up to 15 min UNLESS the denylist key was
 * written — block/role-change endpoints write it (see tokens.denylistUser).
 */
const auth = (...roles: Role[]) => {
	return catchAsync(async (req, _, next) => {
		const bearerToken = req.headers.authorization?.startsWith("Bearer ")
			? req.headers.authorization?.split(" ")[1]
			: req.headers.authorization;

		const token = req.cookies?.access_token ?? bearerToken;

		if (!token) {
			throw new AppError(
				status.UNAUTHORIZED,
				"You are not logged in. Please log in to access this resource.",
			);
		}

		const decoded = verifyToken(token, config.jwt_public_key, {
			algorithms: ["ES256"],
			issuer: config.jwt_issuer,
			audience: config.jwt_audience,
		});

		if (!decoded.success || !decoded.data) {
			// 401, not 400: an expired or invalid access token is an
			// authentication failure. The browser renews the session on 401
			// only, so answering 400 here silently signs the user out once the
			// 15-minute access token expires.
			throw new AppError(
				status.UNAUTHORIZED,
				decoded.message || "Invalid or expired token",
			);
		}

		const claims = decoded.data;

		if (await isDenied(claims.sub)) {
			throw new AppError(
				status.UNAUTHORIZED,
				"Your session is no longer valid. Please log in again",
			);
		}

		if (roles.length > 0 && !roles.includes(claims.role)) {
			// 403 (not Task Orbit's 401): authenticated but not allowed —
			// the P1 gate asserts MODERATOR → role-change = 403
			throw new AppError(status.FORBIDDEN, "You are unauthorized");
		}

		req.user = {
			id: claims.sub,
			role: claims.role,
			status: claims.status,
		};
		next();
	});
};

/**
 * `status === ACTIVE` straight from the claim (design §7.4). Mounted AFTER
 * `auth()` on every endpoint except the PENDING-user allow-list
 * (`PUT /applicants/me/trade` — see rbac.ts).
 */
export const requireActive = () => {
	return catchAsync(async (req, _, next) => {
		const user = req.user as Express.User | undefined;

		if (!user) {
			throw new AppError(
				status.BAD_REQUEST,
				"You are not logged in. Please log in to access this resource.",
			);
		}

		if (user.status !== "ACTIVE") {
			throw new AppError(
				status.FORBIDDEN,
				"Your account is not active yet. Please contact support.",
			);
		}

		next();
	});
};

/**
 * Optional auth for routes that are public but must behave differently for
 * staff (P2: batch list/detail). Never throws — an absent/invalid token simply
 * leaves `req.user` unset.
 */
export const optionalAuth = () => {
	return catchAsync(async (req, _, next) => {
		const bearerToken = req.headers.authorization?.startsWith("Bearer ")
			? req.headers.authorization?.split(" ")[1]
			: req.headers.authorization;

		const token = req.cookies?.access_token ?? bearerToken;

		if (!token) {
			return next();
		}

		const decoded = verifyToken(token, config.jwt_public_key, {
			algorithms: ["ES256"],
			issuer: config.jwt_issuer,
			audience: config.jwt_audience,
		});

		if (!decoded.success || !decoded.data) {
			return next();
		}

		const claims = decoded.data;

		if (await isDenied(claims.sub)) {
			return next();
		}

		req.user = {
			id: claims.sub,
			role: claims.role,
			status: claims.status,
		};
		next();
	});
};

export default auth;
