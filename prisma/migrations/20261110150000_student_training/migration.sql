-- DropForeignKey
ALTER TABLE "academy"."batches" DROP CONSTRAINT "batches_trade_id_fkey";

-- DropIndex

-- DropIndex

-- DropIndex

-- DropIndex

-- DropIndex

-- AlterTable
ALTER TABLE "academy"."batches" ADD COLUMN     "batch_no" INTEGER,
ADD COLUMN     "name_bn" TEXT,
ADD COLUMN     "name_en" TEXT;

-- AlterTable
ALTER TABLE "academy"."trades" ADD COLUMN     "batch_type_bn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "batch_type_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "details" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "details_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fee_unit" TEXT NOT NULL DEFAULT 'BDT',
ADD COLUMN     "image" TEXT,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "trade_name" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "weekend_bn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "weekend_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "weekly_class_bn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "weekly_class_en" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "academy"."student_trainings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "shift_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."trade_infos" (
    "id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "name_bn" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "is_bteb" BOOLEAN NOT NULL DEFAULT false,
    "seats" INTEGER NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "duration_bn" TEXT NOT NULL,
    "duration_en" TEXT NOT NULL,
    "daily_hours" INTEGER NOT NULL,
    "routine_bn" TEXT NOT NULL,
    "routine_en" TEXT NOT NULL,
    "min_grade" INTEGER NOT NULL,
    "qualification_bn" TEXT NOT NULL,
    "qualification_en" TEXT NOT NULL,

    CONSTRAINT "trade_infos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."trade_shifts" (
    "id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,

    CONSTRAINT "trade_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."batch_shifts" (
    "batch_id" UUID NOT NULL,
    "trade_shift_id" UUID NOT NULL,

    CONSTRAINT "batch_shifts_pkey" PRIMARY KEY ("batch_id","trade_shift_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_trainings_user_id_key" ON "academy"."student_trainings"("user_id");

-- CreateIndex
CREATE INDEX "student_trainings_trade_id_idx" ON "academy"."student_trainings"("trade_id");

-- CreateIndex
CREATE INDEX "student_trainings_batch_id_idx" ON "academy"."student_trainings"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "trade_infos_trade_id_key" ON "academy"."trade_infos"("trade_id");

-- CreateIndex
CREATE UNIQUE INDEX "trade_shifts_trade_id_code_key" ON "academy"."trade_shifts"("trade_id", "code");

-- CreateIndex
CREATE INDEX "batches_start_date_end_date_idx" ON "academy"."batches"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "batches_trade_id_batch_no_key" ON "academy"."batches"("trade_id", "batch_no");

-- AddForeignKey
ALTER TABLE "academy"."student_trainings" ADD CONSTRAINT "student_trainings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_trainings" ADD CONSTRAINT "student_trainings_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "academy"."trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_trainings" ADD CONSTRAINT "student_trainings_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "academy"."batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_trainings" ADD CONSTRAINT "student_trainings_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "academy"."trade_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."trade_infos" ADD CONSTRAINT "trade_infos_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "academy"."trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."trade_shifts" ADD CONSTRAINT "trade_shifts_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "academy"."trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."batches" ADD CONSTRAINT "batches_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "academy"."trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."batch_shifts" ADD CONSTRAINT "batch_shifts_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "academy"."batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."batch_shifts" ADD CONSTRAINT "batch_shifts_trade_shift_id_fkey" FOREIGN KEY ("trade_shift_id") REFERENCES "academy"."trade_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
