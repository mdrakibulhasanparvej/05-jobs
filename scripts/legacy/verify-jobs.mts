/**
 * Read-only verification of the legacy jobs migration:
 * designations, workplaces and the job holders that could be linked to a student.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { MongoClient } from "mongodb";
import { Pool } from "pg";
import { PrismaClient } from "../../src/generated/client.ts";

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/amarShikkha";
const CATEGORY_TRADE: Record<string, string | null> = {
	"electrical house wiring": "01",
	"industrial electrical wiring": "02",
	"industrial sewing": "03",
	"dressmaking & tailoring": "04",
	"garments machine mechanics": "05",
	computer: "06",
	"com. freelancing & sopken eng.": "09",
	"motorbike mechanics": "08",
	"spoken english": "09",
	"digital marketing (facebook marketing with ai)": null,
	"ai prompt engineer": null,
};
const norm = (v: unknown) => (v ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ");

const mongo = new MongoClient(MONGO_URI);
await mongo.connect();
const db = mongo.db();
const [categories, designations, workplaces, jobholders] = await Promise.all([
	db.collection("categories").find({}).toArray(),
	db.collection("designations").find({}).toArray(),
	db.collection("workplaces").find({}).toArray(),
	db.collection("jobholders").find({}).toArray(),
]);
await mongo.close();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const [trades, pgDesignations, pgWorkplaces, pgJobHolders] = await Promise.all([
	prisma.trade.findMany({ select: { id: true, code: true } }),
	prisma.designation.findMany({ select: { id: true, tradeId: true, name: true } }),
	prisma.workplace.findMany({ select: { id: true, name: true, address: true, contact: true } }),
	prisma.jobHolder.findMany({
		include: { student: { select: { name: true, formNo: true } }, designation: true, workplace: true },
	}),
]);

const tradeIdByCode = new Map(trades.map((t) => [t.code, t.id]));
const tradeCodeById = new Map(trades.map((t) => [t.id, t.code]));
const catName = new Map(categories.map((c) => [String(c._id), c.name ?? ""]));

const problems: string[] = [];
const known: string[] = [];

// designations
let mapped = 0;
let skippedByCategory = 0;
for (const d of designations) {
	const code = CATEGORY_TRADE[norm(catName.get(String(d.categoryId)))];
	if (!code) {
		skippedByCategory += 1;
		continue;
	}
	mapped += 1;
	const tradeId = tradeIdByCode.get(code) as string;
	const found = pgDesignations.some((p) => p.tradeId === tradeId && norm(p.name) === norm(d.name));
	if (!found) problems.push(`designation "${d.name}" [trade ${code}] missing`);
}
console.log(`Designations: legacy ${designations.length} | mapped ${mapped} | skipped (no trade) ${skippedByCategory} | postgres ${pgDesignations.length}`);

// workplaces
const names = new Set(pgWorkplaces.map((w) => norm(w.name)));
let workplaceMissing = 0;
for (const w of workplaces) {
	if (!names.has(norm(w.name))) {
		problems.push(`workplace "${w.name}" missing`);
		workplaceMissing += 1;
	}
}
const dupNames = workplaces.length - new Set(workplaces.map((w) => norm(w.name))).size;
console.log(`Workplaces: legacy ${workplaces.length} (${dupNames} duplicate name) | postgres ${pgWorkplaces.length}`);

// job holders
console.log(`Job holders: legacy ${jobholders.length} | postgres ${pgJobHolders.length}`);
for (const holder of pgJobHolders) {
	if (!holder.designation) known.push(`${holder.student.name}: job holder without designation`);
	if (!holder.workplace) known.push(`${holder.student.name}: job holder without workplace`);
}
console.log(
	pgJobHolders.map((h) => ({
		student: `${h.student.formNo} ${h.student.name}`,
		designation: h.designation?.name ?? null,
		workplace: h.workplace?.name ?? null,
		salary: h.salary?.toString() ?? null,
	})),
);

console.log(`\nProblems: ${problems.length}`);
for (const p of problems) console.log(`  ✗ ${p}`);
console.log(`Known: ${known.length}`);
for (const k of known) console.log(`  · ${k}`);

await prisma.$disconnect();
await pool.end();
