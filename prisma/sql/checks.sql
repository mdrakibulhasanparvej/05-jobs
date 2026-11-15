-- CHECK constraints that cannot be expressed in Prisma — design §5.1.
-- Appended to the initial migration, after the tables exist.

-- feedback rating 1..5
ALTER TABLE media.student_feedback ADD CONSTRAINT feedback_rating_chk
	CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);

-- success stories / feedback: block copying a person's data
ALTER TABLE media.success_stories ADD CONSTRAINT story_identity_chk CHECK (
	(student_id IS NOT NULL AND name_bn IS NULL AND image_url IS NULL AND trade_id IS NULL)
	OR (student_id IS NULL AND name_bn IS NOT NULL)
);
ALTER TABLE media.student_feedback ADD CONSTRAINT feedback_author_chk CHECK (
	user_id IS NOT NULL OR legacy_author_name IS NOT NULL
);

-- billing
ALTER TABLE billing.fee_plans ADD CONSTRAINT fee_plan_kind_chk CHECK (
	(kind = 'COURSE_FEE' AND course_id IS NOT NULL AND batch_id IS NULL)
	OR (kind = 'ADMISSION_FEE' AND course_id IS NULL)
);
ALTER TABLE billing.fee_plans ADD CONSTRAINT fee_plan_amount_chk CHECK (amount > 0);

ALTER TABLE billing.payments ADD CONSTRAINT payment_subject_chk CHECK (
	(kind IN ('ADMISSION_FEE','COURSE_FEE') AND student_id IS NOT NULL AND fee_plan_id IS NOT NULL AND user_id IS NULL)
	OR (kind = 'DONATION' AND user_id IS NOT NULL AND student_id IS NULL AND fee_plan_id IS NULL)
);
ALTER TABLE billing.payments ADD CONSTRAINT payment_amount_chk CHECK (amount > 0);

-- for fees the MR number and verification arrive together (one implies the other)
ALTER TABLE billing.payments ADD CONSTRAINT payment_mr_chk CHECK (
	kind = 'DONATION' OR ((receipt_no IS NULL) = (verified_at IS NULL))
);

-- staff-entered admissions must record who entered them; submitted rows must have submitted_at
ALTER TABLE academy.students ADD CONSTRAINT student_source_chk
	CHECK (source = 'SELF' OR entered_by_id IS NOT NULL);
ALTER TABLE academy.students ADD CONSTRAINT student_submitted_chk
	CHECK (status = 'DRAFT' OR submitted_at IS NOT NULL);
