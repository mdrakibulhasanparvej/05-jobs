/**
 * Legacy MongoDB → PostgreSQL jobs migration (phase 3: designations, workplaces,
 * job holders).
 *
 * Source: mongodb://127.0.0.1:27017/amarShikkha
 *   → collections `designations` (80), `workplaces` (154), `jobholders` (240)
 * Target: jobs.designations, jobs.workplaces, jobs.job_holders (+ academy.trades,
 *         identity.users for created_by)
 *
 * Safety rules (see ./README.md):
 *   • dry-run by default — nothing is written unless --apply is passed
 *   • idempotent — matches existing rows case-insensitively, never duplicates
 *   • no schema changes, no migrations, no deletes
 *   • job holders can only be inserted when their student record exists
 *     (job_holders.student_id is NOT NULL UNIQUE); unmatched rows are exported
 *     to the report instead of being guessed at
 *
 * Usage:
 *   npx tsx scripts/legacy/migrate-jobs.mts                 # dry run + report
 *   npx tsx scripts/legacy/migrate-jobs.mts --apply
 *   npx tsx scripts/legacy/migrate-jobs.mts --phase designations
 */

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { MongoClient, ObjectId } from "mongodb";
import { Pool } from "pg";
import { PrismaClient } from "../../src/generated/client.ts";

// ─────────────────────────── configuration ───────────────────────────

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/amarShikkha";
const DATABASE_URL = process.env.DATABASE_URL;
const APPLY = process.argv.includes("--apply");
const phaseArg = process.argv.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "all";
const PHASES = new Set(phaseArg.split(","));
const RUN = (phase: string) => PHASES.has("all") || PHASES.has(phase);
const REPORT_DIR = path.join(import.meta.dirname, "reports");

if (!DATABASE_URL) throw new Error("DATABASE_URL is missing (expected in 05-jobs/.env)");

// legacy designation category → academy trade code (null = no matching trade)
const CATEGORY_TRADE: Record<string, string | null> = {
	"electrical house wiring": "01",
	"industrial electrical wiring": "02", // Industrial Electrician
	"industrial sewing": "03", // Garments Machine Operator
	"dressmaking & tailoring": "04",
	"garments machine mechanics": "05",
	computer: "06",
	"com. freelancing & sopken eng.": "09", // communication / freelancing roles
	"motorbike mechanics": "08",
	"spoken english": "09",
	"digital marketing (facebook marketing with ai)": null,
	"ai prompt engineer": null,
};

// legacy jobholder trade label → academy trade code
const JOB_TRADE: Record<string, string> = {
	"dressmaking & tailoring": "04",
	"industrial sewing": "03",
	"com. freelancing & sopken eng.": "09",
	"electrical house wiring": "01",
	"motorbike mechanics": "08",
	"garments machine mechanics": "05",
	computer: "06",
	"industrial electrical wiring": "02",
	"spoken english": "09",
};

// ─────────────────────────── helpers ───────────────────────────

