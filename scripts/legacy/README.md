# Legacy MongoDB → PostgreSQL jobs migration (phase 3)

Migrates the job-placement data from MongoDB `amarShikkha` into the `jobs`
schema (owned by `05-jobs`):

| MongoDB | Rows | PostgreSQL | Result |
| --- | --- | --- | --- |
| `designations` (+ `categories`) | 80 | `jobs.designations` | **61 new** (+1 pre-existing), 18 skipped |
| `workplaces` | 154 | `jobs.workplaces` | **152 new** (+1 pre-existing), 1 duplicate merged |
| `jobholders` | 240 | `jobs.job_holders` | **3 new** (+1 pre-existing), 237 unlinked → exported |

No schema change, migration or delete is performed. Existing catalogue rows are
reused (case-insensitive match), so the script can be re-run safely.

| File | Purpose |
| --- | --- |
| `migrate-jobs.mts` | Dry-run planner + `--apply` executor for the three phases. |
| `verify-jobs.mts` | Read-only comparison of designations / workplaces / job holders. |
| `export-unlinked.mjs` | Writes the 237 unlinked alumni job holders to a CSV from the last apply report. |
| `reports/` | JSON reports incl. every unmatched job-holder document (git-ignored, PII). |

## Commands

```bash
# from gs-servers/05-jobs
npm run legacy:migrate:jobs                              # dry run, all phases
npm run legacy:migrate:jobs -- --phase=designations      # one phase
npm run legacy:migrate:jobs -- --phase=workplaces --apply
npm run legacy:migrate:jobs -- --phase=jobholders --apply
npx tsx scripts/legacy/verify-jobs.mts
```

(Use one phase per flag — PowerShell splits `a,b` into separate arguments.)

## Designations

Designation is trade-wise in the new schema (no category layer). Legacy
`categories` are mapped to `academy.trades`:

| Legacy category | Trade |
| --- | --- |
| Electrical House Wiring | 01 |
| Industrial Electrical Wiring | 02 Industrial Electrician |
| Industrial Sewing | 03 Garments Machine Operator |
| Dressmaking & Tailoring | 04 |
| Garments Machine Mechanics | 05 |
| Computer | 06 Computer Office Application |
| Com. Freelancing & Sopken Eng. | 09 Spoken English |
| Motorbike Mechanics | 08 |
| Spoken English | 09 |
| Digital Marketing (Facebook Marketing with AI) | — **skipped** (10) |
| AI Prompt Engineer | — **skipped** (8) |

* `isActive` kept; `addedBy: "seed"` → `created_by_id = null`;
  `createdAt`/`updatedAt` preserved.
* Unique `(trade_id, name)` + `(trade_id, lower(name))`: duplicates are skipped,
  and `Computer Operator` (trade 06) already existed in the new system, so it was
  linked instead of duplicated.

## Workplaces

* 154 documents → **153 unique names** (case-insensitive). The two
  `Pratik Apparels Ltd` / `" Pratik Apparels Ltd"` records were merged (trimmed
  name, earliest `created_at`).
* `name`, `address` required — all present; `contact` was never filled in the
  legacy data → null.
* `created_by` email → `identity.users.id` (null for the 68 blank values).
* The pre-existing `Pratik Apparels Ltd` row was reused.

## Job holders

`jobs.job_holders.student_id` is **NOT NULL UNIQUE** and the new model keeps
person data only on the student. Legacy job holders are **alumni from Dec 2025**,
while the `students` collection starts in Jan 2026, so only 11 share a name with
a student and only **3 of those are in the same trade**:

```
Md. Hanif Mia        → 00013-4  RFL Group                / Computer Operator / 12,000
Antor Sarkar         → 00007-4  ACI Com                  / Computer Operator / 15,000
Md. Ekramuzzaman     → 00011    Lao he Mahfuz Madrasa    / Computer Operator / 10,000
```

Those 3 are migrated (exact or `Mst/Md`-stripped name + matching trade). The
other **237** are listed with their full source document under
`reports/jobs-apply-*.json → jobholders.skipped`:

* 226 have no student record with that name at all (legacy alumni);
* 8 share a name with a student from a different trade (likely different people);
* 3 are duplicates of an existing/planned job holder.

`salary` `"0"`/`"00"` → null, otherwise parsed as `numeric(12,2)`;
`photo_URL` → `photo_url`; `added_by` → `created_by_id`; `created_at` /
`updated_at` preserved. The legacy `donner` field has no column (donor lives on
the student's enrolment) and is not copied.

## Result of the run (2026-11-14)

```
Designations: 80 → planned 62, skipped 18 (no matching trade)
Workplaces:   154 → unique 153, skipped 1 (merged duplicate)
Job holders:  240 → linkable 3, skipped 237

APPLIED: designationsCreated: 61, workplacesCreated: 152, jobHoldersCreated: 3
Totals  → designations: 63 | workplaces: 153 | job holders: 4
verify-jobs.mts → 0 problems
```

## Open decision — the 237 alumni job holders

**Decision: export only.** The unlinked records are kept in the JSON report and
exported to `reports/jobs-apply-*-unlinked-jobholders.csv`
(`node scripts/legacy/export-unlinked.mjs`) for a future alumni-import feature.

The alternative would have been to create alumni student stubs (sentinel
`formNo`/`nidOrBirthNo`/`phone`/`birthDate`) so all 240 job holders could be
inserted; that would add ~226 synthetic students to the registry and was
declined.
