-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "academy";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "billing";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "content";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "jobs";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "media";

-- CreateEnum
CREATE TYPE "academy"."StudentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'INACTIVE', 'DROPOUT', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "academy"."EntrySource" AS ENUM ('SELF', 'STAFF');

-- CreateEnum
CREATE TYPE "academy"."GuardianKind" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "billing"."PaymentKind" AS ENUM ('ADMISSION_FEE', 'COURSE_FEE', 'DONATION');

-- CreateEnum
CREATE TYPE "billing"."PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "billing"."PaymentGateway" AS ENUM ('STRIPE', 'SSLCOMMERZ', 'BKASH', 'NAGAD', 'MANUAL');

-- CreateEnum
CREATE TYPE "billing"."PaymentMethod" AS ENUM ('CARD', 'MOBILE_BANKING', 'BANK_TRANSFER', 'CASH');

-- CreateEnum
CREATE TYPE "identity"."Role" AS ENUM ('ADMIN', 'MODERATOR', 'TRAINER', 'ACCOUNTS', 'JP_MO', 'STUDENT');

-- CreateEnum
CREATE TYPE "identity"."UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "identity"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "identity"."AddressKind" AS ENUM ('PRESENT', 'PERMANENT');

-- CreateEnum
CREATE TYPE "identity"."AuthTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "media"."FeedbackStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "academy"."trades" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_bn" TEXT,
    "name_en" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."donors" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."batches" (
    "id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "batch_number" TEXT NOT NULL,
    "batch_code" TEXT NOT NULL,
    "shift" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "admission_opens_at" TIMESTAMPTZ,
    "admission_closes_at" TIMESTAMPTZ,
    "donor_id" UUID,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."trainer_trades" (
    "user_id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,

    CONSTRAINT "trainer_trades_pkey" PRIMARY KEY ("user_id","trade_id")
);

-- CreateTable
CREATE TABLE "academy"."applicant_trades" (
    "user_id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "applicant_trades_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "academy"."sid_counters" (
    "date_key" TEXT NOT NULL,
    "last_seq" INTEGER NOT NULL,

    CONSTRAINT "sid_counters_pkey" PRIMARY KEY ("date_key")
);

-- CreateTable
CREATE TABLE "academy"."students" (
    "id" UUID NOT NULL,
    "sid" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "form_number" TEXT,
    "legacy_mr_number" TEXT,
    "status" "academy"."StudentStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "academy"."EntrySource" NOT NULL DEFAULT 'SELF',
    "entered_by_id" UUID,
    "submitted_at" TIMESTAMPTZ,
    "form_scan_url" TEXT,
    "form_scan_public_id" TEXT,
    "has_disability" BOOLEAN NOT NULL DEFAULT false,
    "disability_details" TEXT,
    "family_income" DECIMAL(12,2),
    "family_members" INTEGER,
    "edu_qualification" TEXT,
    "edu_passing_year" INTEGER,
    "edu_result" TEXT,
    "edu_institution" TEXT,
    "legacy_mongo_id" CHAR(24),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."student_guardians" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "kind" "academy"."GuardianKind" NOT NULL,
    "name" TEXT,
    "occupation" TEXT,
    "phone" TEXT,
    "relation" TEXT,
    "address" TEXT,

    CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."student_results" (
    "student_id" UUID NOT NULL,
    "total_class_days" INTEGER,
    "present_class_days" INTEGER,
    "theory" DECIMAL(5,2),
    "practical" DECIMAL(5,2),
    "viva" DECIMAL(5,2),
    "final_result" DECIMAL(5,2),
    "remarks" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_results_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "academy"."student_remarks" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "author_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_remarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."student_status_history" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "from_status" "academy"."StudentStatus",
    "to_status" "academy"."StudentStatus" NOT NULL,
    "changed_by_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."courses" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "trade_id" UUID,
    "created_by_id" UUID,
    "legacy_mongo_id" CHAR(24),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."course_modules" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "milestone" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "legacy_mongo_id" CHAR(24),

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."course_videos" (
    "id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "youtube_video_id" TEXT NOT NULL,
    "duration_seconds" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "legacy_mongo_id" CHAR(24),

    CONSTRAINT "course_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy"."course_assignments" (
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "assigned_by_id" UUID,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_assignments_pkey" PRIMARY KEY ("user_id","course_id")
);

-- CreateTable
CREATE TABLE "academy"."video_unlocks" (
    "user_id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "unlocked_by_id" UUID,
    "unlocked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_unlocks_pkey" PRIMARY KEY ("user_id","video_id")
);

-- CreateTable
CREATE TABLE "academy"."video_progress" (
    "user_id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "watched_seconds" INTEGER NOT NULL DEFAULT 0,
    "last_position" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "video_progress_pkey" PRIMARY KEY ("user_id","video_id")
);

-- CreateTable
CREATE TABLE "billing"."fee_plans" (
    "id" UUID NOT NULL,
    "kind" "billing"."PaymentKind" NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'BDT',
    "batch_id" UUID,
    "course_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fee_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."payments" (
    "id" UUID NOT NULL,
    "kind" "billing"."PaymentKind" NOT NULL,
    "status" "billing"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gateway" "billing"."PaymentGateway" NOT NULL,
    "method" "billing"."PaymentMethod",
    "student_id" UUID,
    "user_id" UUID,
    "fee_plan_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'BDT',
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "gateway_session_id" TEXT,
    "gateway_payment_id" TEXT,
    "receipt_no" TEXT,
    "received_by_id" UUID,
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."payment_refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "gateway_refund_id" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."gateway_customers" (
    "user_id" UUID NOT NULL,
    "gateway" "billing"."PaymentGateway" NOT NULL,
    "customer_ref" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gateway_customers_pkey" PRIMARY KEY ("user_id","gateway")
);

-- CreateTable
CREATE TABLE "billing"."gateway_events" (
    "gateway" "billing"."PaymentGateway" NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,

    CONSTRAINT "gateway_events_pkey" PRIMARY KEY ("gateway","event_id")
);

-- CreateTable
CREATE TABLE "content"."headlines" (
    "id" UUID NOT NULL,
    "title_bn" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "headlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."banners" (
    "id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_public_id" TEXT,
    "title" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."news" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "published_on" DATE,
    "image_url" TEXT,
    "image_public_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "avatar_public_id" TEXT,
    "phone" TEXT,
    "date_of_birth" DATE,
    "gender" "identity"."Gender",
    "blood_group" TEXT,
    "nid_or_birth_no" TEXT,
    "role" "identity"."Role" NOT NULL DEFAULT 'STUDENT',
    "status" "identity"."UserStatus" NOT NULL DEFAULT 'PENDING',
    "password_hash" TEXT,
    "google_sub" TEXT,
    "email_verified_at" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "status_reason" TEXT,
    "legacy_mongo_id" CHAR(24),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."user_addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "identity"."AddressKind" NOT NULL,
    "address" TEXT,
    "division" TEXT,
    "district" TEXT,
    "upazila" TEXT,
    "union" TEXT,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."employee_profiles" (
    "user_id" UUID NOT NULL,
    "identity_card_no" TEXT,
    "designation" TEXT,
    "joining_date" DATE,
    "date_of_issue" DATE,
    "salary" DECIMAL(12,2),

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "identity"."refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "user_agent" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."auth_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "identity"."AuthTokenPurpose" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" UUID,
    "service" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "diff" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs"."categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs"."designations" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs"."workplaces" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contact" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workplaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs"."job_holders" (
    "id" UUID NOT NULL,
    "student_id" UUID,
    "name" TEXT,
    "photo_url" TEXT,
    "gender" "identity"."Gender",
    "trade_id" UUID,
    "donor_id" UUID,
    "designation_id" UUID,
    "workplace_id" UUID,
    "address" TEXT,
    "salary" DECIMAL(12,2),
    "joining_date" DATE,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "job_holders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media"."gallery_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "gallery_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media"."video_galleries" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "youtube_video_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "video_galleries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media"."picture_galleries" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "category_id" UUID,
    "image_url" TEXT NOT NULL,
    "image_public_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "picture_galleries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media"."student_feedback" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "course_id" UUID,
    "legacy_author_name" TEXT,
    "rating" SMALLINT,
    "comment" TEXT,
    "extra" JSONB,
    "status" "media"."FeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media"."success_stories" (
    "id" UUID NOT NULL,
    "student_id" UUID,
    "name_bn" TEXT,
    "image_url" TEXT,
    "image_public_id" TEXT,
    "trade_id" UUID,
    "name_en" TEXT,
    "role_bn" TEXT,
    "role_en" TEXT,
    "quote_bn" TEXT,
    "quote_en" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "success_stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trades_code_key" ON "academy"."trades"("code");

-- CreateIndex
CREATE UNIQUE INDEX "donors_name_key" ON "academy"."donors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batch_code_key" ON "academy"."batches"("batch_code");

-- CreateIndex
CREATE INDEX "batches_trade_id_batch_number_idx" ON "academy"."batches"("trade_id", "batch_number");

-- CreateIndex
CREATE INDEX "applicant_trades_trade_id_idx" ON "academy"."applicant_trades"("trade_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_sid_key" ON "academy"."students"("sid");

-- CreateIndex
CREATE UNIQUE INDEX "students_legacy_mongo_id_key" ON "academy"."students"("legacy_mongo_id");

-- CreateIndex
CREATE INDEX "students_status_idx" ON "academy"."students"("status");

-- CreateIndex
CREATE INDEX "students_created_at_idx" ON "academy"."students"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_batch_id_key" ON "academy"."students"("user_id", "batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_batch_id_form_number_key" ON "academy"."students"("batch_id", "form_number");

-- CreateIndex
CREATE UNIQUE INDEX "student_guardians_student_id_kind_key" ON "academy"."student_guardians"("student_id", "kind");

-- CreateIndex
CREATE INDEX "student_remarks_student_id_created_at_idx" ON "academy"."student_remarks"("student_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "student_status_history_student_id_created_at_idx" ON "academy"."student_status_history"("student_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "academy"."courses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "courses_legacy_mongo_id_key" ON "academy"."courses"("legacy_mongo_id");

-- CreateIndex
CREATE INDEX "courses_is_published_idx" ON "academy"."courses"("is_published");

-- CreateIndex
CREATE INDEX "courses_trade_id_idx" ON "academy"."courses"("trade_id");

-- CreateIndex
CREATE INDEX "course_modules_course_id_sort_order_idx" ON "academy"."course_modules"("course_id", "sort_order");

-- CreateIndex
CREATE INDEX "course_videos_module_id_sort_order_idx" ON "academy"."course_videos"("module_id", "sort_order");

-- CreateIndex
CREATE INDEX "course_assignments_course_id_idx" ON "academy"."course_assignments"("course_id");

-- CreateIndex
CREATE INDEX "video_progress_video_id_idx" ON "academy"."video_progress"("video_id");

-- CreateIndex
CREATE INDEX "fee_plans_kind_is_active_idx" ON "billing"."fee_plans"("kind", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_no_key" ON "billing"."payments"("receipt_no");

-- CreateIndex
CREATE INDEX "payments_student_id_status_idx" ON "billing"."payments"("student_id", "status");

-- CreateIndex
CREATE INDEX "payments_user_id_status_idx" ON "billing"."payments"("user_id", "status");

-- CreateIndex
CREATE INDEX "payments_kind_status_paid_at_idx" ON "billing"."payments"("kind", "status", "paid_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_gateway_session_id_key" ON "billing"."payments"("gateway", "gateway_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_gateway_payment_id_key" ON "billing"."payments"("gateway", "gateway_payment_id");

-- CreateIndex
CREATE INDEX "payment_refunds_payment_id_idx" ON "billing"."payment_refunds"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_customers_gateway_customer_ref_key" ON "billing"."gateway_customers"("gateway", "customer_ref");

-- CreateIndex
CREATE INDEX "banners_is_active_idx" ON "content"."banners"("is_active");

-- CreateIndex
CREATE INDEX "news_is_active_created_at_idx" ON "content"."news"("is_active", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "identity"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "identity"."users"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "users_legacy_mongo_id_key" ON "identity"."users"("legacy_mongo_id");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "identity"."users"("role", "status");

-- CreateIndex
CREATE INDEX "users_nid_or_birth_no_idx" ON "identity"."users"("nid_or_birth_no");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "identity"."users"("phone");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "identity"."users"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_addresses_user_id_kind_key" ON "identity"."user_addresses"("user_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_identity_card_no_key" ON "identity"."employee_profiles"("identity_card_no");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "identity"."refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "identity"."refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "identity"."refresh_tokens"("family_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "identity"."auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_tokens_user_id_purpose_idx" ON "identity"."auth_tokens"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "identity"."audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "identity"."audit_logs"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "designations_category_id_name_key" ON "jobs"."designations"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "job_holders_student_id_key" ON "jobs"."job_holders"("student_id");

-- CreateIndex
CREATE INDEX "job_holders_designation_id_idx" ON "jobs"."job_holders"("designation_id");

-- CreateIndex
CREATE INDEX "job_holders_workplace_id_idx" ON "jobs"."job_holders"("workplace_id");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_categories_name_key" ON "media"."gallery_categories"("name");

-- CreateIndex
CREATE INDEX "video_galleries_category_id_idx" ON "media"."video_galleries"("category_id");

-- CreateIndex
CREATE INDEX "video_galleries_is_active_created_at_idx" ON "media"."video_galleries"("is_active", "created_at" DESC);

-- CreateIndex
CREATE INDEX "picture_galleries_category_id_idx" ON "media"."picture_galleries"("category_id");

-- CreateIndex
CREATE INDEX "picture_galleries_is_active_created_at_idx" ON "media"."picture_galleries"("is_active", "created_at" DESC);

-- CreateIndex
CREATE INDEX "student_feedback_course_id_idx" ON "media"."student_feedback"("course_id");

-- CreateIndex
CREATE INDEX "student_feedback_user_id_idx" ON "media"."student_feedback"("user_id");

-- CreateIndex
CREATE INDEX "student_feedback_status_created_at_idx" ON "media"."student_feedback"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "success_stories_is_active_sort_order_idx" ON "media"."success_stories"("is_active", "sort_order");

-- AddForeignKey
ALTER TABLE "academy"."batches" ADD CONSTRAINT "batches_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "academy"."trades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."batches" ADD CONSTRAINT "batches_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "academy"."donors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."trainer_trades" ADD CONSTRAINT "trainer_trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."trainer_trades" ADD CONSTRAINT "trainer_trades_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "academy"."trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."applicant_trades" ADD CONSTRAINT "applicant_trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."applicant_trades" ADD CONSTRAINT "applicant_trades_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "academy"."trades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."students" ADD CONSTRAINT "students_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "academy"."batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."students" ADD CONSTRAINT "students_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_guardians" ADD CONSTRAINT "student_guardians_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_results" ADD CONSTRAINT "student_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_remarks" ADD CONSTRAINT "student_remarks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_remarks" ADD CONSTRAINT "student_remarks_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_status_history" ADD CONSTRAINT "student_status_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."student_status_history" ADD CONSTRAINT "student_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."courses" ADD CONSTRAINT "courses_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "academy"."trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."courses" ADD CONSTRAINT "courses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."course_modules" ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."course_videos" ADD CONSTRAINT "course_videos_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "academy"."course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."course_assignments" ADD CONSTRAINT "course_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."course_assignments" ADD CONSTRAINT "course_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."course_assignments" ADD CONSTRAINT "course_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."video_unlocks" ADD CONSTRAINT "video_unlocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."video_unlocks" ADD CONSTRAINT "video_unlocks_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "academy"."course_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."video_unlocks" ADD CONSTRAINT "video_unlocks_unlocked_by_id_fkey" FOREIGN KEY ("unlocked_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."video_progress" ADD CONSTRAINT "video_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy"."video_progress" ADD CONSTRAINT "video_progress_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "academy"."course_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."fee_plans" ADD CONSTRAINT "fee_plans_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "academy"."batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."fee_plans" ADD CONSTRAINT "fee_plans_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."fee_plans" ADD CONSTRAINT "fee_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."payments" ADD CONSTRAINT "payments_fee_plan_id_fkey" FOREIGN KEY ("fee_plan_id") REFERENCES "billing"."fee_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."payments" ADD CONSTRAINT "payments_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."payments" ADD CONSTRAINT "payments_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."payment_refunds" ADD CONSTRAINT "payment_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "billing"."payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."payment_refunds" ADD CONSTRAINT "payment_refunds_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."gateway_customers" ADD CONSTRAINT "gateway_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."news" ADD CONSTRAINT "news_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."users" ADD CONSTRAINT "users_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."categories" ADD CONSTRAINT "categories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."designations" ADD CONSTRAINT "designations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "jobs"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."designations" ADD CONSTRAINT "designations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."workplaces" ADD CONSTRAINT "workplaces_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."job_holders" ADD CONSTRAINT "job_holders_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."job_holders" ADD CONSTRAINT "job_holders_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "academy"."trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."job_holders" ADD CONSTRAINT "job_holders_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "academy"."donors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."job_holders" ADD CONSTRAINT "job_holders_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "jobs"."designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."job_holders" ADD CONSTRAINT "job_holders_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "jobs"."workplaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."job_holders" ADD CONSTRAINT "job_holders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."video_galleries" ADD CONSTRAINT "video_galleries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "media"."gallery_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."video_galleries" ADD CONSTRAINT "video_galleries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."picture_galleries" ADD CONSTRAINT "picture_galleries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "media"."gallery_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."picture_galleries" ADD CONSTRAINT "picture_galleries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."student_feedback" ADD CONSTRAINT "student_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."student_feedback" ADD CONSTRAINT "student_feedback_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."success_stories" ADD CONSTRAINT "success_stories_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "academy"."students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."success_stories" ADD CONSTRAINT "success_stories_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "academy"."trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."success_stories" ADD CONSTRAINT "success_stories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ------- raw SQL appended from design �5.1 (prisma/sql/*) -------

-- -- CHECK constraints --
-- CHECK constraints that cannot be expressed in Prisma — design §5.1.
-- Appended to the initial migration, after the tables exist.

-- feedback rating 1..5
ALTER TABLE media.student_feedback ADD CONSTRAINT feedback_rating_chk
	CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);

-- a job holder is EITHER a linked student (no local identity copy) OR a local name
ALTER TABLE jobs.job_holders ADD CONSTRAINT job_holder_identity_chk CHECK (
	(student_id IS NOT NULL AND name IS NULL AND photo_url IS NULL AND gender IS NULL AND trade_id IS NULL AND donor_id IS NULL)
	OR (student_id IS NULL AND name IS NOT NULL)
);

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

-- -- indexes --
-- Indexes that cannot be expressed in Prisma — design §5.1.

-- case-insensitive unique (replaces the legacy collation strength 2)
CREATE UNIQUE INDEX categories_name_ci_uq       ON jobs.categories (lower(name));
CREATE UNIQUE INDEX designations_cat_name_ci_uq ON jobs.designations (category_id, lower(name));
CREATE UNIQUE INDEX workplaces_name_ci_uq       ON jobs.workplaces (lower(name));

-- double-payment guard: a student cannot hold two live/successful payments
-- for the same fee plan
CREATE UNIQUE INDEX payments_one_live_per_plan_uq
	ON billing.payments (student_id, fee_plan_id)
	WHERE student_id IS NOT NULL AND status IN ('PENDING','SUCCEEDED','PARTIALLY_REFUNDED');

-- OPTIONAL partial unique from design §5.1 — deliberately left commented out:
-- replaces the Prisma @@unique([userId, batchId]) when soft-deleted students
-- should not block re-admission into the same batch (question Q14).
-- CREATE UNIQUE INDEX students_user_batch_uq ON academy.students(user_id, batch_id) WHERE deleted_at IS NULL;

-- -- views --
-- Views — design §5.1.

-- derived result total (never a stored duplicate)
CREATE VIEW academy.v_student_results AS
SELECT sr.*, COALESCE(theory,0)+COALESCE(practical,0)+COALESCE(viva,0) AS total
FROM academy.student_results sr;

-- full job-holder shape (from users/batches when a student is linked)
CREATE VIEW jobs.v_job_holders AS
SELECT jh.id,
	COALESCE(jh.name, u.name)             AS name,
	COALESCE(jh.photo_url, u.avatar_url)  AS photo_url,
	COALESCE(jh.gender, u.gender)         AS gender,
	COALESCE(jh.trade_id, b.trade_id)     AS trade_id,
	COALESCE(jh.donor_id, b.donor_id)     AS donor_id,
	d.name AS designation, d.category_id, w.name AS workplace,
	jh.address, jh.salary, jh.joining_date
FROM jobs.job_holders jh
LEFT JOIN academy.students s ON s.id = jh.student_id
LEFT JOIN identity.users u   ON u.id = s.user_id
LEFT JOIN academy.batches b  ON b.id = s.batch_id
LEFT JOIN jobs.designations d ON d.id = jh.designation_id
LEFT JOIN jobs.workplaces w   ON w.id = jh.workplace_id;

