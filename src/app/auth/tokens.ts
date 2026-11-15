import crypto from "node:crypto";
import { prisma } from "../../db/client";
import type {
	AuthTokenPurpose,
	Role,
	UserStatus,
} from "../../generated/enums";
import type { Response } from "express";
import status from "http-status";
import type { SignOptions } from "jsonwebtoken";
import config from "../config";
import redisClient from "../lib/redis";
import AppError from "../utils/appError";
import { signToken } from "../utils/jwt";
import { denylistKey } from "./auth";

/**
 * D4 — session token service (design §7.3).
 *
 * Access token:  ES256 JWT, 15 min, claims `{sub, role, status}`, iss/aud pinned.
 * Refresh token: opaque 256-bit random (NOT a JWT), httpOnly cookie, stored as
 *                SHA-256 in identity.refresh_tokens with familyId + expiresAt.
 * Rotation:      old row revoked, new row same familyId; presenting a revoked
 *                token again = reuse ⇒ the whole family is revoked (theft
 *                detection).
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const TTL_UNIT_MS: Record<string, number> = {
	s: SECOND,
	m: MINUTE,
	h: HOUR,
	d: DAY,
};

/** JWT style ttl ("1d", "12h", "30m", or seconds as a number) → milliseconds. */
export const ttlToMs = (
	value: string | number | undefined,
	fallback: number,
) => {
	if (typeof value === "number") {
		return Number.isFinite(value) && value > 0 ? value * SECOND : fallback;
	}

	const match = /^(\d+)([smhd])$/.exec(value?.trim() ?? "");

	if (!match?.[1] || !match[2]) {
		return fallback;
	}

	return Number(match[1]) * (TTL_UNIT_MS[match[2]] ?? fallback);
};

const ACCESS_TOKEN_MAX_AGE = ttlToMs(config.access_token_ttl, 15 * MINUTE);
const REFRESH_TOKEN_MAX_AGE = ttlToMs(config.refresh_token_ttl, 30 * DAY);
const REFRESH_TOKEN_TTL_SECONDS = Math.floor(REFRESH_TOKEN_MAX_AGE / 1000);

// cookies track the token lifetimes instead of hardcoded values; only the
// access cookie may authenticate API calls (D4)
export const sessionCookieOptions = () => ({
	httpOnly: true,
	secure: config.environment !== "development",
	sameSite:
		config.environment === "development" ? ("lax" as const) : ("none" as const),
	path: "/",
	...(config.cookie_domain ? { domain: config.cookie_domain } : {}),
});

export const setSessionCookies = (
	res: Response,
	tokens: { accessToken: string; refreshToken: string },
) => {
	const options = sessionCookieOptions();

	res.cookie("access_token", tokens.accessToken, {
		...options,
		maxAge: ACCESS_TOKEN_MAX_AGE,
	});
	res.cookie("refresh_token", tokens.refreshToken, {
		...options,
		maxAge: REFRESH_TOKEN_MAX_AGE,
	});
};

export const clearSessionCookies = (res: Response) => {
	// express 5: clearCookie must receive the same options used when setting
	const options = sessionCookieOptions();

	res.clearCookie("access_token", options);
	res.clearCookie("refresh_token", options);
};

export interface ISessionUser {
	id: string;
	role: Role;
	status: UserStatus;
}

export interface ISessionMeta {
	userAgent?: string | null;
	ip?: string | null;
}

const hashToken = (token: string) =>
	crypto.createHash("sha256").update(token).digest("hex");

const signAccessToken = (user: ISessionUser) =>
	signToken(
		{ sub: user.id, role: user.role, status: user.status },
		config.jwt_private_key,
		{
			algorithm: "ES256",
			expiresIn: config.access_token_ttl as NonNullable<
				SignOptions["expiresIn"]
			>,
			issuer: config.jwt_issuer,
			audience: config.jwt_audience,
		},
	);

const ACCESS_TOKEN_TTL_SECONDS = Math.max(
	Math.floor(ACCESS_TOKEN_MAX_AGE / 1000),
	1,
);

export const denylistUser = async (userId: string): Promise<void> => {
	try {
		await redisClient.set(denylistKey(userId), "1", {
			expiration: { type: "EX", value: ACCESS_TOKEN_TTL_SECONDS },
		});
	} catch {
		// fail-open: the 15-min token lifetime is the real bound
	}
};

/** opaque 256-bit refresh token — the raw value only ever lives in the cookie */
const generateRefreshToken = () => crypto.randomBytes(32).toString("hex");

const buildRefreshRow = (
	userId: string,
	familyId: string,
	meta: ISessionMeta,
) => {
	const refreshToken = generateRefreshToken();

	return {
		refreshToken,
		data: {
			userId,
			tokenHash: hashToken(refreshToken),
			familyId,
			expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
			...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
			...(meta.ip ? { ip: meta.ip } : {}),
		},
	};
};

/** login / first session: a brand-new family */
export const issueSession = async (user: ISessionUser, meta: ISessionMeta) => {
	const accessToken = signAccessToken(user);
	const { refreshToken, data } = buildRefreshRow(
		user.id,
		crypto.randomUUID(),
		meta,
	);

	await prisma.refreshToken.create({ data });

	return { accessToken, refreshToken };
};

