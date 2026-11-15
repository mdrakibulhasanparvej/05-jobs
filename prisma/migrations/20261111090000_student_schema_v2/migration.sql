-- Views depend on the old student tables, so drop them first (recreated below).
DROP VIEW IF EXISTS "jobs"."v_job_holders";
DROP VIEW IF EXISTS "academy"."v_student_results";
-- CreateEnum
CREATE TYPE "academy"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "academy"."ResultStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- DropForeignKey
ALTER TABLE "academy"."student_guardians" DROP CONSTRAINT "student_guardians_student_id_fkey";

-- DropForeignKey
ALTER TABLE "academy"."student_remarks" DROP CONSTRAINT "student_remarks_student_id_fkey";

-- DropForeignKey
ALTER TABLE "academy"."student_results" DROP CONSTRAINT "student_results_student_id_fkey";

-- DropForeignKey
ALTER TABLE "academy"."student_status_history" DROP CONSTRAINT "student_status_history_changed_by_id_fkey";

-- DropForeignKey
ALTER TABLE "academy"."student_status_history" DROP CONSTRAINT "student_status_history_student_id_fkey";

-- DropForeignKey
ALTER TABLE "academy"."students" DROP CONSTRAINT "students_batch_id_fkey";

-- DropForeignKey
ALTER TABLE "academy"."students" DROP CONSTRAINT "students_entered_by_id_fkey";

-- DropForeignKey
ALTER TABLE "academy"."students" DROP CONSTRAINT "students_user_id_fkey";

-- DropForeignKey
ALTER TABLE "billing"."payments" DROP CONSTRAINT "payments_student_id_fkey";

-- DropForeignKey
ALTER TABLE "jobs"."job_holders" DROP CONSTRAINT "job_holders_student_id_fkey";

-- DropForeignKey
ALTER TABLE "media"."success_stories" DROP CONSTRAINT "success_stories_student_id_fkey";

-- DropIndex

-- DropIndex

-- DropIndex

-- DropTable
DROP TABLE "academy"."sid_counters";

-- DropTable
DROP TABLE "academy"."student_guardians";

-- DropTable
DROP TABLE "academy"."student_results";

-- DropTable
DROP TABLE "academy"."student_status_history";

-- DropTable
DROP TABLE "academy"."students";

-- DropEnum
DROP TYPE "academy"."EntrySource";

-- DropEnum
DROP TYPE "academy"."GuardianKind";

-- DropEnum
DROP TYPE "academy"."StudentStatus";

