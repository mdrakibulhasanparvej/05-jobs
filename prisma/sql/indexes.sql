-- Indexes that cannot be expressed in Prisma — design §5.1.

-- case-insensitive unique (replaces the legacy collation strength 2)
CREATE UNIQUE INDEX designations_trade_name_ci_uq ON jobs.designations (trade_id, lower(name));
CREATE UNIQUE INDEX workplaces_name_ci_uq         ON jobs.workplaces (lower(name));

-- double-payment guard: a student cannot hold two live/successful payments
-- for the same fee plan
CREATE UNIQUE INDEX payments_one_live_per_plan_uq
	ON billing.payments (student_id, fee_plan_id)
	WHERE student_id IS NOT NULL AND status IN ('PENDING','SUCCEEDED','PARTIALLY_REFUNDED');

-- OPTIONAL partial unique from design §5.1 — deliberately left commented out:
-- replaces the Prisma @@unique([userId, batchId]) when soft-deleted students
-- should not block re-admission into the same batch (question Q14).
-- CREATE UNIQUE INDEX students_user_batch_uq ON academy.students(user_id, batch_id) WHERE deleted_at IS NULL;