/**
 * Refresh rotation: the presented token must be a live, unexpired row. A
 * PRESENTED-AND-REVOKED token is reuse — the whole family dies.
 */
export const rotateSession = async (
	refreshToken: string | undefined,
	meta: ISessionMeta,
) => {
	if (!refreshToken) {
		throw new AppError(
			status.UNAUTHORIZED,
			"You are not logged in. Please log in to access this resource.",
		);
	}

	const row = await prisma.refreshToken.findUnique({
		where: { tokenHash: hashToken(refreshToken) },
	});

	if (!row) {
		throw new AppError(
			status.UNAUTHORIZED,
			"Your session has expired. Please log in again",
		);
	}

	if (row.revokedAt) {
		// reuse of a rotated-out token ⇒ theft detection (design §7.3)
		await prisma.refreshToken.updateMany({
			where: { familyId: row.familyId, revokedAt: null },
			data: { revokedAt: new Date() },
		});

		throw new AppError(
			status.UNAUTHORIZED,
			"Your session has expired. Please log in again",
		);
	}

	if (row.expiresAt.getTime() <= Date.now()) {
		throw new AppError(
			status.UNAUTHORIZED,
			"Your session has expired. Please log in again",
		);
	}

	const user = await prisma.user.findUnique({ where: { id: row.userId } });

	if (!user || user.deletedAt) {
		throw new AppError(status.UNAUTHORIZED, "No account found.");
	}

	const sessionUser: ISessionUser = {
		id: user.id,
		role: user.role,
		status: user.status,
	};

	// revoke old + issue new in the SAME family, atomically
	const refreshTokenNew = await prisma.$transaction(async (tx) => {
		await tx.refreshToken.update({
			where: { id: row.id },
			data: { revokedAt: new Date() },
		});

		const fresh = buildRefreshRow(sessionUser.id, row.familyId, meta);

		await tx.refreshToken.create({ data: fresh.data });

		return fresh.refreshToken;
	});

	return {
		accessToken: signAccessToken(sessionUser),
		refreshToken: refreshTokenNew,
		user: sessionUser,
	};
};

export const revokeFamily = async (familyId: string): Promise<void> => {
	await prisma.refreshToken.updateMany({
		where: { familyId, revokedAt: null },
		data: { revokedAt: new Date() },
	});
};

/** logout — revokes the family behind the presented refresh cookie, if any */
export const revokeSession = async (
	refreshToken: string | undefined,
): Promise<void> => {
	if (!refreshToken) {
		return;
	}

	const row = await prisma.refreshToken.findUnique({
		where: { tokenHash: hashToken(refreshToken) },
	});

	if (row) {
		await revokeFamily(row.familyId);
	}
};

export const revokeAllForUser = async (userId: string): Promise<void> => {
	await prisma.refreshToken.updateMany({
		where: { userId, revokedAt: null },
		data: { revokedAt: new Date() },
	});
};

/**
 * P1 — single-use emailed links (verify email / reset password / set password).
 * Only the SHA-256 hash is stored; the raw token lives in the URL only.
 */
export const issueAuthToken = async (
	userId: string,
	purpose: AuthTokenPurpose,
	ttlMs: number,
): Promise<string> => {
	const raw = crypto.randomBytes(32).toString("hex");

	await prisma.authToken.create({
		data: {
			userId,
			purpose,
			tokenHash: hashToken(raw),
			expiresAt: new Date(Date.now() + ttlMs),
		},
	});

	return raw;
};

/** Validates a presented link token; marks it used only after the caller succeeds. */
export const consumeAuthToken = async (
	rawToken: string,
	purpose: AuthTokenPurpose,
) => {
	const row = await prisma.authToken.findUnique({
		where: { tokenHash: hashToken(rawToken) },
	});

	if (!row || row.purpose !== purpose) {
		throw new AppError(status.BAD_REQUEST, "Invalid or expired link");
	}

	if (row.usedAt) {
		throw new AppError(status.BAD_REQUEST, "This link has already been used");
	}

	if (row.expiresAt.getTime() <= Date.now()) {
		throw new AppError(status.BAD_REQUEST, "This link has expired");
	}

	await prisma.authToken.update({
		where: { id: row.id },
		data: { usedAt: new Date() },
	});

	return row;
};

/**
 * D19 — internal service token: ES256, `aud=internal`, `sub=svc:<service>`,
 * 60 s TTL, signed by identity with the same private key. No shared secret.
 * No role/status claims on purpose — `serviceAuth()` never reads them.
 */
export const signInternalToken = (serviceName: string) =>
	signToken({ sub: `svc:${serviceName}` }, config.jwt_private_key, {
		algorithm: "ES256",
		expiresIn: config.internal_token_ttl as NonNullable<
			SignOptions["expiresIn"]
		>,
		issuer: config.jwt_issuer,
		audience: "internal",
	});

export const REFRESH_COOKIE_TTL_SECONDS = REFRESH_TOKEN_TTL_SECONDS;
