/**
 * Barrel for `@gs/common`.
 *
 * NOTE: `lib/stripe.ts` is deliberately NOT re-exported — it throws at import
 * time when STRIPE_SECRET_KEY is missing, and only the billing gateway
 * adapter (02-academy, P4) may import it directly.
 */

export { default as auth, optionalAuth, requireActive } from "./auth/auth";
export {
	assertTrainerTrade,
	can,
	getTrainerTradeIds,
	invalidateTrainerTradeCache,
	PERMISSIONS,
	STAFF_ROLES,
} from "./auth/rbac";
export {
	clearSessionCookies,
	consumeAuthToken,
	denylistUser,
	issueAuthToken,
	issueSession,
	revokeAllForUser,
	revokeFamily,
	revokeSession,
	rotateSession,
	sessionCookieOptions,
	setSessionCookies,
	signInternalToken,
	ttlToMs,
} from "./auth/tokens";
export { default as config } from "./config";
export {
	buildCacheKey,
	getCache,
	invalidateCachePrefix,
	readThroughCache,
	setCache,
} from "./lib/cache";
export { cloudinary } from "./lib/cloudinary";
export { default as googleClient } from "./lib/googleAuth";
export {
	default as upload,
	multerFileSchema,
	uploadSingle,
} from "./lib/multer";
export { brandLogoAttachment, default as transporter } from "./lib/nodeMailer";
export { default as redisClient } from "./lib/redis";
export { default as errorHandler } from "./middleware/globalErrorHandler";
export { notFound } from "./middleware/notFound";
export { rateLimit } from "./middleware/rateLimit";
export { requestLogger } from "./middleware/requestLogger";
export { securityHeaders } from "./middleware/security";
export { default as serviceAuth } from "./middleware/serviceAuth";
export { default as validateRequest } from "./middleware/validateRequest";
export type {
	IJwtPayload,
	IMeta,
	IQuery,
	IResponsePayload,
	RequestUser,
} from "./types";
export { default as AppError } from "./utils/appError";
export { default as recordAudit } from "./utils/audit";
export { catchAsync } from "./utils/catchAsync";
export { comparePassword, hashPassword } from "./utils/hashPassword";
export { signToken, verifyToken } from "./utils/jwt";
export { default as mergeMulterPayload } from "./utils/mergeMulterPayload";
export { removeUndefined } from "./utils/removeUndefined";
export { default as sendResponse } from "./utils/sendResponse";
export { default as uploadImage } from "./utils/uploadImage";
