import crypto from "node:crypto";
import redisClient from "./redis";

/**
 * D18 — public GET cache (design §7.5).
 * Key shape: `cache:{service}:{route}:{queryHash}`, TTL 60–300 s, prefix delete
 * on write. Every function is fail-open: when Redis is down the caller must
 * behave as on a cache miss, never fail the request.
 */

const hashQuery = (query: unknown) =>
	crypto
		.createHash("sha256")
		.update(JSON.stringify(query ?? {}))
		.digest("hex")
		.slice(0, 32);

export const buildCacheKey = (
	service: string,
	route: string,
	query: unknown,
): string => `cache:${service}:${route}:${hashQuery(query)}`;

export const getCache = async <T>(key: string): Promise<T | null> => {
	try {
		const raw = await redisClient.get(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null; // cache miss, never a request failure
	}
};

export const setCache = async (
	key: string,
	value: unknown,
	ttlSeconds: number,
): Promise<void> => {
	try {
		await redisClient.set(key, JSON.stringify(value), {
			expiration: {
				type: "EX",
				value: Math.min(Math.max(ttlSeconds, 60), 300),
			},
		});
	} catch {
		// fail-open
	}
};

/** DELETE every cache key under a prefix — called after a write to that route. */
export const invalidateCachePrefix = async (prefix: string): Promise<void> => {
	try {
		let cursor = "0";
		do {
			// node-redis v6 scan resolves to { cursor, keys } — not a tuple
			const result = await redisClient.scan(cursor, {
				MATCH: `${prefix}*`,
				COUNT: 100,
			});
			cursor = result.cursor;
			const keys = result.keys;
			if (keys.length > 0) {
				await redisClient.del(keys);
			}
		} while (cursor !== "0");
	} catch {
		// fail-open: stale entries expire by TTL at worst
	}
};

/**
 * Read-through cache: returns the cached value when present, otherwise runs
 * `compute()` and stores the result. Fail-open — a Redis outage is a miss.
 * `null` is never cached (JSON.stringify(null) would be ambiguous).
 */
export const readThroughCache = async <T>(
	key: string,
	ttlSeconds: number,
	compute: () => Promise<T>,
): Promise<T> => {
	const cached = await getCache<T>(key);

	if (cached !== null) {
		return cached;
	}

	const value = await compute();

	if (value !== null && value !== undefined) {
		await setCache(key, value, ttlSeconds);
	}

	return value;
};
