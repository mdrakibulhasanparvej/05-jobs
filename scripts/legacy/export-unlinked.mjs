/**
 * Exports the unlinked legacy job holders (alumni) from the latest apply report
 * to a CSV, ready for a future alumni-import workflow.
 *
 * Usage: node scripts/legacy/export-unlinked.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "reports");
const file = readdirSync(dir)
	.filter((f) => f.startsWith("jobs-apply-"))
	.sort()
	.at(-1);

if (!file) {
	console.error("No jobs-apply-*.json report found. Run the migration with --apply first.");
	process.exit(1);
}

const report = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
const rows = report.jobholders?.skipped ?? [];

const escape = (value) => {
	const text = value === undefined || value === null ? "" : String(value);
	return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const header = [
	"legacy_id",
	"name",
	"gender",
	"trade",
	"designation",
	"workplace",
	"address",
	"salary",
	"donor",
	"photo_url",
	"created_at",
	"added_by",
	"skip_reason",
];
const lines = [header.join(",")];
for (const row of rows) {
	const d = row.document ?? {};
	lines.push(
		[
			row.legacyId,
			d.name,
			d.gender,
			d.trade,
			d.designation,
			d.workplace,
			d.address,
			d.salary,
			d.donner,
			d.photo_URL,
			d.created_at,
			d.added_by,
			row.reason,
		]
			.map(escape)
			.join(","),
	);
}

const out = path.join(dir, file.replace(/\.json$/, "-unlinked-jobholders.csv"));
writeFileSync(out, `${lines.join("\n")}\n`, "utf8");
console.log(`Exported ${rows.length} unlinked job holders → ${path.relative(process.cwd(), out)}`);