-- CreateTable
CREATE TABLE "academy"."student_informations" (
    "id" UUID NOT NULL,
    "form_no" TEXT NOT NULL,
    "mr_no" TEXT,
    "photo" TEXT,
    "name" TEXT NOT NULL,
    "gender" "identity"."Gender" NOT NULL,
    "phone" TEXT NOT NULL,
    "nid_or_birth_no" TEXT NOT NULL,
    "birth_date" DATE NOT NULL,
    "physical_disability" BOOLEAN NOT NULL DEFAULT false,
    "disability_details" TEXT,
    "present_address_id" UUID,
    "permanent_address_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "student_informations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."addresses" (
    "id" UUID NOT NULL,
    "address_line" TEXT NOT NULL,
    "post_office" TEXT,
    "upazila" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "post_code" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."parent_informations" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "father_name" TEXT NOT NULL,
    "father_occupation" TEXT,
    "father_phone" TEXT,
    "mother_name" TEXT NOT NULL,
    "mother_occupation" TEXT,
    "mother_phone" TEXT,

    CONSTRAINT "parent_informations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."guardian_informations" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_id" UUID,

    CONSTRAINT "guardian_informations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."family_informations" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "total_members" INTEGER NOT NULL,
    "income" INTEGER NOT NULL,

    CONSTRAINT "family_informations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."educations" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "qualification" TEXT NOT NULL,
    "passing_year" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "institution" TEXT NOT NULL,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."student_trades" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "trade_shift_id" UUID NOT NULL,
    "status" "academy"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."examination_results" (
    "id" UUID NOT NULL,
    "student_trade_id" UUID NOT NULL,
    "theory" INTEGER NOT NULL DEFAULT 0,
    "practical" INTEGER NOT NULL DEFAULT 0,
    "viva" INTEGER NOT NULL DEFAULT 0,
    "total_marks" INTEGER NOT NULL DEFAULT 0,
    "attended_days" INTEGER NOT NULL DEFAULT 0,
    "total_days" INTEGER NOT NULL DEFAULT 0,
    "certificate_sl" TEXT,
    "final_grade" TEXT,
    "status" "academy"."ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "examination_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_informations_form_no_key" ON "academy"."student_informations"("form_no");

-- CreateIndex
CREATE UNIQUE INDEX "student_informations_mr_no_key" ON "academy"."student_informations"("mr_no");

-- CreateIndex
CREATE UNIQUE INDEX "student_informations_nid_or_birth_no_key" ON "academy"."student_informations"("nid_or_birth_no");

-- CreateIndex
CREATE INDEX "student_informations_phone_idx" ON "academy"."student_informations"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "parent_informations_student_id_key" ON "academy"."parent_informations"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_informations_student_id_key" ON "academy"."guardian_informations"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "family_informations_student_id_key" ON "academy"."family_informations"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "educations_student_id_key" ON "academy"."educations"("student_id");

-- CreateIndex
CREATE INDEX "student_trades_trade_id_idx" ON "academy"."student_trades"("trade_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_trades_student_id_batch_id_key" ON "academy"."student_trades"("student_id", "batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "examination_results_student_trade_id_key" ON "academy"."examination_results"("student_trade_id");

-- CreateIndex
CREATE UNIQUE INDEX "examination_results_certificate_sl_key" ON "academy"."examination_results"("certificate_sl");

-- AddForeignKey
ALTER TABLE "academy"."student_informations" ADD CONSTRAINT "student_informations_present_address_id_fkey" FOREIGN KEY ("present_address_id") REFERENCES "academy"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_informations" ADD CONSTRAINT "student_informations_permanent_address_id_fkey" FOREIGN KEY ("permanent_address_id") REFERENCES "academy"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."parent_informations" ADD CONSTRAINT "parent_informations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."student_informations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."guardian_informations" ADD CONSTRAINT "guardian_informations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."student_informations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."guardian_informations" ADD CONSTRAINT "guardian_informations_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "academy"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."family_informations" ADD CONSTRAINT "family_informations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."student_informations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."educations" ADD CONSTRAINT "educations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."student_informations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_trades" ADD CONSTRAINT "student_trades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."student_informations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_trades" ADD CONSTRAINT "student_trades_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "academy"."trades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_trades" ADD CONSTRAINT "student_trades_batch_id_trade_shift_id_fkey" FOREIGN KEY ("batch_id", "trade_shift_id") REFERENCES "academy"."batch_shifts"("batch_id", "trade_shift_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."examination_results" ADD CONSTRAINT "examination_results_student_trade_id_fkey" FOREIGN KEY ("student_trade_id") REFERENCES "academy"."student_trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_remarks" ADD CONSTRAINT "student_remarks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."student_informations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."student_informations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."job_holders" ADD CONSTRAINT "job_holders_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."student_informations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."success_stories" ADD CONSTRAINT "success_stories_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."student_informations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Recreated views on the new student schema
CREATE VIEW "academy"."v_student_results" AS
SELECT er.*,
       COALESCE(er.theory, 0) + COALESCE(er.practical, 0) + COALESCE(er.viva, 0) AS total
FROM "academy"."examination_results" er;

CREATE VIEW "jobs"."v_job_holders" AS
SELECT jh.id,
       COALESCE(jh.name, s.name)            AS name,
       COALESCE(jh.photo_url, s.photo)      AS photo_url,
       COALESCE(jh.gender, s.gender)        AS gender,
       COALESCE(jh.trade_id, bt.trade_id)   AS trade_id,
       COALESCE(jh.donor_id, bt.donor_id)   AS donor_id,
       d.name AS designation, d.category_id, w.name AS workplace,
       jh.address, jh.salary, jh.joining_date
FROM "jobs"."job_holders" jh
LEFT JOIN "academy"."student_informations" s ON s.id = jh.student_id
LEFT JOIN LATERAL (
    SELECT st.trade_id, b.donor_id
      FROM "academy"."student_trades" st
      JOIN "academy"."batches" b ON b.id = st.batch_id
     WHERE st.student_id = s.id
     ORDER BY st.created_at
     LIMIT 1
) bt ON true
LEFT JOIN "jobs"."designations" d ON d.id = jh.designation_id
LEFT JOIN "jobs"."workplaces" w ON w.id = jh.workplace_id;