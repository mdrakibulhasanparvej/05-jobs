/**
 * Legacy jobholders JSON enrichment (PostgreSQL ids + snake_case schema).
 *
 * Source: taskorbit/public/jobholders.json (240 objects, legacy Mongo export)
 * Target: same file, rewritten in place with the same array order
 *   → every object gains id / trade_id / donor_id / designation_id /
 *     workplace_id / mapping_status, and the old `photo_URL` / `donner`
 *     keys become `photo_url` / `donor`
 * Lookups: academy.trades, academy.donors, jobs.designations, jobs.workplaces
 *
 * Safety rules:
 *   • idempotent — accepts both the old file (`photo_URL`, `donner`) and an
 *     already-enriched file; an existing `id` is always reused
 *   • read-only against PostgreSQL (selects only, no writes)
 *   • nothing is guessed: an unmatched reference stays null and the record is
 *     reported as PARTIAL / UNMAPPED
 *
 * Usage (from gs-servers/05-jobs):
 *   npx tsx scripts/legacy/enrich-jobholders-json.mts
 */

import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

// ─────────────────────────── configuration ───────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const JSON_PATH = path.resolve(import.meta.dirname, "../../../../taskorbit/public/jobholders.json");

if (!DATABASE_URL) throw new Error("DATABASE_URL is missing (expected in 05-jobs/.env)");

// legacy trade text → academy trade code
const TRADE_ALIAS: Record<string, string> = {
	computer: "06",
	"com freelancing and sopken eng": "09",
};

// normalized legacy designation → normalized target designation name
const DESIGNATION_ALIAS: Record<string, string> = {
	"sewing operator": "sewing machine operator",
	tailor: "professional tailor",
	"sewing machine operator smo": "sewing machine operator",
	"compuer operator": "computer operator",
	"asst com operator": "computer operator",
	operator: "sewing machine operator",
	"assistant mechanics": "garments maintenance mechanic",
	freelancer: "freelance digital marketer",
};

// workplace suffixes ignored by the second, "core" workplace pass
const WORKPLACE_SUFFIXES = new Set([
	"ltd",
	"limited",
	"pvt",
	"private",
	"co",
	"company",
	"corporation",
	"corp",
	"inc",
]);

// ─────────────────────────── helpers ───────────────────────────