const clean = (value: unknown): string | null => {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

const norm = (value: unknown) => (value ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ");

/** "Mst Roksana Akter" → "roksana akter": used only for a second, unique-match pass. */
const stripHonorific = (value: string) =>
	norm(value)
		.replace(/[.,]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^(mst|md|mrs|ms|mohammad|muhammad|sk|sheikh)\b\.?\s*/g, "")
		.replace(/\s+begum$/, "")
		.trim();

const parseDate = (value: unknown): Date | null => {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00.000Z` : trimmed);
	return Number.isNaN(date.getTime()) ? null : date;
};

const toMoney = (value: unknown): string | null => {
	if (typeof value === "number") return value > 0 ? value.toFixed(2) : null;
	const text = clean(value);
	if (!text) return null;
	const numeric = Number(text.replace(/[^\d.]/g, ""));
	return Number.isFinite(numeric) && numeric > 0 ? numeric.toFixed(2) : null;
};

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

const fileStamp = () => new Date().toISOString().replace(/[:.]/g, "-");

// ─────────────────────────── legacy shapes ───────────────────────────

type LegacyCategory = { _id: ObjectId | string; name?: string };
type LegacyDesignation = {
	_id: ObjectId | string;
	categoryId?: ObjectId | string;
	name?: string;
	isActive?: boolean;
	addedBy?: string;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};
type LegacyWorkplace = {
	_id: ObjectId | string;
	name?: string;
	address?: string;
	contact?: string;
	phone?: string;
	created_at?: string | Date;
	createdAt?: string | Date;
	created_by?: string;
	updated?: string | Date;
};
type LegacyJobHolder = {
	_id: ObjectId | string;
	name?: string;
	gender?: string;
	photo_URL?: string;
	trade?: string;
	designation?: string;
	workplace?: string;
	address?: string;
	salary?: string | number;
	donner?: string;
	created_at?: string | Date;
	createdAt?: string | Date;
	updated_at?: string | Date;
	added_by?: string;
};

// ─────────────────────────── run ───────────────────────────

const run = async () => {
	const mongo = new MongoClient(MONGO_URI);
	await mongo.connect();
	const db = mongo.db();
	let categories: LegacyCategory[], designations: LegacyDesignation[], workplaces: LegacyWorkplace[], jobholders: LegacyJobHolder[];
	try {
		[categories, designations, workplaces, jobholders] = await Promise.all([
			db.collection("categories").find({}).toArray() as Promise<LegacyCategory[]>,
			db.collection("designations").find({}).toArray() as Promise<LegacyDesignation[]>,
			db.collection("workplaces").find({}).toArray() as Promise<LegacyWorkplace[]>,
			db.collection("jobholders").find({}).toArray() as Promise<LegacyJobHolder[]>,
		]);
	} finally {
		await mongo.close();
	}

	const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });
	const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

	try {
		await mkdir(REPORT_DIR, { recursive: true });

		const [trades, users, existingDesignations, existingWorkplaces, existingJobHolders, students] = await Promise.all([
			prisma.trade.findMany({ select: { id: true, code: true } }),
			prisma.user.findMany({ select: { id: true, email: true } }),
			prisma.designation.findMany({ select: { id: true, tradeId: true, name: true } }),
			prisma.workplace.findMany({ select: { id: true, name: true } }),
			prisma.jobHolder.findMany({ select: { studentId: true } }),
			prisma.studentInformation.findMany({
				select: {
					id: true,
					name: true,
					gender: true,
					trades: { select: { trade: { select: { code: true } } } },
				},
			}),
		]);

		const tradeByCode = new Map(trades.map((t) => [t.code, t]));
		const tradeIdByCode = new Map(trades.map((t) => [t.code, t.id]));


		const userIdByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
		const designationByKey = new Map(existingDesignations.map((d) => [`${d.tradeId}|${norm(d.name)}`, d]));
		const workplaceByKey = new Map(existingWorkplaces.map((w) => [norm(w.name), w]));
		const jobHolderStudents = new Set(existingJobHolders.map((j) => j.studentId));

		// ── plan designations ──
		const categoryNameById = new Map(categories.map((c) => [String(c._id), c.name ?? ""]));
		const designationPlans: Array<{
			legacyId: string;
			name: string;
			tradeId: string;
			tradeCode: string;
			category: string;
			isActive: boolean;
			createdById: string | null;
			createdAt: Date;
			updatedAt: Date;
		}> = [];
		const designationSkipped: Array<{ legacyId: string; name: string; reason: string }> = [];
		const seenDesignationKeys = new Set<string>();

		if (RUN("designations")) {
			for (const doc of designations) {
				const legacyId = String(doc._id);
				const name = clean(doc.name);
				const category = categoryNameById.get(String(doc.categoryId)) ?? "";
				const code = CATEGORY_TRADE[norm(category)];
				if (!name) {
					designationSkipped.push({ legacyId, name: "(empty)", reason: "missing name" });
					continue;
				}
				if (!code) {
					designationSkipped.push({ legacyId, name, reason: `category "${category}" has no matching trade` });
					continue;
				}
				const key = `${tradeIdByCode.get(code)}|${norm(name)}`;
				if (seenDesignationKeys.has(key)) {
					designationSkipped.push({ legacyId, name, reason: `duplicate designation in trade ${code}` });
					continue;
				}
				seenDesignationKeys.add(key);
				const createdAt = parseDate(doc.createdAt) ?? new Date();
				designationPlans.push({
					legacyId,
					name,
					tradeId: tradeIdByCode.get(code) as string,
					tradeCode: code,
					category,
					isActive: doc.isActive !== false,
					createdById: doc.addedBy ? (userIdByEmail.get(doc.addedBy.toLowerCase()) ?? null) : null,
					createdAt,
					updatedAt: parseDate(doc.updatedAt) ?? createdAt,
				});
			}
		}

		// ── plan workplaces (case-insensitive unique names) ──
		const workplacePlans: Array<{
			legacyIds: string[];
			name: string;
			address: string;
			contact: string | null;
			createdById: string | null;
			createdAt: Date;
			updatedAt: Date;
		}> = [];
		const workplaceSkipped: Array<{ legacyId: string; name: string; reason: string }> = [];
		const workplaceGroups = new Map<string, LegacyWorkplace[]>();

		if (RUN("workplaces")) {
			for (const doc of workplaces) {
				const name = clean(doc.name);
				if (!name) {
					workplaceSkipped.push({ legacyId: String(doc._id), name: "(empty)", reason: "missing name" });
					continue;
				}
				const key = norm(name);
				workplaceGroups.set(key, [...(workplaceGroups.get(key) ?? []), doc]);
			}
			for (const [, docs] of workplaceGroups) {
				const canonical = [...docs].sort((a, b) => {
					const aClean = (a.name ?? "") === (a.name ?? "").trim() ? 0 : 1;
					const bClean = (b.name ?? "") === (b.name ?? "").trim() ? 0 : 1;
					if (aClean !== bClean) return aClean - bClean;
					return (parseDate(a.created_at ?? a.createdAt)?.getTime() ?? 0) - (parseDate(b.created_at ?? b.createdAt)?.getTime() ?? 0);
				})[0];
				const name = clean(canonical.name) as string;
				const address = clean(canonical.address);
				if (!address) {
					workplaceSkipped.push({ legacyId: String(canonical._id), name, reason: "missing address" });
					continue;
				}
				const createdAt = parseDate(canonical.created_at ?? canonical.createdAt) ?? new Date();
				workplacePlans.push({
					legacyIds: docs.map((d) => String(d._id)),
					name,
					address,
					contact: clean(canonical.contact) ?? clean(canonical.phone),
					createdById: canonical.created_by
						? (userIdByEmail.get(canonical.created_by.toLowerCase()) ?? null)
						: null,
					createdAt,
					updatedAt: parseDate(canonical.updated) ?? createdAt,
				});
				if (docs.length > 1) {
					workplaceSkipped.push({
						legacyId: String(canonical._id),
						name,
						reason: `merged ${docs.length - 1} duplicate workplace name(s)`,
					});
				}
			}
		}

		// ── report ──
		console.log(`\nDesignations read: ${designations.length} → planned ${designationPlans.length}, skipped ${designationSkipped.length}`);
		for (const s of designationSkipped) console.log(`  ✗ ${s.name} — ${s.reason}`);
		console.log(`Workplaces read: ${workplaces.length} → unique ${workplacePlans.length}, skipped ${workplaceSkipped.length}`);
		for (const s of workplaceSkipped) console.log(`  ✗ ${s.name} — ${s.reason}`);

		const report = {
			generatedAt: new Date().toISOString(),
			mode: APPLY ? "apply" : "dry-run",
			source: {
				uri: MONGO_URI,
				designations: designations.length,
				workplaces: workplaces.length,
				jobholders: jobholders.length,
			},
			designations: { planned: designationPlans, skipped: designationSkipped },
			workplaces: { planned: workplacePlans, skipped: workplaceSkipped },
			jobholders: null as unknown,
		};

		if (!RUN("jobholders")) {
			const reportPath = path.join(REPORT_DIR, `jobs-${report.mode}-${fileStamp()}.json`);
			await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
			console.log(`\nReport written: ${path.relative(process.cwd(), reportPath)}`);
			if (!APPLY) {
				console.log("\nDRY RUN — nothing written. Re-run with --apply to migrate.\n");
				return;
			}
			const created = await prisma.$transaction(
				async (tx) => {
					let designationsCreated = 0;
					let workplacesCreated = 0;
					for (const plan of designationPlans) {
						if (designationByKey.has(`${plan.tradeId}|${norm(plan.name)}`)) continue;
						await tx.designation.create({
							data: {
								id: uuidv7(),
								tradeId: plan.tradeId,
								name: plan.name,
								isActive: plan.isActive,
								createdById: plan.createdById,
								createdAt: plan.createdAt,
								updatedAt: plan.updatedAt,
							},
						});
						designationsCreated += 1;
					}
					for (const plan of workplacePlans) {
						if (workplaceByKey.has(norm(plan.name))) continue;
						await tx.workplace.create({
							data: {
								id: uuidv7(),
								name: plan.name,
								address: plan.address,
								contact: plan.contact,
								createdById: plan.createdById,
								createdAt: plan.createdAt,
								updatedAt: plan.updatedAt,
							},
						});
						workplacesCreated += 1;
					}
					return { designationsCreated, workplacesCreated };
				},
				{ timeout: 120_000 },
			);
			console.log("\nAPPLIED:", created);
			console.log(
				"Totals → designations:",
				await prisma.designation.count(),
				"| workplaces:",
				await prisma.workplace.count(),
				"\n",
			);
			return;
		}

		// ── job holders ──
		const studentByName = new Map<string, typeof students>();
		const studentByNameStripped = new Map<string, typeof students>();
		for (const student of students) {
			studentByName.set(norm(student.name), [...(studentByName.get(norm(student.name)) ?? []), student]);
			const stripped = stripHonorific(student.name);
			studentByNameStripped.set(stripped, [
				...(studentByNameStripped.get(stripped) ?? []),
				student,
			]);
		}

		type JobPlan = {
			legacyId: string;
			studentId: string;
			studentName: string;
			photoUrl: string | null;
			salary: string | null;
			tradeCode: string;
			designationName: string;
			designationId: string | null;
			designationAction: "existing" | "create" | "none";
			workplaceName: string | null;
			workplaceId: string | null;
			workplaceAction: "existing" | "create" | "none";
			workplaceAddress: string | null;
			createdById: string | null;
			createdAt: Date;
			updatedAt: Date;
			match: "exact" | "stripped";
		};
		const jobPlans: JobPlan[] = [];
		const jobSkipped: Array<{ legacyId: string; name: string; reason: string; document: LegacyJobHolder }> = [];
		const plannedStudentIds = new Set<string>();

		for (const doc of jobholders) {
			const legacyId = String(doc._id);
			const name = clean(doc.name);
			const tradeCode = JOB_TRADE[norm(doc.trade)];
			if (!name) {
				jobSkipped.push({ legacyId, name: "(empty)", reason: "missing name", document: doc });
				continue;
			}
			if (!tradeCode) {
				jobSkipped.push({ legacyId, name, reason: `trade "${doc.trade ?? ""}" has no matching academy trade`, document: doc });
				continue;
			}

			const exact = studentByName.get(norm(name)) ?? [];
			const stripped = exact.length === 0 ? (studentByNameStripped.get(stripHonorific(name)) ?? []) : [];
			const candidates = exact.length > 0 ? exact : stripped;
			const compatible = candidates.filter((s) => s.trades.some((t) => t.trade.code === tradeCode));
			if (compatible.length === 0) {
				jobSkipped.push({
					legacyId,
					name,
					reason:
						candidates.length === 0
							? "no student record with this name (legacy alumni are not in the students collection)"
							: `name matches a student but not in trade ${tradeCode}`,
					document: doc,
				});
				continue;
			}
			if (compatible.length > 1) {
				jobSkipped.push({ legacyId, name, reason: `ambiguous — ${compatible.length} students match`, document: doc });
				continue;
			}
			const student = compatible[0];
			if (jobHolderStudents.has(student.id) || plannedStudentIds.has(student.id)) {
				jobSkipped.push({ legacyId, name, reason: "student already has a job holder record", document: doc });
				continue;
			}
			plannedStudentIds.add(student.id);

			const designationName = clean(doc.designation);
			const designationKey = designationName ? `${tradeIdByCode.get(tradeCode)}|${norm(designationName)}` : null;
			const existingDesignation = designationKey ? designationByKey.get(designationKey) : undefined;

			const workplaceName = clean(doc.workplace);
			const existingWorkplace = workplaceName ? workplaceByKey.get(norm(workplaceName)) : undefined;
			const address = clean(doc.address);
			const createdAt = parseDate(doc.created_at ?? doc.createdAt) ?? new Date();

			jobPlans.push({
				legacyId,
				studentId: student.id,
				studentName: student.name,
				photoUrl: clean(doc.photo_URL),
				salary: toMoney(doc.salary),
				tradeCode,
				designationName: designationName ?? "",
				designationId: existingDesignation?.id ?? null,
				designationAction: existingDesignation ? "existing" : designationName ? "create" : "none",
				workplaceName,
				workplaceId: existingWorkplace?.id ?? null,
				workplaceAction: existingWorkplace ? "existing" : workplaceName && address ? "create" : "none",
				workplaceAddress: address,
				createdById: doc.added_by ? (userIdByEmail.get(doc.added_by.toLowerCase()) ?? null) : null,
				createdAt,
				updatedAt: parseDate(doc.updated_at) ?? createdAt,
				match: exact.length > 0 ? "exact" : "stripped",
			});
		}

		console.log(`\nJob holders read: ${jobholders.length} → linkable ${jobPlans.length}, skipped ${jobSkipped.length}`);
		for (const plan of jobPlans) {
			console.log(
				`  ✓ ${plan.studentName} ← ${plan.workplaceName ?? "(no workplace)"} / ${plan.designationName || "(no designation)"} (${plan.match} match)`,
			);
		}

		const reportPath = path.join(REPORT_DIR, `jobs-${report.mode}-${fileStamp()}.json`);
		report.jobholders = {
			planned: jobPlans,
			skippedCount: jobSkipped.length,
			skipped: jobSkipped.map((s) => ({
				legacyId: s.legacyId,
				name: s.name,
				reason: s.reason,
				document: s.document,
			})),
		};
		await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
		console.log(`\nReport written: ${path.relative(process.cwd(), reportPath)}`);

		if (!APPLY) {
			console.log("\nDRY RUN — nothing written. Re-run with --apply to migrate.\n");
			return;
		}

		const created = await prisma.$transaction(
			async (tx) => {
				let designationsCreated = 0;
				let workplacesCreated = 0;
				let jobHoldersCreated = 0;

				for (const plan of designationPlans) {
					if (designationByKey.has(`${plan.tradeId}|${norm(plan.name)}`)) continue;
					const created = await tx.designation.create({
						data: {
							id: uuidv7(),
							tradeId: plan.tradeId,
							name: plan.name,
							isActive: plan.isActive,
							createdById: plan.createdById,
							createdAt: plan.createdAt,
							updatedAt: plan.updatedAt,
						},
						select: { id: true },
					});
					designationByKey.set(`${plan.tradeId}|${norm(plan.name)}`, {
						id: created.id,
						tradeId: plan.tradeId,
						name: plan.name,
					});
					designationsCreated += 1;
				}

				for (const plan of workplacePlans) {
					if (workplaceByKey.has(norm(plan.name))) continue;
					const created = await tx.workplace.create({
						data: {
							id: uuidv7(),
							name: plan.name,
							address: plan.address,
							contact: plan.contact,
							createdById: plan.createdById,
							createdAt: plan.createdAt,
							updatedAt: plan.updatedAt,
						},
						select: { id: true },
					});
					workplaceByKey.set(norm(plan.name), { id: created.id, name: plan.name });
					workplacesCreated += 1;
				}

				// job holders may need workplaces/designations created from their own data
				for (const plan of jobPlans) {
					if (plan.workplaceAction === "create" && plan.workplaceName && plan.workplaceAddress) {
						const key = norm(plan.workplaceName);
						const existing = workplaceByKey.get(key);
						if (existing) {
							plan.workplaceId = existing.id;
						} else {
							const createdWorkplace = await tx.workplace.create({
								data: {
									id: uuidv7(),
									name: plan.workplaceName,
									address: plan.workplaceAddress,
									createdById: plan.createdById,
									createdAt: plan.createdAt,
									updatedAt: plan.updatedAt,
								},
								select: { id: true },
							});
							workplaceByKey.set(key, { id: createdWorkplace.id, name: plan.workplaceName });
							plan.workplaceId = createdWorkplace.id;
							workplacesCreated += 1;
						}
					}

					if (plan.designationAction === "create" && plan.designationName) {
						const tradeId = tradeIdByCode.get(plan.tradeCode) as string;
						const key = `${tradeId}|${norm(plan.designationName)}`;
						const existing = designationByKey.get(key);
						if (existing) {
							plan.designationId = existing.id;
						} else {
							const createdDesignation = await tx.designation.create({
								data: {
									id: uuidv7(),
									tradeId,
									name: plan.designationName,
									createdById: plan.createdById,
									createdAt: plan.createdAt,
									updatedAt: plan.updatedAt,
								},
								select: { id: true },
							});
							designationByKey.set(key, {
								id: createdDesignation.id,
								tradeId,
								name: plan.designationName,
							});
							plan.designationId = createdDesignation.id;
							designationsCreated += 1;
						}
					}

					if (!plan.designationId || !plan.workplaceId) {
						// optional links — still migrate the employment record
					}

					await tx.jobHolder.create({
						data: {
							id: uuidv7(),
							studentId: plan.studentId,
							photoUrl: plan.photoUrl,
							designationId: plan.designationId,
							workplaceId: plan.workplaceId,
							salary: plan.salary,
							createdById: plan.createdById,
							createdAt: plan.createdAt,
							updatedAt: plan.updatedAt,
						},
					});
					jobHoldersCreated += 1;
				}

				return { designationsCreated, workplacesCreated, jobHoldersCreated };
			},
			{ timeout: 300_000 },
		);

		console.log("\nAPPLIED:", created);
		const [totalDesignations, totalWorkplaces, totalJobHolders] = await Promise.all([
			prisma.designation.count(),
			prisma.workplace.count(),
			prisma.jobHolder.count(),
		]);
		console.log(
			`Post-migration totals → designations: ${totalDesignations} | workplaces: ${totalWorkplaces} | job holders: ${totalJobHolders}\n`,
		);
	} finally {
		await prisma.$disconnect();
		await pool.end();
	}
};

await run();
