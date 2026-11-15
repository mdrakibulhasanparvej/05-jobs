-- Designations are now trade-wise. The separate jobs.categories layer is removed.

-- The old view reads columns that this migration changes.
DROP VIEW IF EXISTS "jobs"."v_job_holders";

-- ── designations: category_id → trade_id ────────────────────────────────
ALTER TABLE "jobs"."designations" ADD COLUMN IF NOT EXISTS "trade_id" UUID;

-- Best-effort mapping of the old category name to an existing trade. Exact
-- matches win; otherwise the category name is matched inside the trade labels.
-- Wrapped in a guard so the migration also finishes cleanly when a previous
-- attempt already removed the categories table.
DO $migration$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'jobs' AND table_name = 'categories'
	) THEN
		UPDATE "jobs"."designations" d
		SET "trade_id" = matched."trade_id"
		FROM "jobs"."categories" c
		JOIN LATERAL (
			SELECT t.id AS "trade_id"
			FROM "academy"."trades" t
			WHERE lower(trim(t."name_en")) = lower(trim(c."name"))
				OR lower(trim(coalesce(t."trade_name", ''))) = lower(trim(c."name"))
				OR lower(trim(t."name_en")) LIKE '%' || lower(trim(c."name")) || '%'
				OR lower(trim(coalesce(t."trade_name", ''))) LIKE '%' || lower(trim(c."name")) || '%'
			ORDER BY (
				lower(trim(t."name_en")) = lower(trim(c."name"))
				OR lower(trim(coalesce(t."trade_name", ''))) = lower(trim(c."name"))
			) DESC, t."code"
			LIMIT 1
		) matched ON true
		WHERE d."category_id" = c."id";
	END IF;
END
$migration$;

-- Any category that could not be matched is assigned the first trade so no
-- designation is lost; staff can re-assign it from the trade selector.
UPDATE "jobs"."designations"
SET "trade_id" = (
	SELECT t."id" FROM "academy"."trades" t ORDER BY t."code" LIMIT 1
)
WHERE "trade_id" IS NULL;

-- Two categories could have had designations with the same name. After they
-- collapse onto one trade, rename only the later duplicates so the new unique
-- constraint can be created without dropping rows.
WITH ranked AS (
	SELECT "id",
		row_number() OVER (
			PARTITION BY "trade_id", lower("name")
			ORDER BY "created_at", "id"
		) AS rn
	FROM "jobs"."designations"
)
UPDATE "jobs"."designations" d
SET "name" = d."name" || ' (' || ranked.rn || ')'
FROM ranked
WHERE d."id" = ranked."id" AND ranked.rn > 1;

ALTER TABLE "jobs"."designations" DROP CONSTRAINT IF EXISTS "designations_category_id_fkey";
DROP INDEX IF EXISTS "jobs"."designations_category_id_name_key";
DROP INDEX IF EXISTS "jobs"."designations_cat_name_ci_uq";
ALTER TABLE "jobs"."designations" DROP COLUMN IF EXISTS "category_id";

ALTER TABLE "jobs"."designations" ALTER COLUMN "trade_id" SET NOT NULL;
ALTER TABLE "jobs"."designations" DROP CONSTRAINT IF EXISTS "designations_trade_id_fkey";
ALTER TABLE "jobs"."designations"
	ADD CONSTRAINT "designations_trade_id_fkey"
	FOREIGN KEY ("trade_id") REFERENCES "academy"."trades"("id")
	ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "jobs"."designations_trade_id_name_key";
DROP INDEX IF EXISTS "jobs"."designations_trade_name_ci_uq";
CREATE UNIQUE INDEX "designations_trade_id_name_key"
	ON "jobs"."designations"("trade_id", "name");
CREATE UNIQUE INDEX "designations_trade_name_ci_uq"
	ON "jobs"."designations"("trade_id", lower("name"));

DROP TABLE IF EXISTS "jobs"."categories";

-- ── job holders: free-text designation → designation_id ─────────────────
ALTER TABLE "jobs"."job_holders" ADD COLUMN IF NOT EXISTS "designation_id" UUID;

UPDATE "jobs"."job_holders" jh
SET "designation_id" = (
	SELECT d."id"
	FROM "jobs"."designations" d
	WHERE lower(d."name") = lower(jh."designation")
	ORDER BY (
		d."trade_id" = (
			SELECT st."trade_id"
			FROM "academy"."student_trades" st
			WHERE st."student_id" = jh."student_id"
			ORDER BY st."created_at"
			LIMIT 1
		)
	) DESC NULLS LAST
	LIMIT 1
)
WHERE jh."designation" IS NOT NULL;

ALTER TABLE "jobs"."job_holders" DROP COLUMN IF EXISTS "designation";

ALTER TABLE "jobs"."job_holders" DROP CONSTRAINT IF EXISTS "job_holders_designation_id_fkey";
ALTER TABLE "jobs"."job_holders"
	ADD CONSTRAINT "job_holders_designation_id_fkey"
	FOREIGN KEY ("designation_id") REFERENCES "jobs"."designations"("id")
	ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "job_holders_designation_id_idx"
	ON "jobs"."job_holders"("designation_id");

-- ── read model ──────────────────────────────────────────────────────────
CREATE VIEW "jobs"."v_job_holders" AS
SELECT jh.id,
	jh.student_id,
	s.mr_no,
	s.name,
	s.gender,
	bt.trade_id,
	t.name_en AS trade,
	jh.photo_url,
	jh.designation_id,
	d.name AS designation,
	w.id        AS workplace_id,
	w.name      AS workplace,
	w.address,
	jh.salary,
	bt.donor_id
FROM "jobs"."job_holders" jh
JOIN "academy"."student_informations" s ON s.id = jh.student_id
LEFT JOIN LATERAL (
	SELECT st.trade_id, b.donor_id
	  FROM "academy"."student_trades" st
	  JOIN "academy"."batches" b ON b.id = st.batch_id
	 WHERE st.student_id = s.id
	 ORDER BY st.created_at
	 LIMIT 1
) bt ON true
LEFT JOIN "academy"."trades" t    ON t.id = bt.trade_id
LEFT JOIN "jobs"."designations" d ON d.id = jh.designation_id
LEFT JOIN "jobs"."workplaces" w   ON w.id = jh.workplace_id;