const clean = (value: unknown): string | null => {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

/** lowercase → & → "and" → every non-alphanumeric run → single space → trim */
const norm = (value: unknown): string =>
	(value ?? "")
		.toString()
		.toLowerCase()
		.replace(/&/g, "and")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.replace(/\s+/g, " ")
		.trim();

/** norm() plus stripping legal-form words: "RFL Group Ltd." → "rfl group" */
const core = (value: unknown): string =>
	norm(value)
		.split(" ")
		.filter((word) => word.length > 0 && !WORKPLACE_SUFFIXES.has(word))
		.join(" ");

const uuidv7 = (): string => {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	const ms = Date.now();
	bytes[0] = (ms / 2 ** 40) & 0xff;
	bytes[1] = (ms / 2 ** 32) & 0xff;
	bytes[2] = (ms / 2 ** 24) & 0xff;
	bytes[3] = (ms / 2 ** 16) & 0xff;
	bytes[4] = (ms / 2 ** 8) & 0xff;
	bytes[5] = ms & 0xff;
	bytes[6] = (bytes[6] & 0x0f) | 0x70;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * Some local `.env` files keep a literal `@` in the password without URL
 * encoding (e.g. `postgresql://user:p@ss@host/db`). Encode everything between
 * the first `:` after `//` and the last `@`.
 */
const encodePasswordAt = (url: string): string | null => {
	const schemeEnd = url.indexOf("://");
	if (schemeEnd === -1) return null;
	const authorityStart = schemeEnd + 3;
	const lastAt = url.lastIndexOf("@");
	if (lastAt <= authorityStart) return null;
	const passwordStart = url.indexOf(":", authorityStart);
	if (passwordStart === -1 || passwordStart > lastAt) return null;
	const password = url.slice(passwordStart + 1, lastAt);
	if (!password.includes("@")) return null;
	return `${url.slice(0, passwordStart + 1)}${password.replace(/@/g, "%40")}${url.slice(lastAt)}`;
};

const isAuthError = (error: unknown): boolean => {
	const code = (error as { code?: string } | null)?.code;
	if (code === "28P01" || code === "28000") return true;
	const message = error instanceof Error ? error.message : String(error);
	return /password|authentication|SASL|SCRAM/i.test(message);
};

const connectPool = async (): Promise<{ pool: Pool; encoded: boolean }> => {
	const candidates = [DATABASE_URL as string];
	const encoded = encodePasswordAt(DATABASE_URL as string);
	if (encoded && encoded !== DATABASE_URL) candidates.push(encoded);

	let lastError: unknown;
	for (const [index, connectionString] of candidates.entries()) {
		const pool = new Pool({ connectionString, max: 5 });
		try {
			await pool.query("select 1");
			return { pool, encoded: index > 0 };
		} catch (error) {
			lastError = error;
			await pool.end();
			if (!isAuthError(error)) throw error;
		}
	}
	throw lastError;
};

// ─────────────────────────── reference data ───────────────────────────

type Trade = { id: string; code: string; nameEn: string; nameBn: string; tradeName: string };
type Donor = { id: string; name: string };
type Designation = { id: string; tradeId: string; name: string };
type Workplace = { id: string; name: string; address: string };

type LegacyJobHolder = {
	id?: string;
	_id?: string;
	name?: string;
	gender?: string | null;
	photo_url?: string | null;
	photo_URL?: string | null;
	salary?: string | null;
	trade?: string | null;
	donor?: string | null;
	donner?: string | null;
	designation?: string | null;
	workplace?: string | null;
	address?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
	added_by?: string | null;
};

type EnrichedJobHolder = {
	id: string;
	_id: string;
	name: string;
	gender: string | null;
	photo_url: string | null;
	salary: string | null;
	trade_id: string | null;
	trade: string | null;
	donor_id: string | null;
	donor: string | null;
	designation_id: string | null;
	designation: string | null;
	workplace_id: string | null;
	workplace: string | null;
	address: string | null;
	created_at: string | null;
	updated_at: string | null;
	added_by: string | null;
	mapping_status: "MAPPED" | "PARTIAL" | "UNMAPPED";
};

// ─────────────────────────── run ───────────────────────────

const run = async () => {
	const { pool, encoded } = await connectPool();

	try {
		console.log(`Database: connected${encoded ? " (password @ percent-encoded as %40)" : ""}`);

		const [tradeResult, donorResult, designationResult, workplaceResult] = await Promise.all([
			pool.query<{ id: string; code: string; name_en: string | null; name_bn: string | null; trade_name: string | null }>(
				"select id, code, name_en, name_bn, trade_name from academy.trades order by code",
			),
			pool.query<{ id: string; name: string }>("select id, name from academy.donors order by name"),
			pool.query<{ id: string; trade_id: string; name: string }>(
				"select id, trade_id, name from jobs.designations order by name",
			),
			pool.query<{ id: string; name: string; address: string | null }>(
				"select id, name, address from jobs.workplaces order by name",
			),
		]);

		const trades: Trade[] = tradeResult.rows.map((row) => ({
			id: row.id,
			code: row.code,
			nameEn: row.name_en ?? "",
			nameBn: row.name_bn ?? "",
			tradeName: row.trade_name ?? "",
		}));
		const donors: Donor[] = donorResult.rows;
		const designations: Designation[] = designationResult.rows.map((row) => ({
			id: row.id,
			tradeId: row.trade_id,
			name: row.name,
		}));
		const workplaces: Workplace[] = workplaceResult.rows.map((row) => ({
			id: row.id,
			name: row.name,
			address: row.address ?? "",
		}));

		const tradeByCode = new Map(trades.map((t) => [t.code, t]));
		const tradeByTradeName = new Map(trades.map((t) => [norm(t.tradeName), t]));
		const tradeByNameEn = new Map(trades.map((t) => [norm(t.nameEn), t]));
		const tradeByNameBn = new Map(trades.map((t) => [norm(t.nameBn), t]));
		const donorByName = new Map(donors.map((d) => [norm(d.name), d]));
		const designationByKey = new Map(designations.map((d) => [`${d.tradeId}|${norm(d.name)}`, d]));
		const workplaceByName = new Map<string, Workplace>();
		for (const workplace of workplaces) {
			const key = norm(workplace.name);
			if (key && !workplaceByName.has(key)) workplaceByName.set(key, workplace);
		}

		// ── resolvers ──

		const resolveTrade = (legacy: unknown): Trade | null => {
			const key = norm(legacy);
			if (!key) return null;
			const exact = tradeByTradeName.get(key) ?? tradeByNameEn.get(key) ?? tradeByNameBn.get(key);
			if (exact) return exact;
			const aliasCode = TRADE_ALIAS[key];
			if (aliasCode) {
				const aliased = tradeByCode.get(aliasCode);
				if (aliased) return aliased;
			}
			const partial = trades.filter((trade) =>
				[norm(trade.tradeName), norm(trade.nameEn), norm(trade.nameBn)].some(
					(candidate) => candidate.length > 0 && (candidate.includes(key) || key.includes(candidate)),
				),
			);
			return partial.length === 1 ? partial[0] : null;
		};

		const resolveDonor = (legacy: unknown): Donor | null => {
			const key = norm(legacy);
			if (!key) return null;
			return donorByName.get(key) ?? null;
		};

		const resolveDesignation = (legacy: unknown, tradeId: string | null): Designation | null => {
			const key = norm(legacy);
			if (!key || !tradeId) return null;
			const target = DESIGNATION_ALIAS[key] ?? key;
			return designationByKey.get(`${tradeId}|${target}`) ?? null;
		};

		const resolveWorkplace = (legacy: unknown): Workplace | null => {
			const key = norm(legacy);
			if (!key) return null;
			const exact = workplaceByName.get(key);
			if (exact) return exact;
			const coreKey = core(key);
			if (!coreKey) return null;
			const partial = workplaces.filter((workplace) => core(workplace.name) === coreKey);
			return partial.length === 1 ? partial[0] : null;
		};

		// ── enrich ──

		const source = await readFile(JSON_PATH, "utf8");
		const rows = JSON.parse(source) as LegacyJobHolder[];
		if (!Array.isArray(rows)) throw new Error(`${JSON_PATH} is not a JSON array`);

		const enriched: EnrichedJobHolder[] = rows.map((row) => {
			const legacyTrade = row.trade ?? null;
			const legacyDonor = row.donor ?? row.donner ?? null;
			const legacyDesignation = row.designation ?? null;
			const legacyWorkplace = row.workplace ?? null;
			const legacyAddress = row.address ?? null;

			const trade = resolveTrade(legacyTrade);
			const donor = resolveDonor(legacyDonor);
			const designation = resolveDesignation(legacyDesignation, trade?.id ?? null);
			const workplace = resolveWorkplace(legacyWorkplace);

			const ids = [trade?.id ?? null, donor?.id ?? null, designation?.id ?? null, workplace?.id ?? null];
			const matched = ids.filter((id) => id !== null).length;

			return {
				id: clean(row.id) ?? uuidv7(),
				_id: row._id ?? "",
				name: row.name ?? "",
				gender: row.gender ?? null,
				photo_url: row.photo_url ?? row.photo_URL ?? null,
				salary: row.salary ?? null,
				trade_id: trade?.id ?? null,
				trade: trade ? trade.nameEn : legacyTrade,
				donor_id: donor?.id ?? null,
				donor: donor ? donor.name : clean(legacyDonor),
				designation_id: designation?.id ?? null,
				designation: designation ? designation.name : legacyDesignation,
				workplace_id: workplace?.id ?? null,
				workplace: workplace ? workplace.name : legacyWorkplace,
				address: workplace ? workplace.address : legacyAddress,
				created_at: row.created_at ?? null,
				updated_at: row.updated_at ?? null,
				added_by: row.added_by ?? null,
				mapping_status: matched === 4 ? "MAPPED" : matched === 0 ? "UNMAPPED" : "PARTIAL",
			};
		});

		const payload = `${JSON.stringify(enriched, null, 2)}\n`;
		await writeFile(JSON_PATH, payload, "utf8");

		// ── report ──

		const count = (predicate: (row: EnrichedJobHolder) => boolean) => enriched.filter(predicate).length;
		const status = {
			MAPPED: count((row) => row.mapping_status === "MAPPED"),
			PARTIAL: count((row) => row.mapping_status === "PARTIAL"),
			UNMAPPED: count((row) => row.mapping_status === "UNMAPPED"),
		};

		console.log(`\nFile: ${JSON_PATH}`);
		console.log(`Records: ${enriched.length}`);
		console.log(
			`Non-null ids → trade: ${count((row) => row.trade_id !== null)} | donor: ${count((row) => row.donor_id !== null)} | designation: ${count((row) => row.designation_id !== null)} | workplace: ${count((row) => row.workplace_id !== null)}`,
		);
		console.log(`Mapping status → MAPPED: ${status.MAPPED} | PARTIAL: ${status.PARTIAL} | UNMAPPED: ${status.UNMAPPED}`);
		console.log(`photo_url present: ${count((row) => Boolean(row.photo_url))} | bytes written: ${Buffer.byteLength(payload, "utf8")}`);

		const incomplete = enriched.filter((row) => row.mapping_status !== "MAPPED").slice(0, 10);
		if (incomplete.length > 0) {
			console.log("\nIncomplete records (first 10):");
			for (const row of incomplete) {
				const missing = [
					row.trade_id === null ? "trade_id" : null,
					row.donor_id === null ? "donor_id" : null,
					row.designation_id === null ? "designation_id" : null,
					row.workplace_id === null ? "workplace_id" : null,
				].filter(Boolean);
				console.log(
					`  ${row.mapping_status} ${row.name} — missing ${missing.join(", ")} (trade "${row.trade ?? ""}", designation "${row.designation ?? ""}", workplace "${row.workplace ?? ""}")`,
				);
			}
		}
		console.log("");
	} finally {
		await pool.end();
	}
};

await run();
