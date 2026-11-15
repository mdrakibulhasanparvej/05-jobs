import { prisma } from "../../db/client";
import type { Role } from "../../generated/enums";
import status from "http-status";
import config from "../config";
import redisClient from "../lib/redis";
import AppError from "../utils/appError";

/**
 * D18 — role/permission matrix from design §7.4, in one place.
 *
 * - `JP_MO` is deliberately absent: the design enum carries it but the §7.4
 *   matrix has no row for it (question Q1) → deny-by-default. No permission
 *   list may include JP_MO until Q1 is answered.
 * - TRAINER permissions are trade-scoped: `batch.trade_id ∈
 *   trainer_trades(trainerId)` — data-driven, not role-driven. `can()` only
 *   answers the coarse question; the service must also call
 *   `assertTrainerTrade`.
 */
export const PERMISSIONS = {
	/** registration approve/reject */
	"registration.review": ["ADMIN", "MODERATOR"],
	/** role change — ADMIN only (§7.4 safety rule) */
	"user.role.change": ["ADMIN"],
	/** block/unblock */
	"user.block": ["ADMIN", "MODERATOR"],
	/** own admission form fill/draft save/submit (ACTIVE users only — requireActive) */
	"admission.form.self": ["STUDENT"],
	/** enter a form on someone's behalf from a paper form */
	"admission.form.staff": ["ADMIN", "MODERATOR"],
	/** SUBMITTED → ACCEPTED/REJECTED (trainer: own trade only) */
	"admission.review": ["ADMIN", "MODERATOR", "TRAINER"],
	/** manual/offline payment entry */
	"payment.manual": ["ADMIN", "MODERATOR", "ACCOUNTS"],
	/** fee verify + MR number + APPROVED */
	"payment.verify": ["ADMIN", "MODERATOR"],
	/** refund */
	"payment.refund": ["ADMIN", "ACCOUNTS"],
	/** post-IN_PROGRESS status changes, results, remarks (trainer: own trade) */
	"academy.progress.manage": ["ADMIN", "MODERATOR", "TRAINER"],
	/** course assign / video unlock (trainer: own-trade courses) */
	"course.assign": ["ADMIN", "MODERATOR", "TRAINER"],
	/** reading one's own data/payments */
	"data.own.read": ["ADMIN", "MODERATOR", "TRAINER", "ACCOUNTS", "STUDENT"],
} as const satisfies Record<string, readonly Role[]>;

export type PermissionKey = keyof typeof PERMISSIONS;

/** staff = ADMIN/MODERATOR (admission SELF+STAFF wording in the design) */
export const STAFF_ROLES: readonly Role[] = ["ADMIN", "MODERATOR"];

export const can = (role: Role, permission: PermissionKey): boolean =>
	(PERMISSIONS[permission] as readonly Role[]).includes(role);

const trainerCacheKey = (userId: string) => `trainer:${userId}:trades`;
const TRAINER_CACHE_TTL_SECONDS = Number(config.trainer_cache_ttl) || 300; // design §7.5: 5 minutes

/** Trade ids a trainer may work in — Redis-cached 5 min (design §7.5). */ export const getTrainerTradeIds =
	async (userId: string): Promise<string[]> => {
		try {
			const cached = await redisClient.get(trainerCacheKey(userId));
			if (cached) {
				return JSON.parse(cached) as string[];
			}
		} catch {
			// cache miss → straight to the DB
		}

		const rows = await prisma.trainerTrade.findMany({
			where: { userId },
			select: { tradeId: true },
		});

		const tradeIds = rows.map((row) => row.tradeId);

		try {
			await redisClient.set(trainerCacheKey(userId), JSON.stringify(tradeIds), {
				expiration: { type: "EX", value: TRAINER_CACHE_TTL_SECONDS },
			});
		} catch {
			// fail-open
		}

		return tradeIds;
	};

/** 403 unless the trainer is scoped to the given trade. */
export const assertTrainerTrade = async (
	userId: string,
	tradeId: string,
): Promise<void> => {
	const tradeIds = await getTrainerTradeIds(userId);

	if (!tradeIds.includes(tradeId)) {
		throw new AppError(status.FORBIDDEN, "You are not assigned to this trade");
	}
};

/** Called when trainer_trades changes (PUT /trades/:id/trainers). */
export const invalidateTrainerTradeCache = async (
	userId: string,
): Promise<void> => {
	try {
		await redisClient.del(trainerCacheKey(userId));
	} catch {
		// fail-open: the 5-minute TTL bounds staleness
	}
};
