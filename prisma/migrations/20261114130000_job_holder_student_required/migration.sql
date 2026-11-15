-- Every job holder is the employment record of one student. Local (student-less)
-- holder rows are no longer representable; this migration makes the link
-- mandatory after the caller has resolved any legacy rows.

DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "jobs"."job_holders" WHERE "student_id" IS NULL
	) THEN
		RAISE EXCEPTION
			'jobs.job_holders contains rows without student_id. Link or remove them before applying this migration.';
	END IF;
END $$;

ALTER TABLE "jobs"."job_holders" ALTER COLUMN "student_id" SET NOT NULL;

-- The old FK used ON DELETE SET NULL, which is incompatible with NOT NULL.
-- A student with an employment record must be soft-deleted instead.
ALTER TABLE "jobs"."job_holders" DROP CONSTRAINT IF EXISTS "job_holders_student_id_fkey";
ALTER TABLE "jobs"."job_holders"
	ADD CONSTRAINT "job_holders_student_id_fkey"
	FOREIGN KEY ("student_id") REFERENCES "academy"."student_informations"("id")
	ON DELETE RESTRICT ON UPDATE CASCADE;
