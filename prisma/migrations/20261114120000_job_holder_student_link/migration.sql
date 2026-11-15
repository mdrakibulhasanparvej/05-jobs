-- A job holder is now only the employment record of a linked student.
-- Person data (name, gender, trade, donor) stays on the student side and the
-- address stays on the workplace; nothing is copied into job_holders.

-- The old view selected the columns being dropped.
DROP VIEW IF EXISTS "jobs"."v_job_holders";

-- The old either/or identity CHECK no longer applies.
ALTER TABLE "jobs"."job_holders" DROP CONSTRAINT IF EXISTS "job_holder_identity_chk";

-- Replace the designation relation with a free-text label.
ALTER TABLE "jobs"."job_holders" ADD COLUMN IF NOT EXISTS "designation" TEXT;

UPDATE "jobs"."job_holders" jh
SET "designation" = d.name
FROM "jobs"."designations" d
WHERE d.id = jh."designation_id" AND jh."designation" IS NULL;

ALTER TABLE "jobs"."job_holders" DROP CONSTRAINT IF EXISTS "job_holders_trade_id_fkey";
ALTER TABLE "jobs"."job_holders" DROP CONSTRAINT IF EXISTS "job_holders_donor_id_fkey";
ALTER TABLE "jobs"."job_holders" DROP CONSTRAINT IF EXISTS "job_holders_designation_id_fkey";

ALTER TABLE "jobs"."job_holders"
	DROP COLUMN IF EXISTS "name",
	DROP COLUMN IF EXISTS "gender",
	DROP COLUMN IF EXISTS "trade_id",
	DROP COLUMN IF EXISTS "donor_id",
	DROP COLUMN IF EXISTS "designation_id",
	DROP COLUMN IF EXISTS "address",
	DROP COLUMN IF EXISTS "joining_date";

-- `student_id` stays nullable at the DB level so this migration can be applied
-- to databases that still contain legacy local holder rows. The API requires a
-- student on every create/update, so new rows are always linked.

-- Recreate the read model with every person/workplace value joined.
CREATE VIEW "jobs"."v_job_holders" AS
SELECT jh.id,
	jh.student_id,
	s.mr_no,
	s.name,
	s.gender,
	bt.trade_id,
	t.name_en AS trade,
	jh.photo_url,
	jh.designation,
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
LEFT JOIN "academy"."trades" t  ON t.id = bt.trade_id
LEFT JOIN "jobs"."workplaces" w ON w.id = jh.workplace_id;
