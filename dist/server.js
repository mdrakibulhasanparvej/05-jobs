
      import { createRequire } from 'module';
      const require = createRequire(import.meta.url);
    
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/app/config/index.ts
import path from "path";
import process2, { env } from "process";
import dotenv from "dotenv";
var envPath = path.join(process2.cwd(), "/.env");
dotenv.config({ path: envPath, quiet: true });
var pem = (value) => value ? value.replaceAll("\\n", "\n") : value;
var config_default = {
  environment: env.ENVIRONMENT,
  service_name: env.SERVICE_NAME,
  port: env.PORT,
  frontend_url: env.FRONTEND_URL || "http://localhost:3000",
  database_url: env.DATABASE_URL,
  bcrypt_salt_rounds: env.BCRYPT_SALT_ROUNDS,
  // asymmetric JWT (D4): identity signs with the private key, every service
  // verifies with the public key — ES256 pins the algorithm (D11)
  jwt_private_key: pem(env.JWT_PRIVATE_KEY),
  jwt_public_key: pem(env.JWT_PUBLIC_KEY),
  jwt_issuer: env.JWT_ISSUER || "gs-identity",
  jwt_audience: env.JWT_AUDIENCE || "gs-api",
  access_token_ttl: env.ACCESS_TOKEN_TTL || "15m",
  refresh_token_ttl: env.REFRESH_TOKEN_TTL || "30d",
  internal_token_ttl: env.INTERNAL_TOKEN_TTL || "60s",
  // single-use email links (P1): verify 24h, reset 1h
  verify_token_ttl: env.VERIFY_TOKEN_TTL || "24h",
  reset_token_ttl: env.RESET_TOKEN_TTL || "1h",
  cookie_domain: env.COOKIE_DOMAIN,
  // service-to-service (P2): academy → identity internal profile write
  identity_base_url: env.INTERNAL_BASE_URL_IDENTITY || "http://localhost:5001",
  // D17 idempotency window + trainer scope cache (minutes/seconds)
  admission_idempotency_ttl: env.ADMISSION_IDEMPOTENCY_TTL || "24h",
  trainer_cache_ttl: env.TRAINER_CACHE_TTL || "300",
  // P3 — results export (D16) + the privacy-gated public lookup (Q11)
  export_max_rows: env.EXPORT_MAX_ROWS || "1000",
  export_batch_size: env.EXPORT_BATCH_SIZE || "500",
  result_lookup_enabled: env.RESULT_LOOKUP_ENABLED === "true",
  // P4 — billing (D6 gateway adapter)
  payment_gateway: (env.PAYMENT_GATEWAY || "STRIPE").toUpperCase(),
  payment_session_ttl: env.PAYMENT_SESSION_TTL || "30m",
  donation_receipt_prefix: env.DONATION_RECEIPT_PREFIX || "DN",
  // P5 — content assistant (Q26: no vendor hard-coded) + test knob
  translation_provider: (env.TRANSLATION_PROVIDER || "disabled").toLowerCase(),
  translation_api_key: env.TRANSLATION_API_KEY,
  chat_max_input_chars: env.CHAT_MAX_INPUT_CHARS || "1000",
  translate_max_input_chars: env.TRANSLATE_MAX_INPUT_CHARS || "2000",
  // integration tests normally bypass rate limits; dedicated limit tests
  // turn this off before importing the app
  rate_limit_bypass: env.RATE_LIMIT_BYPASS === "true",
  // P6 — media (feedback rating bounds + cache TTL used from P9)
  feedback_min_rating: env.FEEDBACK_MIN_RATING || "1",
  feedback_max_rating: env.FEEDBACK_MAX_RATING || "5",
  media_cache_ttl: env.MEDIA_CACHE_TTL || "300",
  // P9 — gateway/hardening
  frontend_urls: (env.FRONTEND_URLS || env.FRONTEND_URL || "http://localhost:3000").split(",").map((url) => url.trim()).filter(Boolean),
  trust_proxy: env.TRUST_PROXY,
  cache_ttl_public: Number(env.CACHE_TTL_PUBLIC) || 120,
  cache_ttl_reference: Number(env.CACHE_TTL_REFERENCE) || 300,
  rate_limit_global_max: Number(env.RATE_LIMIT_GLOBAL_MAX) || 300,
  log_level: env.LOG_LEVEL || "info",
  // cloudinary credentials
  cloudinary_cloud_name: env.CLOUDINARY_CLOUD_NAME,
  cloudinary_api_key: env.CLOUDINARY_API_KEY,
  cloudinary_api_secret: env.CLOUDINARY_API_SECRET,
  // redis credentials
  redis_username: env.REDIS_USERNAME,
  redis_password: env.REDIS_PASSWORD,
  redis_host: env.REDIS_HOST || "127.0.0.1",
  redis_port: env.REDIS_PORT || "6379",
  // nodemailer credentials
  email_sender: env.EMAIL_SENDER,
  google_app_password: env.GOOGLE_APP_PASSWORD,
  // google oauth (ID token audience)
  google_client_id: env.GOOGLE_CLIENT_ID,
  // stripe (adapter only — staging/tests, design §7.7)
  stripe_secret_key: env.STRIPE_SECRET_KEY,
  stripe_webhook_secret: env.STRIPE_WEBHOOK_SECRET,
  // billing guardrails
  min_donation_amount: env.MIN_DONATION_AMOUNT || "10"
};

// src/app/lib/redis.ts
import { createClient } from "redis";
var redisClient = createClient({
  // credentials are optional — only include them when set
  // (exactOptionalPropertyTypes forbids explicit `undefined`)
  ...config_default.redis_username ? { username: config_default.redis_username } : {},
  ...config_default.redis_password ? { password: config_default.redis_password } : {},
  // Redis is optional (fail-open): never queue commands while disconnected —
  // they must reject immediately so cache/denylist/rate-limit degrade to a
  // miss instead of hanging every request on the reconnect timeout (P9)
  disableOfflineQueue: true,
  // Keep-alive PING so long-lived idle connections stay alive.
  pingInterval: 3e4,
  socket: {
    host: config_default.redis_host,
    port: Number(config_default.redis_port),
    connectTimeout: 1e4,
    keepAlive: true,
    keepAliveInitialDelay: 5e3,
    // Never give up: back off to at most 5s between attempts.
    reconnectStrategy: (retries) => Math.min(retries * 200, 5e3)
  }
});
redisClient.on("error", (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[redis] client error: ${message}`);
});
redisClient.on("connect", () => {
  console.log("[redis] connecting...");
});
redisClient.on("ready", () => {
  console.log("[redis] connection ready");
});
redisClient.on("reconnecting", () => {
  console.warn("[redis] reconnecting...");
});
redisClient.on("end", () => {
  console.warn("[redis] connection closed");
});
var redis_default = redisClient;

// src/db/client.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// src/generated/client.ts
import "process";
import * as path2 from "path";
import { fileURLToPath } from "url";
import "@prisma/client/runtime/client";

// src/generated/enums.ts
var Role = {
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  TRAINER: "TRAINER",
  ACCOUNTS: "ACCOUNTS",
  JP_MO: "JP_MO",
  STUDENT: "STUDENT"
};

// src/generated/internal/class.ts
import * as runtime from "@prisma/client/runtime/client";
var config = {
  "previewFeatures": [],
  "clientVersion": "7.10.1",
  "engineVersion": "d1b3f377ca835d73fd50954a5e22128b9ebdd6b8",
  "activeProvider": "postgresql",
  "inlineSchema": '// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 ACADEMY (02) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Models verbatim from design \xA75. Service 02-academy owns this schema.\n\n// Enums live in enum.prisma (single enum file) \u2014 do not declare enums here.\n\n// Trade / TradeInfo / TradeShift / Batch / BatchShift are defined once in\n// trade.prisma (shared by every section) \u2014 do not redefine them here.\n\nmodel Donor {\n  id   String @id @default(uuid(7)) @db.Uuid\n  name String @unique\n\n  batches Batch[]\n\n  @@map("donors")\n  @@schema("academy")\n}\n\nmodel TrainerTrade {\n  userId  String @map("user_id") @db.Uuid\n  tradeId String @map("trade_id") @db.Uuid\n\n  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)\n  trade Trade @relation(fields: [tradeId], references: [id], onDelete: Cascade)\n\n  @@id([userId, tradeId])\n  @@map("trainer_trades")\n  @@schema("academy")\n}\n\nmodel ApplicantTrade {\n  // the trade a user picked at registration (user lives in identity, so a separate table)\n  userId    String   @id @map("user_id") @db.Uuid\n  tradeId   String   @map("trade_id") @db.Uuid\n  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)\n  trade Trade @relation(fields: [tradeId], references: [id])\n\n  @@index([tradeId])\n  @@map("applicant_trades")\n  @@schema("academy")\n}\n\n// Universal training selection: one row per user (registered or admitted).\n// Pure IDs only \u2014 trade name, batch and shift details come from the relations.\nmodel StudentTraining {\n  id        String   @id @default(uuid(7)) @db.Uuid\n  userId    String   @unique @map("user_id") @db.Uuid\n  tradeId   String   @map("trade_id") @db.Uuid\n  batchId   String   @map("batch_id") @db.Uuid\n  shiftId   String?  @map("shift_id") @db.Uuid\n  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  user  User        @relation(fields: [userId], references: [id], onDelete: Cascade)\n  trade Trade       @relation(fields: [tradeId], references: [id], onDelete: Cascade)\n  batch Batch       @relation(fields: [batchId], references: [id], onDelete: Cascade)\n  shift TradeShift? @relation(fields: [shiftId], references: [id], onDelete: SetNull)\n\n  @@index([tradeId])\n  @@index([batchId])\n  @@map("student_trainings")\n  @@schema("academy")\n}\n\n// \u2500\u2500 student records (standalone \u2014 not tied to identity.User) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Personal data lives here because a student record can exist without a login\n// account (staff-entered / imported). The signed-in user\'s own trade choice is\n// still kept in StudentTraining (userId based).\n\nmodel StudentInformation {\n  id                 String   @id @default(uuid(7)) @db.Uuid\n  formNo             String   @unique @map("form_no")\n  mrNo               String?  @unique @map("mr_no")\n  photo              String?\n  name               String\n  gender             Gender\n  phone              String\n  nidOrBirthNo       String   @unique @map("nid_or_birth_no")\n  birthDate          DateTime @map("birth_date") @db.Date\n  physicalDisability Boolean  @default(false) @map("physical_disability")\n  disabilityDetails  String?  @map("disability_details")\n\n  presentAddressId   String? @map("present_address_id") @db.Uuid\n  permanentAddressId String? @map("permanent_address_id") @db.Uuid\n\n  parent    ParentInformation?\n  guardian  GuardianInformation?\n  family    FamilyInformation?\n  education Education?\n  trades    StudentTrade[]\n  remarks   StudentRemark[]\n  payments  Payment[]\n  jobHolder JobHolder?\n  stories   SuccessStory[]\n\n  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz\n  deletedAt DateTime? @map("deleted_at") @db.Timestamptz\n\n  presentAddress   Address? @relation("PresentAddress", fields: [presentAddressId], references: [id])\n  permanentAddress Address? @relation("PermanentAddress", fields: [permanentAddressId], references: [id])\n\n  @@index([phone])\n  @@map("student_informations")\n  @@schema("academy")\n}\n\n// Universal address (student present/permanent + guardian). Staff addresses\n// stay in identity.user_addresses.\nmodel Address {\n  id          String  @id @default(uuid(7)) @db.Uuid\n  addressLine String  @map("address_line") // "A-79, Bank Colony"\n  postOffice  String? @map("post_office")\n  upazila     String // Savar / Chuadanga\n  district    String // Dhaka / Chuadanga\n  division    String // Dhaka / Khulna\n  postCode    String? @map("post_code")\n\n  presentOf   StudentInformation[]  @relation("PresentAddress")\n  permanentOf StudentInformation[]  @relation("PermanentAddress")\n  guardians   GuardianInformation[]\n\n  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  @@map("addresses")\n  @@schema("academy")\n}\n\nmodel ParentInformation {\n  id        String             @id @default(uuid(7)) @db.Uuid\n  studentId String             @unique @map("student_id") @db.Uuid\n  student   StudentInformation @relation(fields: [studentId], references: [id], onDelete: Cascade)\n\n  fatherName       String  @map("father_name")\n  fatherOccupation String? @map("father_occupation")\n  fatherPhone      String? @map("father_phone")\n  motherName       String  @map("mother_name")\n  motherOccupation String? @map("mother_occupation")\n  motherPhone      String? @map("mother_phone")\n\n  @@map("parent_informations")\n  @@schema("academy")\n}\n\nmodel GuardianInformation {\n  id        String             @id @default(uuid(7)) @db.Uuid\n  studentId String             @unique @map("student_id") @db.Uuid\n  student   StudentInformation @relation(fields: [studentId], references: [id], onDelete: Cascade)\n\n  name      String\n  relation  String // father\n  phone     String\n  addressId String?  @map("address_id") @db.Uuid\n  address   Address? @relation(fields: [addressId], references: [id])\n\n  @@map("guardian_informations")\n  @@schema("academy")\n}\n\nmodel FamilyInformation {\n  id        String             @id @default(uuid(7)) @db.Uuid\n  studentId String             @unique @map("student_id") @db.Uuid\n  student   StudentInformation @relation(fields: [studentId], references: [id], onDelete: Cascade)\n\n  totalMembers Int @map("total_members") // 3\n  income       Int // 12000\n\n  @@map("family_informations")\n  @@schema("academy")\n}\n\nmodel Education {\n  id        String             @id @default(uuid(7)) @db.Uuid\n  studentId String             @unique @map("student_id") @db.Uuid\n  student   StudentInformation @relation(fields: [studentId], references: [id], onDelete: Cascade)\n\n  qualification String // Bachelor of Business Administration (BBA)\n  passingYear   Int    @map("passing_year") // 2023\n  result        String // "2.94" / "GPA 5.00" / "1st Class"\n  institution   String // Savar Govt. university College\n\n  @@map("educations")\n  @@schema("academy")\n}\n\n// One row per student enrollment. The composite FK rejects a shift that is not\n// active for the chosen batch (e.g. Graphic Design batch 1 only has A and D).\nmodel StudentTrade {\n  id        String             @id @default(uuid(7)) @db.Uuid\n  studentId String             @map("student_id") @db.Uuid\n  student   StudentInformation @relation(fields: [studentId], references: [id], onDelete: Cascade)\n\n  tradeId String @map("trade_id") @db.Uuid\n  trade   Trade  @relation(fields: [tradeId], references: [id])\n\n  batchId      String     @map("batch_id") @db.Uuid\n  tradeShiftId String     @map("trade_shift_id") @db.Uuid\n  batchShift   BatchShift @relation(fields: [batchId, tradeShiftId], references: [batchId, tradeShiftId])\n\n  status ApprovalStatus     @default(PENDING)\n  result ExaminationResult?\n\n  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  @@unique([studentId, batchId])\n  @@index([tradeId])\n  @@map("student_trades")\n  @@schema("academy")\n}\n\nmodel ExaminationResult {\n  id             String       @id @default(uuid(7)) @db.Uuid\n  studentTradeId String       @unique @map("student_trade_id") @db.Uuid\n  studentTrade   StudentTrade @relation(fields: [studentTradeId], references: [id], onDelete: Cascade)\n\n  theory     Int @default(0) // 70\n  practical  Int @default(0) // 90\n  viva       Int @default(0) // 20\n  totalMarks Int @default(0) @map("total_marks") // 180\n\n  attendedDays Int @default(0) @map("attended_days") // 40\n  totalDays    Int @default(0) @map("total_days") // 42\n\n  certificateSl String?      @unique @map("certificate_sl") // 6688\n  finalGrade    String?      @map("final_grade") // A+\n  status        ResultStatus @default(DRAFT)\n\n  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  @@map("examination_results")\n  @@schema("academy")\n}\n\nmodel StudentRemark {\n  id        String   @id @default(uuid(7)) @db.Uuid\n  studentId String   @map("student_id") @db.Uuid\n  text      String\n  authorId  String?  @map("author_id") @db.Uuid\n  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz\n\n  student StudentInformation @relation(fields: [studentId], references: [id], onDelete: Cascade)\n  author  User?              @relation("StudentRemarkAuthor", fields: [authorId], references: [id], onDelete: SetNull)\n\n  @@index([studentId, createdAt(sort: Desc)])\n  @@map("student_remarks")\n  @@schema("academy")\n}\n\nmodel Course {\n  id            String    @id @default(uuid(7)) @db.Uuid\n  slug          String    @unique\n  title         String\n  description   String?\n  thumbnailUrl  String?   @map("thumbnail_url")\n  isPublished   Boolean   @default(false) @map("is_published")\n  tradeId       String?   @map("trade_id") @db.Uuid\n  createdById   String?   @map("created_by_id") @db.Uuid\n  legacyMongoId String?   @unique @map("legacy_mongo_id") @db.Char(24)\n  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz\n  deletedAt     DateTime? @map("deleted_at") @db.Timestamptz\n\n  trade       Trade?             @relation(fields: [tradeId], references: [id])\n  createdBy   User?              @relation("CourseCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)\n  modules     CourseModule[]\n  assignments CourseAssignment[]\n  feedback    StudentFeedback[]\n  feePlans    FeePlan[]\n\n  @@index([isPublished])\n  @@index([tradeId])\n  @@map("courses")\n  @@schema("academy")\n}\n\nmodel CourseModule {\n  id            String  @id @default(uuid(7)) @db.Uuid\n  courseId      String  @map("course_id") @db.Uuid\n  title         String\n  milestone     Int     @default(1)\n  sortOrder     Int     @default(0) @map("sort_order")\n  legacyMongoId String? @map("legacy_mongo_id") @db.Char(24)\n\n  course Course        @relation(fields: [courseId], references: [id], onDelete: Cascade)\n  videos CourseVideo[]\n\n  @@index([courseId, sortOrder])\n  @@map("course_modules")\n  @@schema("academy")\n}\n\nmodel CourseVideo {\n  id              String  @id @default(uuid(7)) @db.Uuid\n  moduleId        String  @map("module_id") @db.Uuid\n  title           String\n  youtubeVideoId  String  @map("youtube_video_id")\n  durationSeconds Int?    @map("duration_seconds")\n  sortOrder       Int     @default(0) @map("sort_order")\n  legacyMongoId   String? @map("legacy_mongo_id") @db.Char(24) // to map legacy users.unlockedVideos/videoProgress\n\n  module   CourseModule    @relation(fields: [moduleId], references: [id], onDelete: Cascade)\n  unlocks  VideoUnlock[]\n  progress VideoProgress[]\n\n  @@index([moduleId, sortOrder])\n  @@map("course_videos")\n  @@schema("academy")\n}\n\nmodel CourseAssignment {\n  userId       String   @map("user_id") @db.Uuid\n  courseId     String   @map("course_id") @db.Uuid\n  assignedById String?  @map("assigned_by_id") @db.Uuid\n  assignedAt   DateTime @default(now()) @map("assigned_at") @db.Timestamptz\n\n  user       User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n  course     Course @relation(fields: [courseId], references: [id], onDelete: Cascade)\n  assignedBy User?  @relation("CourseAssignmentAssignedBy", fields: [assignedById], references: [id], onDelete: SetNull)\n\n  @@id([userId, courseId])\n  @@index([courseId])\n  @@map("course_assignments")\n  @@schema("academy")\n}\n\nmodel VideoUnlock {\n  userId       String   @map("user_id") @db.Uuid\n  videoId      String   @map("video_id") @db.Uuid\n  unlockedById String?  @map("unlocked_by_id") @db.Uuid\n  unlockedAt   DateTime @default(now()) @map("unlocked_at") @db.Timestamptz\n\n  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)\n  video      CourseVideo @relation(fields: [videoId], references: [id], onDelete: Cascade)\n  unlockedBy User?       @relation("VideoUnlockGrantedBy", fields: [unlockedById], references: [id], onDelete: SetNull)\n\n  @@id([userId, videoId])\n  @@map("video_unlocks")\n  @@schema("academy")\n}\n\nmodel VideoProgress {\n  // no percent column (derived); no courseId (video \u2192 module \u2192 course)\n  userId         String   @map("user_id") @db.Uuid\n  videoId        String   @map("video_id") @db.Uuid\n  watchedSeconds Int      @default(0) @map("watched_seconds")\n  lastPosition   Int      @default(0) @map("last_position")\n  completed      Boolean  @default(false) // service sets true when percent >= 90\n  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  user  User        @relation(fields: [userId], references: [id], onDelete: Cascade)\n  video CourseVideo @relation(fields: [videoId], references: [id], onDelete: Cascade)\n\n  @@id([userId, videoId])\n  @@index([videoId])\n  @@map("video_progress")\n  @@schema("academy")\n}\n\n// Multi-file schema \u2014 design \xA75 (deviation D2).\n// The datasource URL lives in prisma.config.ts (Prisma 7), not here.\ngenerator client {\n  provider = "prisma-client"\n  output   = "../../src/generated"\n}\n\ndatasource db {\n  provider = "postgresql"\n  schemas  = ["identity", "academy", "billing", "content", "media", "jobs"]\n}\n\n// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 BILLING (module of 02-academy) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Models verbatim from design \xA75. Service 02-academy owns this schema.\n\n// Enums live in enum.prisma (single enum file) \u2014 do not declare enums here.\n\nmodel FeePlan {\n  // "how much money" is written exactly once; a payment only carries the plan ID\n  id          String      @id @default(uuid(7)) @db.Uuid\n  kind        PaymentKind // ADMISSION_FEE | COURSE_FEE (not DONATION; CHECK)\n  name        String\n  amount      Decimal     @db.Decimal(12, 2)\n  currency    String      @default("BDT") @db.Char(3)\n  batchId     String?     @map("batch_id") @db.Uuid // ADMISSION_FEE: a specific batch; null = all batches\n  courseId    String?     @map("course_id") @db.Uuid // COURSE_FEE: mandatory (CHECK)\n  isActive    Boolean     @default(true) @map("is_active")\n  createdById String?     @map("created_by_id") @db.Uuid\n  createdAt   DateTime    @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt   DateTime    @updatedAt @map("updated_at") @db.Timestamptz\n\n  batch     Batch?    @relation(fields: [batchId], references: [id])\n  course    Course?   @relation(fields: [courseId], references: [id])\n  createdBy User?     @relation("FeePlanCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)\n  payments  Payment[]\n\n  @@index([kind, isActive])\n  @@map("fee_plans")\n  @@schema("billing")\n}\n\nmodel Payment {\n  id               String         @id @default(uuid(7)) @db.Uuid\n  kind             PaymentKind\n  status           PaymentStatus  @default(PENDING)\n  gateway          PaymentGateway\n  method           PaymentMethod?\n  studentId        String?        @map("student_id") @db.Uuid // ADMISSION_FEE / COURSE_FEE \u2014 payer = student.user (derived)\n  userId           String?        @map("user_id") @db.Uuid // DONATION only\n  feePlanId        String?        @map("fee_plan_id") @db.Uuid // fees only; course/batch derived from here\n  amount           Decimal        @db.Decimal(12, 2) // snapshot (historical, not a duplicate)\n  currency         String         @default("BDT") @db.Char(3)\n  isAnonymous      Boolean        @default(false) @map("is_anonymous") // DONATION: hide name in public lists\n  gatewaySessionId String?        @map("gateway_session_id") // checkout session / gateway payment session\n  gatewayPaymentId String?        @map("gateway_payment_id") // gateway\'s final transaction id\n  receiptNo        String?        @unique @map("receipt_no") // for fees = MR number, issued by the moderator at verification (not auto); auto receipt for DONATION\n  receivedById     String?        @map("received_by_id") @db.Uuid // staff who entered the offline/manual payment\n  verifiedById     String?        @map("verified_by_id") @db.Uuid // MODERATOR/ADMIN who verified the payment and issued the MR number\n  verifiedAt       DateTime?      @map("verified_at") @db.Timestamptz\n  expiresAt        DateTime?      @map("expires_at") @db.Timestamptz\n  paidAt           DateTime?      @map("paid_at") @db.Timestamptz\n  createdAt        DateTime       @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt        DateTime       @updatedAt @map("updated_at") @db.Timestamptz\n\n  student    StudentInformation? @relation(fields: [studentId], references: [id])\n  user       User?               @relation(fields: [userId], references: [id])\n  feePlan    FeePlan?            @relation(fields: [feePlanId], references: [id])\n  receivedBy User?               @relation("PaymentReceivedBy", fields: [receivedById], references: [id], onDelete: SetNull)\n  verifiedBy User?               @relation("PaymentVerifiedBy", fields: [verifiedById], references: [id], onDelete: SetNull)\n  refunds    PaymentRefund[]\n\n  @@unique([gateway, gatewaySessionId])\n  @@unique([gateway, gatewayPaymentId])\n  @@index([studentId, status])\n  @@index([userId, status])\n  @@index([kind, status, paidAt(sort: Desc)])\n  @@map("payments")\n  @@schema("billing")\n}\n\nmodel PaymentRefund {\n  id              String   @id @default(uuid(7)) @db.Uuid\n  paymentId       String   @map("payment_id") @db.Uuid\n  amount          Decimal  @db.Decimal(12, 2)\n  reason          String?\n  gatewayRefundId String?  @map("gateway_refund_id")\n  createdById     String?  @map("created_by_id") @db.Uuid\n  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz\n\n  payment   Payment @relation(fields: [paymentId], references: [id], onDelete: Restrict)\n  createdBy User?   @relation("PaymentRefundCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)\n\n  @@index([paymentId])\n  @@map("payment_refunds")\n  @@schema("billing")\n}\n\nmodel GatewayCustomer {\n  // gateway customer id; name/email are NOT kept here (they live in users)\n  userId      String         @map("user_id") @db.Uuid\n  gateway     PaymentGateway\n  customerRef String         @map("customer_ref")\n  createdAt   DateTime       @default(now()) @map("created_at") @db.Timestamptz\n\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@id([userId, gateway])\n  @@unique([gateway, customerRef])\n  @@map("gateway_customers")\n  @@schema("billing")\n}\n\nmodel GatewayEvent {\n  // webhook idempotency: the same event is never processed twice\n  gateway     PaymentGateway\n  eventId     String         @map("event_id")\n  type        String\n  receivedAt  DateTime       @default(now()) @map("received_at") @db.Timestamptz\n  processedAt DateTime?      @map("processed_at") @db.Timestamptz\n\n  @@id([gateway, eventId])\n  @@map("gateway_events")\n  @@schema("billing")\n}\n\n// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 CONTENT (03) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Models verbatim from design \xA75. Service 03-content owns this schema.\n\nmodel Headline {\n  id        String   @id @default(uuid(7)) @db.Uuid\n  titleBn   String   @map("title_bn")\n  titleEn   String   @map("title_en")\n  isActive  Boolean  @default(true) @map("is_active")\n  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  @@map("headlines")\n  @@schema("content")\n}\n\nmodel Banner {\n  id            String   @id @default(uuid(7)) @db.Uuid\n  imageUrl      String   @map("image_url")\n  imagePublicId String?  @map("image_public_id")\n  title         String?\n  isActive      Boolean  @default(true) @map("is_active")\n  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  @@index([isActive])\n  @@map("banners")\n  @@schema("content")\n}\n\nmodel News {\n  id            String    @id @default(uuid(7)) @db.Uuid\n  title         String\n  description   String?\n  publishedOn   DateTime? @map("published_on") @db.Date\n  imageUrl      String?   @map("image_url")\n  imagePublicId String?   @map("image_public_id")\n  isActive      Boolean   @default(true) @map("is_active")\n  createdById   String?   @map("created_by_id") @db.Uuid\n  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz\n\n  createdBy User? @relation("NewsCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)\n\n  @@index([isActive, createdAt(sort: Desc)])\n  @@map("news")\n  @@schema("content")\n}\n\n// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 ALL ENUMS (single file) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Every enum in the database lives here so the shared vocabulary is visible in\n// one place. Prisma does not nest enums per schema \u2014 only the @@schema\n// attribute decides which Postgres schema an enum is created in, so each enum\n// below keeps the schema it belongs to.\n//\n// Models must NOT declare enums anymore; add new enums to this file.\n\n// \u2500\u2500 IDENTITY (01) \u2500\u2500\n\nenum Role {\n  ADMIN\n  MODERATOR\n  TRAINER\n  ACCOUNTS\n  JP_MO\n  STUDENT\n\n  @@schema("identity")\n}\n\nenum UserStatus {\n  PENDING\n  ACTIVE\n  REJECTED\n  BLOCKED\n\n  @@schema("identity")\n}\n\nenum Gender {\n  MALE\n  FEMALE\n  OTHER\n\n  @@schema("identity")\n}\n\nenum AddressKind {\n  PRESENT\n  PERMANENT\n\n  @@schema("identity")\n}\n\nenum AuthTokenPurpose {\n  VERIFY_EMAIL\n  RESET_PASSWORD\n\n  @@schema("identity")\n}\n\n// \u2500\u2500 ACADEMY (02) \u2500\u2500\n\n/**\n * StudentTrade approval (one enrollment per student + batch).\n */\nenum ApprovalStatus {\n  PENDING\n  APPROVED\n  REJECTED\n\n  @@schema("academy")\n}\n\n/**\n * ExaminationResult publication state.\n */\nenum ResultStatus {\n  DRAFT\n  PUBLISHED\n\n  @@schema("academy")\n}\n\n// \u2500\u2500 BILLING (module of 02-academy) \u2500\u2500\n\nenum PaymentKind {\n  ADMISSION_FEE\n  COURSE_FEE\n  DONATION\n\n  @@schema("billing")\n}\n\nenum PaymentStatus {\n  PENDING\n  SUCCEEDED\n  FAILED\n  CANCELED\n  REFUNDED\n  PARTIALLY_REFUNDED\n\n  @@schema("billing")\n}\n\nenum PaymentGateway {\n  STRIPE\n  SSLCOMMERZ\n  BKASH\n  NAGAD\n  MANUAL\n\n  @@schema("billing")\n}\n\nenum PaymentMethod {\n  CARD\n  MOBILE_BANKING\n  BANK_TRANSFER\n  CASH\n\n  @@schema("billing")\n}\n\n// \u2500\u2500 MEDIA (04) \u2500\u2500\n\nenum FeedbackStatus {\n  PENDING\n  APPROVED\n  REJECTED\n\n  @@schema("media")\n}\n\n// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 IDENTITY (01) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Models verbatim from design \xA75. Every column @map("snake_case"),\n// every model @@map("snake_case_plural"), every model/enum @@schema("identity").\n// Note (\u0998): every `*ById` column carries a real FK to identity.users with\n// onDelete: SetNull and a distinct relation name (back-relations listed on User).\n\n// Enums live in enum.prisma (single enum file) \u2014 do not declare enums here.\n\nmodel User {\n  id              String     @id @default(uuid(7)) @db.Uuid\n  email           String     @unique // always lowercase+trim (Zod transform)\n  name            String?\n  avatarUrl       String?    @map("avatar_url")\n  avatarPublicId  String?    @map("avatar_public_id") // for Cloudinary delete\n  phone           String?\n  dateOfBirth     DateTime?  @map("date_of_birth") @db.Date\n  gender          Gender?\n  bloodGroup      String?    @map("blood_group")\n  nidOrBirthNo    String?    @map("nid_or_birth_no") // students.nid_birth + users.nid merged into one column\n  role            Role       @default(STUDENT)\n  status          UserStatus @default(PENDING)\n  passwordHash    String?    @map("password_hash") // null = Google-only / migrated\n  googleSub       String?    @unique @map("google_sub")\n  emailVerifiedAt DateTime?  @map("email_verified_at") @db.Timestamptz\n  lastLoginAt     DateTime?  @map("last_login_at") @db.Timestamptz\n  approvedById    String?    @map("approved_by_id") @db.Uuid // who approved/rejected the registration\n  approvedAt      DateTime?  @map("approved_at") @db.Timestamptz\n  statusReason    String?    @map("status_reason") // reason for REJECTED/BLOCKED\n  legacyMongoId   String?    @unique @map("legacy_mongo_id") @db.Char(24)\n  createdAt       DateTime   @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt       DateTime   @updatedAt @map("updated_at") @db.Timestamptz\n  deletedAt       DateTime?  @map("deleted_at") @db.Timestamptz\n\n  addresses        UserAddress[]\n  employee         EmployeeProfile?\n  refreshTokens    RefreshToken[]\n  authTokens       AuthToken[]\n  trainerTrades    TrainerTrade[]\n  assignments      CourseAssignment[]\n  unlocks          VideoUnlock[]\n  progress         VideoProgress[]\n  gatewayCustomers GatewayCustomer[]\n  applicantTrade   ApplicantTrade?\n  studentTraining  StudentTraining?\n  donations        Payment[]\n  feedback         StudentFeedback[]\n\n  // self relation \u2014 who approved this user\n  approvedBy    User?  @relation("UserApprovedBy", fields: [approvedById], references: [id], onDelete: SetNull)\n  approvedUsers User[] @relation("UserApprovedBy")\n\n  // *ById FKs from other schemas (design \xA75 note \u0998) \u2014 back-relations\n  remarksAuthored         StudentRemark[]    @relation("StudentRemarkAuthor")\n  coursesCreated          Course[]           @relation("CourseCreatedBy")\n  assignmentsMade         CourseAssignment[] @relation("CourseAssignmentAssignedBy")\n  unlocksGranted          VideoUnlock[]      @relation("VideoUnlockGrantedBy")\n  feePlansCreated         FeePlan[]          @relation("FeePlanCreatedBy")\n  paymentsReceived        Payment[]          @relation("PaymentReceivedBy")\n  paymentsVerified        Payment[]          @relation("PaymentVerifiedBy")\n  refundsCreated          PaymentRefund[]    @relation("PaymentRefundCreatedBy")\n  newsCreated             News[]             @relation("NewsCreatedBy")\n  videoGalleriesCreated   VideoGallery[]     @relation("VideoGalleryCreatedBy")\n  pictureGalleriesCreated PictureGallery[]   @relation("PictureGalleryCreatedBy")\n  storiesCreated          SuccessStory[]     @relation("SuccessStoryCreatedBy")\n  designationsCreated     Designation[]      @relation("DesignationCreatedBy")\n  workplacesCreated       Workplace[]        @relation("WorkplaceCreatedBy")\n  jobHoldersCreated       JobHolder[]        @relation("JobHolderCreatedBy")\n\n  @@index([role, status])\n  @@index([nidOrBirthNo])\n  @@index([phone])\n  @@index([createdAt(sort: Desc)])\n  @@map("users")\n  @@schema("identity")\n}\n\nmodel UserAddress {\n  id       String      @id @default(uuid(7)) @db.Uuid\n  userId   String      @map("user_id") @db.Uuid\n  kind     AddressKind\n  address  String?\n  division String?\n  district String?\n  upazila  String?\n  union    String?     @map("union")\n  user     User        @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@unique([userId, kind])\n  @@map("user_addresses")\n  @@schema("identity")\n}\n\nmodel EmployeeProfile {\n  userId         String    @id @map("user_id") @db.Uuid\n  identityCardNo String?   @unique @map("identity_card_no")\n  designation    String?\n  joiningDate    DateTime? @map("joining_date") @db.Date\n  dateOfIssue    DateTime? @map("date_of_issue") @db.Date\n  salary         Decimal?  @db.Decimal(12, 2)\n  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@map("employee_profiles")\n  @@schema("identity")\n}\n\nmodel RefreshToken {\n  id        String    @id @default(uuid(7)) @db.Uuid\n  userId    String    @map("user_id") @db.Uuid\n  tokenHash String    @unique @map("token_hash") // SHA-256; raw token never stored\n  familyId  String    @map("family_id") @db.Uuid // rotation reuse-detection\n  expiresAt DateTime  @map("expires_at") @db.Timestamptz\n  revokedAt DateTime? @map("revoked_at") @db.Timestamptz\n  userAgent String?   @map("user_agent")\n  ip        String?\n  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz\n  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@index([userId])\n  @@index([familyId])\n  @@map("refresh_tokens")\n  @@schema("identity")\n}\n\nmodel AuthToken {\n  id        String           @id @default(uuid(7)) @db.Uuid\n  userId    String           @map("user_id") @db.Uuid\n  purpose   AuthTokenPurpose\n  tokenHash String           @unique @map("token_hash")\n  expiresAt DateTime         @map("expires_at") @db.Timestamptz\n  usedAt    DateTime?        @map("used_at") @db.Timestamptz\n  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@index([userId, purpose])\n  @@map("auth_tokens")\n  @@schema("identity")\n}\n\nmodel AuditLog {\n  // append-only; every service INSERTs, nobody updates or deletes\n  id        BigInt   @id @default(autoincrement())\n  actorId   String?  @map("actor_id") @db.Uuid // deliberately NOT an FK (log survives user deletion)\n  service   String\n  action    String // e.g. "student.status.update"\n  entity    String\n  entityId  String   @map("entity_id")\n  diff      Json?\n  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz\n\n  @@index([entity, entityId])\n  @@index([actorId, createdAt(sort: Desc)])\n  @@map("audit_logs")\n  @@schema("identity")\n}\n\n// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 JOBS (05) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Models verbatim from design \xA75. Service 05-jobs owns this schema.\n\n// Designations are trade-wise: a trade is chosen directly (the academy schema\n// already owns the trade catalogue), so there is no separate category layer.\nmodel Designation {\n  id          String   @id @default(uuid(7)) @db.Uuid\n  tradeId     String   @map("trade_id") @db.Uuid\n  name        String\n  isActive    Boolean  @default(true) @map("is_active")\n  createdById String?  @map("created_by_id") @db.Uuid\n  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  trade      Trade       @relation(fields: [tradeId], references: [id], onDelete: Cascade)\n  createdBy  User?       @relation("DesignationCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)\n  jobHolders JobHolder[]\n\n  @@unique([tradeId, name]) // + lower(name) case-insensitive index \u2192 raw SQL\n  @@map("designations")\n  @@schema("jobs")\n}\n\nmodel Workplace {\n  id          String   @id @default(uuid(7)) @db.Uuid\n  name        String // lower(name) unique \u2192 raw SQL\n  address     String\n  contact     String?\n  createdById String?  @map("created_by_id") @db.Uuid\n  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  createdBy  User?       @relation("WorkplaceCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)\n  jobHolders JobHolder[]\n\n  @@map("workplaces")\n  @@schema("jobs")\n}\n\n// A job holder is always the employment record of one student. Person data\n// (name, gender, trade, donor, photo source) lives only on the student side;\n// workplace address lives only on the workplace. Nothing is copied here.\nmodel JobHolder {\n  id            String   @id @default(uuid(7)) @db.Uuid\n  studentId     String   @unique @map("student_id") @db.Uuid\n  photoUrl      String?  @map("photo_url")\n  designationId String?  @map("designation_id") @db.Uuid\n  workplaceId   String?  @map("workplace_id") @db.Uuid\n  salary        Decimal? @db.Decimal(12, 2)\n  createdById   String?  @map("created_by_id") @db.Uuid\n  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  student     StudentInformation @relation(fields: [studentId], references: [id], onDelete: Restrict)\n  designation Designation?       @relation(fields: [designationId], references: [id], onDelete: Restrict)\n  workplace   Workplace?         @relation(fields: [workplaceId], references: [id])\n  createdBy   User?              @relation("JobHolderCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)\n\n  @@index([designationId])\n  @@index([workplaceId])\n  @@map("job_holders")\n  @@schema("jobs")\n}\n\n// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 MEDIA (04) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Models verbatim from design \xA75. Service 04-media owns this schema.\n\n// Enums live in enum.prisma (single enum file) \u2014 do not declare enums here.\n\nmodel VideoGallery {\n  id             String   @id @default(uuid(7)) @db.Uuid\n  title          String\n  tradeId        String?  @map("trade_id") @db.Uuid\n  youtubeVideoId String   @map("youtube_video_id")\n  isActive       Boolean  @default(true) @map("is_active")\n  createdById    String?  @map("created_by_id") @db.Uuid\n  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  trade     Trade? @relation(fields: [tradeId], references: [id], onDelete: SetNull)\n  createdBy User?  @relation("VideoGalleryCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)\n\n  @@index([tradeId])\n  @@index([isActive, createdAt(sort: Desc)])\n  @@map("video_galleries")\n  @@schema("media")\n}\n\nmodel PictureGallery {\n  id            String   @id @default(uuid(7)) @db.Uuid\n  title         String?\n  tradeId       String?  @map("trade_id") @db.Uuid\n  imageUrl      String   @map("image_url")\n  imagePublicId String?  @map("image_public_id")\n  isActive      Boolean  @default(true) @map("is_active")\n  createdById   String?  @map("created_by_id") @db.Uuid\n  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  trade     Trade? @relation(fields: [tradeId], references: [id], onDelete: SetNull)\n  createdBy User?  @relation("PictureGalleryCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)\n\n  @@index([tradeId])\n  @@index([isActive, createdAt(sort: Desc)])\n  @@map("picture_galleries")\n  @@schema("media")\n}\n\nmodel StudentFeedback {\n  // author = user_id; name/photo joined from users\n  id               String         @id @default(uuid(7)) @db.Uuid\n  userId           String?        @map("user_id") @db.Uuid // mandatory for new records (Zod); null only for legacy\n  courseId         String?        @map("course_id") @db.Uuid\n  tradeId          String?        @map("trade_id") @db.Uuid\n  legacyAuthorName String?        @map("legacy_author_name") // migrated legacy records only; new code must never write it\n  rating           Int?           @db.SmallInt // CHECK 1..5 (raw SQL)\n  comment          String?\n  extra            Json? // unknown fields from the legacy strict:false schema; promote to columns after the survey\n  status           FeedbackStatus @default(PENDING)\n  createdAt        DateTime       @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt        DateTime       @updatedAt @map("updated_at") @db.Timestamptz\n\n  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)\n  course Course? @relation(fields: [courseId], references: [id], onDelete: SetNull)\n  trade  Trade?  @relation(fields: [tradeId], references: [id], onDelete: SetNull)\n\n  @@index([courseId])\n  @@index([tradeId])\n  @@index([userId])\n  @@index([status, createdAt(sort: Desc)])\n  @@map("student_feedback")\n  @@schema("media")\n}\n\nmodel SuccessStory {\n  // when student_id is set, name/photo/trade come from users+batch (CHECK)\n  id            String   @id @default(uuid(7)) @db.Uuid\n  studentId     String?  @map("student_id") @db.Uuid\n  nameBn        String?  @map("name_bn") // local: mandatory when student_id is NULL\n  imageUrl      String?  @map("image_url") // local\n  imagePublicId String?  @map("image_public_id")\n  tradeId       String?  @map("trade_id") @db.Uuid // local\n  nameEn        String?  @map("name_en") // translation \u2014 may exist even with a student (not a duplicate)\n  roleBn        String?  @map("role_bn")\n  roleEn        String?  @map("role_en")\n  quoteBn       String?  @map("quote_bn")\n  quoteEn       String?  @map("quote_en")\n  sortOrder     Int      @default(0) @map("sort_order")\n  isActive      Boolean  @default(true) @map("is_active")\n  createdById   String?  @map("created_by_id") @db.Uuid\n  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz\n\n  student   StudentInformation? @relation(fields: [studentId], references: [id], onDelete: SetNull)\n  trade     Trade?              @relation(fields: [tradeId], references: [id])\n  createdBy User?               @relation("SuccessStoryCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)\n\n  @@index([isActive, sortOrder])\n  @@map("success_stories")\n  @@schema("media")\n}\n\n// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 TRADE (shared across every section) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Universal trade catalogue derived from the frontend data (public/trades.json).\n// This file is the single source of truth for Trade / TradeInfo / TradeShift /\n// Batch / BatchShift. Other domain files must NOT redefine them \u2014 they only link\n// to them (Course, TrainerTrade, ApplicantTrade, JobHolder, SuccessStory,\n// Student, FeePlan). Owned by academy, reused by jobs, media and billing.\n//\n// House rules (same as the rest of prisma/schema):\n//   every column @map("snake_case"), every model @@map("snake_case_plural"),\n//   every model @@schema("academy").\n//\n// RECONCILIATION NOTE: the running API/migrations still use the legacy trade\n// and batch columns (`name_bn`, `name_en`, `is_active`, `batch_number`,\n// `batch_code`, `shift`, the admission window and `donor_id`). Those columns\n// therefore stay on the models. The richer catalogue columns (`trade_name`,\n// `image`, `fee`, `batch_no`, ...) are additive and optional/defaulted so a\n// future migration can promote them without breaking existing rows.\n\nmodel Trade {\n  id       String  @id @default(uuid(7)) @db.Uuid\n  code     String  @unique // "01", "02" ...\n  nameBn   String? @map("name_bn") // current admin label (Bangla)\n  nameEn   String  @map("name_en") // current admin label (English)\n  isActive Boolean @default(true) @map("is_active")\n\n  tradeName String? @map("trade_name") // "Electrical House Wiring"\n  image     String?\n  details   String  @default("")\n  detailsEn String  @default("") @map("details_en")\n  mobile    String? // separate from details \u2014 own column\n  fee       Int     @default(0)\n  feeUnit   String  @default("BDT") @map("fee_unit")\n\n  weeklyClassBn String @default("") @map("weekly_class_bn")\n  weeklyClassEn String @default("") @map("weekly_class_en")\n  weekendBn     String @default("") @map("weekend_bn")\n  weekendEn     String @default("") @map("weekend_en")\n  batchTypeBn   String @default("") @map("batch_type_bn") // "\u09A8\u09BF\u09AF\u09BC\u09AE\u09BF\u09A4 \u09AC\u09CD\u09AF\u09BE\u099A"\n  batchTypeEn   String @default("") @map("batch_type_en") // "Regular Batch"\n\n  info    TradeInfo?\n  shifts  TradeShift[]\n  batches Batch[]\n\n  // back-relations from the other sections\n  courses          Course[]\n  trainerTrades    TrainerTrade[]\n  applicants       ApplicantTrade[]\n  designations     Designation[]\n  stories          SuccessStory[]\n  pictureGalleries PictureGallery[]\n  videoGalleries   VideoGallery[]\n  feedbacks        StudentFeedback[]\n  trainings        StudentTraining[]\n  studentTrades    StudentTrade[]\n\n  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz\n  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz\n\n  @@map("trades")\n  @@schema("academy")\n}\n\nmodel TradeInfo {\n  id      String @id @default(uuid(7)) @db.Uuid\n  tradeId String @unique @map("trade_id") @db.Uuid\n\n  isBteb       Boolean @default(false) @map("is_bteb")\n  seats        Int // 20\n  durationDays Int     @map("duration_days") // 60, 45, 90, 120\n  durationBn   String  @map("duration_bn") // "\u09E8 \u09AE\u09BE\u09B8"\n  durationEn   String  @map("duration_en") // "2 months"\n  dailyHours   Int     @map("daily_hours") // 4 or 2\n  routineBn    String  @map("routine_bn")\n  routineEn    String  @map("routine_en")\n\n  minGrade        Int    @map("min_grade") // 5 or 8\n  qualificationBn String @map("qualification_bn")\n  qualificationEn String @map("qualification_en")\n\n  trade Trade @relation(fields: [tradeId], references: [id], onDelete: Cascade)\n\n  @@map("trade_infos")\n  @@schema("academy")\n}\n\nmodel TradeShift {\n  id      String @id @default(uuid(7)) @db.Uuid\n  tradeId String @map("trade_id") @db.Uuid\n\n  code      String // "A", "B", "C" ...\n  startTime String @map("start_time") // "09:00"\n  endTime   String @map("end_time") // "13:00" (24h)\n\n  trade       Trade             @relation(fields: [tradeId], references: [id], onDelete: Cascade)\n  batchShifts BatchShift[]\n  trainings   StudentTraining[]\n\n  @@unique([tradeId, code])\n  @@map("trade_shifts")\n  @@schema("academy")\n}\n\nmodel Batch {\n  id      String @id @default(uuid(7)) @db.Uuid\n  tradeId String @map("trade_id") @db.Uuid\n\n  // legacy/current columns used by the running API\n  batchNumber       String    @map("batch_number") // "5", "05" \u2014 text (legacy data is mixed)\n  batchCode         String    @unique @map("batch_code") // "05-A-2026"\n  shift             String? // batch level shift label; a student can override it\n  startDate         DateTime? @map("start_date") @db.Date\n  endDate           DateTime? @map("end_date") @db.Date\n  admissionOpensAt  DateTime? @map("admission_opens_at") @db.Timestamptz // which batch shows on the admission form\n  admissionClosesAt DateTime? @map("admission_closes_at") @db.Timestamptz\n  donorId           String?   @map("donor_id") @db.Uuid\n\n  // richer catalogue fields (additive, optional until migrated)\n  nameBn String? @map("name_bn") // "\u09E7\u09AE \u09AC\u09CD\u09AF\u09BE\u099A"\n  nameEn String? @map("name_en") // "1st Batch"\n\n  trade     Trade             @relation(fields: [tradeId], references: [id], onDelete: Cascade)\n  donor     Donor?            @relation(fields: [donorId], references: [id])\n  shifts    BatchShift[]\n  feePlans  FeePlan[]\n  trainings StudentTraining[]\n\n  @@index([tradeId, batchNumber])\n  @@index([startDate, endDate])\n  @@map("batches")\n  @@schema("academy")\n}\n\nmodel BatchShift {\n  batchId      String @map("batch_id") @db.Uuid\n  tradeShiftId String @map("trade_shift_id") @db.Uuid\n\n  batch         Batch          @relation(fields: [batchId], references: [id], onDelete: Cascade)\n  tradeShift    TradeShift     @relation(fields: [tradeShiftId], references: [id], onDelete: Cascade)\n  studentTrades StudentTrade[]\n\n  @@id([batchId, tradeShiftId])\n  @@map("batch_shifts")\n  @@schema("academy")\n}\n',
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "parameterizationSchema": {
    "strings": [],
    "graph": ""
  }
};
config.runtimeDataModel = JSON.parse('{"models":{"Donor":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"batches","kind":"object","type":"Batch","relationName":"BatchToDonor"}],"dbName":"donors","schema":"academy"},"TrainerTrade":{"fields":[{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"user","kind":"object","type":"User","relationName":"TrainerTradeToUser"},{"name":"trade","kind":"object","type":"Trade","relationName":"TradeToTrainerTrade"}],"dbName":"trainer_trades","schema":"academy"},"ApplicantTrade":{"fields":[{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"user","kind":"object","type":"User","relationName":"ApplicantTradeToUser"},{"name":"trade","kind":"object","type":"Trade","relationName":"ApplicantTradeToTrade"}],"dbName":"applicant_trades","schema":"academy"},"StudentTraining":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"batchId","kind":"scalar","type":"String","dbName":"batch_id"},{"name":"shiftId","kind":"scalar","type":"String","dbName":"shift_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"user","kind":"object","type":"User","relationName":"StudentTrainingToUser"},{"name":"trade","kind":"object","type":"Trade","relationName":"StudentTrainingToTrade"},{"name":"batch","kind":"object","type":"Batch","relationName":"BatchToStudentTraining"},{"name":"shift","kind":"object","type":"TradeShift","relationName":"StudentTrainingToTradeShift"}],"dbName":"student_trainings","schema":"academy"},"StudentInformation":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"formNo","kind":"scalar","type":"String","dbName":"form_no"},{"name":"mrNo","kind":"scalar","type":"String","dbName":"mr_no"},{"name":"photo","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"gender","kind":"enum","type":"Gender"},{"name":"phone","kind":"scalar","type":"String"},{"name":"nidOrBirthNo","kind":"scalar","type":"String","dbName":"nid_or_birth_no"},{"name":"birthDate","kind":"scalar","type":"DateTime","dbName":"birth_date"},{"name":"physicalDisability","kind":"scalar","type":"Boolean","dbName":"physical_disability"},{"name":"disabilityDetails","kind":"scalar","type":"String","dbName":"disability_details"},{"name":"presentAddressId","kind":"scalar","type":"String","dbName":"present_address_id"},{"name":"permanentAddressId","kind":"scalar","type":"String","dbName":"permanent_address_id"},{"name":"parent","kind":"object","type":"ParentInformation","relationName":"ParentInformationToStudentInformation"},{"name":"guardian","kind":"object","type":"GuardianInformation","relationName":"GuardianInformationToStudentInformation"},{"name":"family","kind":"object","type":"FamilyInformation","relationName":"FamilyInformationToStudentInformation"},{"name":"education","kind":"object","type":"Education","relationName":"EducationToStudentInformation"},{"name":"trades","kind":"object","type":"StudentTrade","relationName":"StudentInformationToStudentTrade"},{"name":"remarks","kind":"object","type":"StudentRemark","relationName":"StudentInformationToStudentRemark"},{"name":"payments","kind":"object","type":"Payment","relationName":"PaymentToStudentInformation"},{"name":"jobHolder","kind":"object","type":"JobHolder","relationName":"JobHolderToStudentInformation"},{"name":"stories","kind":"object","type":"SuccessStory","relationName":"StudentInformationToSuccessStory"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"deletedAt","kind":"scalar","type":"DateTime","dbName":"deleted_at"},{"name":"presentAddress","kind":"object","type":"Address","relationName":"PresentAddress"},{"name":"permanentAddress","kind":"object","type":"Address","relationName":"PermanentAddress"}],"dbName":"student_informations","schema":"academy"},"Address":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"addressLine","kind":"scalar","type":"String","dbName":"address_line"},{"name":"postOffice","kind":"scalar","type":"String","dbName":"post_office"},{"name":"upazila","kind":"scalar","type":"String"},{"name":"district","kind":"scalar","type":"String"},{"name":"division","kind":"scalar","type":"String"},{"name":"postCode","kind":"scalar","type":"String","dbName":"post_code"},{"name":"presentOf","kind":"object","type":"StudentInformation","relationName":"PresentAddress"},{"name":"permanentOf","kind":"object","type":"StudentInformation","relationName":"PermanentAddress"},{"name":"guardians","kind":"object","type":"GuardianInformation","relationName":"AddressToGuardianInformation"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"}],"dbName":"addresses","schema":"academy"},"ParentInformation":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"studentId","kind":"scalar","type":"String","dbName":"student_id"},{"name":"student","kind":"object","type":"StudentInformation","relationName":"ParentInformationToStudentInformation"},{"name":"fatherName","kind":"scalar","type":"String","dbName":"father_name"},{"name":"fatherOccupation","kind":"scalar","type":"String","dbName":"father_occupation"},{"name":"fatherPhone","kind":"scalar","type":"String","dbName":"father_phone"},{"name":"motherName","kind":"scalar","type":"String","dbName":"mother_name"},{"name":"motherOccupation","kind":"scalar","type":"String","dbName":"mother_occupation"},{"name":"motherPhone","kind":"scalar","type":"String","dbName":"mother_phone"}],"dbName":"parent_informations","schema":"academy"},"GuardianInformation":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"studentId","kind":"scalar","type":"String","dbName":"student_id"},{"name":"student","kind":"object","type":"StudentInformation","relationName":"GuardianInformationToStudentInformation"},{"name":"name","kind":"scalar","type":"String"},{"name":"relation","kind":"scalar","type":"String"},{"name":"phone","kind":"scalar","type":"String"},{"name":"addressId","kind":"scalar","type":"String","dbName":"address_id"},{"name":"address","kind":"object","type":"Address","relationName":"AddressToGuardianInformation"}],"dbName":"guardian_informations","schema":"academy"},"FamilyInformation":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"studentId","kind":"scalar","type":"String","dbName":"student_id"},{"name":"student","kind":"object","type":"StudentInformation","relationName":"FamilyInformationToStudentInformation"},{"name":"totalMembers","kind":"scalar","type":"Int","dbName":"total_members"},{"name":"income","kind":"scalar","type":"Int"}],"dbName":"family_informations","schema":"academy"},"Education":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"studentId","kind":"scalar","type":"String","dbName":"student_id"},{"name":"student","kind":"object","type":"StudentInformation","relationName":"EducationToStudentInformation"},{"name":"qualification","kind":"scalar","type":"String"},{"name":"passingYear","kind":"scalar","type":"Int","dbName":"passing_year"},{"name":"result","kind":"scalar","type":"String"},{"name":"institution","kind":"scalar","type":"String"}],"dbName":"educations","schema":"academy"},"StudentTrade":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"studentId","kind":"scalar","type":"String","dbName":"student_id"},{"name":"student","kind":"object","type":"StudentInformation","relationName":"StudentInformationToStudentTrade"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"trade","kind":"object","type":"Trade","relationName":"StudentTradeToTrade"},{"name":"batchId","kind":"scalar","type":"String","dbName":"batch_id"},{"name":"tradeShiftId","kind":"scalar","type":"String","dbName":"trade_shift_id"},{"name":"batchShift","kind":"object","type":"BatchShift","relationName":"BatchShiftToStudentTrade"},{"name":"status","kind":"enum","type":"ApprovalStatus"},{"name":"result","kind":"object","type":"ExaminationResult","relationName":"ExaminationResultToStudentTrade"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"}],"dbName":"student_trades","schema":"academy"},"ExaminationResult":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"studentTradeId","kind":"scalar","type":"String","dbName":"student_trade_id"},{"name":"studentTrade","kind":"object","type":"StudentTrade","relationName":"ExaminationResultToStudentTrade"},{"name":"theory","kind":"scalar","type":"Int"},{"name":"practical","kind":"scalar","type":"Int"},{"name":"viva","kind":"scalar","type":"Int"},{"name":"totalMarks","kind":"scalar","type":"Int","dbName":"total_marks"},{"name":"attendedDays","kind":"scalar","type":"Int","dbName":"attended_days"},{"name":"totalDays","kind":"scalar","type":"Int","dbName":"total_days"},{"name":"certificateSl","kind":"scalar","type":"String","dbName":"certificate_sl"},{"name":"finalGrade","kind":"scalar","type":"String","dbName":"final_grade"},{"name":"status","kind":"enum","type":"ResultStatus"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"}],"dbName":"examination_results","schema":"academy"},"StudentRemark":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"studentId","kind":"scalar","type":"String","dbName":"student_id"},{"name":"text","kind":"scalar","type":"String"},{"name":"authorId","kind":"scalar","type":"String","dbName":"author_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"student","kind":"object","type":"StudentInformation","relationName":"StudentInformationToStudentRemark"},{"name":"author","kind":"object","type":"User","relationName":"StudentRemarkAuthor"}],"dbName":"student_remarks","schema":"academy"},"Course":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"slug","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"description","kind":"scalar","type":"String"},{"name":"thumbnailUrl","kind":"scalar","type":"String","dbName":"thumbnail_url"},{"name":"isPublished","kind":"scalar","type":"Boolean","dbName":"is_published"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"createdById","kind":"scalar","type":"String","dbName":"created_by_id"},{"name":"legacyMongoId","kind":"scalar","type":"String","dbName":"legacy_mongo_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"deletedAt","kind":"scalar","type":"DateTime","dbName":"deleted_at"},{"name":"trade","kind":"object","type":"Trade","relationName":"CourseToTrade"},{"name":"createdBy","kind":"object","type":"User","relationName":"CourseCreatedBy"},{"name":"modules","kind":"object","type":"CourseModule","relationName":"CourseToCourseModule"},{"name":"assignments","kind":"object","type":"CourseAssignment","relationName":"CourseToCourseAssignment"},{"name":"feedback","kind":"object","type":"StudentFeedback","relationName":"CourseToStudentFeedback"},{"name":"feePlans","kind":"object","type":"FeePlan","relationName":"CourseToFeePlan"}],"dbName":"courses","schema":"academy"},"CourseModule":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"courseId","kind":"scalar","type":"String","dbName":"course_id"},{"name":"title","kind":"scalar","type":"String"},{"name":"milestone","kind":"scalar","type":"Int"},{"name":"sortOrder","kind":"scalar","type":"Int","dbName":"sort_order"},{"name":"legacyMongoId","kind":"scalar","type":"String","dbName":"legacy_mongo_id"},{"name":"course","kind":"object","type":"Course","relationName":"CourseToCourseModule"},{"name":"videos","kind":"object","type":"CourseVideo","relationName":"CourseModuleToCourseVideo"}],"dbName":"course_modules","schema":"academy"},"CourseVideo":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"moduleId","kind":"scalar","type":"String","dbName":"module_id"},{"name":"title","kind":"scalar","type":"String"},{"name":"youtubeVideoId","kind":"scalar","type":"String","dbName":"youtube_video_id"},{"name":"durationSeconds","kind":"scalar","type":"Int","dbName":"duration_seconds"},{"name":"sortOrder","kind":"scalar","type":"Int","dbName":"sort_order"},{"name":"legacyMongoId","kind":"scalar","type":"String","dbName":"legacy_mongo_id"},{"name":"module","kind":"object","type":"CourseModule","relationName":"CourseModuleToCourseVideo"},{"name":"unlocks","kind":"object","type":"VideoUnlock","relationName":"CourseVideoToVideoUnlock"},{"name":"progress","kind":"object","type":"VideoProgress","relationName":"CourseVideoToVideoProgress"}],"dbName":"course_videos","schema":"academy"},"CourseAssignment":{"fields":[{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"courseId","kind":"scalar","type":"String","dbName":"course_id"},{"name":"assignedById","kind":"scalar","type":"String","dbName":"assigned_by_id"},{"name":"assignedAt","kind":"scalar","type":"DateTime","dbName":"assigned_at"},{"name":"user","kind":"object","type":"User","relationName":"CourseAssignmentToUser"},{"name":"course","kind":"object","type":"Course","relationName":"CourseToCourseAssignment"},{"name":"assignedBy","kind":"object","type":"User","relationName":"CourseAssignmentAssignedBy"}],"dbName":"course_assignments","schema":"academy"},"VideoUnlock":{"fields":[{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"videoId","kind":"scalar","type":"String","dbName":"video_id"},{"name":"unlockedById","kind":"scalar","type":"String","dbName":"unlocked_by_id"},{"name":"unlockedAt","kind":"scalar","type":"DateTime","dbName":"unlocked_at"},{"name":"user","kind":"object","type":"User","relationName":"UserToVideoUnlock"},{"name":"video","kind":"object","type":"CourseVideo","relationName":"CourseVideoToVideoUnlock"},{"name":"unlockedBy","kind":"object","type":"User","relationName":"VideoUnlockGrantedBy"}],"dbName":"video_unlocks","schema":"academy"},"VideoProgress":{"fields":[{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"videoId","kind":"scalar","type":"String","dbName":"video_id"},{"name":"watchedSeconds","kind":"scalar","type":"Int","dbName":"watched_seconds"},{"name":"lastPosition","kind":"scalar","type":"Int","dbName":"last_position"},{"name":"completed","kind":"scalar","type":"Boolean"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"user","kind":"object","type":"User","relationName":"UserToVideoProgress"},{"name":"video","kind":"object","type":"CourseVideo","relationName":"CourseVideoToVideoProgress"}],"dbName":"video_progress","schema":"academy"},"FeePlan":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"kind","kind":"enum","type":"PaymentKind"},{"name":"name","kind":"scalar","type":"String"},{"name":"amount","kind":"scalar","type":"Decimal"},{"name":"currency","kind":"scalar","type":"String"},{"name":"batchId","kind":"scalar","type":"String","dbName":"batch_id"},{"name":"courseId","kind":"scalar","type":"String","dbName":"course_id"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"createdById","kind":"scalar","type":"String","dbName":"created_by_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"batch","kind":"object","type":"Batch","relationName":"BatchToFeePlan"},{"name":"course","kind":"object","type":"Course","relationName":"CourseToFeePlan"},{"name":"createdBy","kind":"object","type":"User","relationName":"FeePlanCreatedBy"},{"name":"payments","kind":"object","type":"Payment","relationName":"FeePlanToPayment"}],"dbName":"fee_plans","schema":"billing"},"Payment":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"kind","kind":"enum","type":"PaymentKind"},{"name":"status","kind":"enum","type":"PaymentStatus"},{"name":"gateway","kind":"enum","type":"PaymentGateway"},{"name":"method","kind":"enum","type":"PaymentMethod"},{"name":"studentId","kind":"scalar","type":"String","dbName":"student_id"},{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"feePlanId","kind":"scalar","type":"String","dbName":"fee_plan_id"},{"name":"amount","kind":"scalar","type":"Decimal"},{"name":"currency","kind":"scalar","type":"String"},{"name":"isAnonymous","kind":"scalar","type":"Boolean","dbName":"is_anonymous"},{"name":"gatewaySessionId","kind":"scalar","type":"String","dbName":"gateway_session_id"},{"name":"gatewayPaymentId","kind":"scalar","type":"String","dbName":"gateway_payment_id"},{"name":"receiptNo","kind":"scalar","type":"String","dbName":"receipt_no"},{"name":"receivedById","kind":"scalar","type":"String","dbName":"received_by_id"},{"name":"verifiedById","kind":"scalar","type":"String","dbName":"verified_by_id"},{"name":"verifiedAt","kind":"scalar","type":"DateTime","dbName":"verified_at"},{"name":"expiresAt","kind":"scalar","type":"DateTime","dbName":"expires_at"},{"name":"paidAt","kind":"scalar","type":"DateTime","dbName":"paid_at"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"student","kind":"object","type":"StudentInformation","relationName":"PaymentToStudentInformation"},{"name":"user","kind":"object","type":"User","relationName":"PaymentToUser"},{"name":"feePlan","kind":"object","type":"FeePlan","relationName":"FeePlanToPayment"},{"name":"receivedBy","kind":"object","type":"User","relationName":"PaymentReceivedBy"},{"name":"verifiedBy","kind":"object","type":"User","relationName":"PaymentVerifiedBy"},{"name":"refunds","kind":"object","type":"PaymentRefund","relationName":"PaymentToPaymentRefund"}],"dbName":"payments","schema":"billing"},"PaymentRefund":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"paymentId","kind":"scalar","type":"String","dbName":"payment_id"},{"name":"amount","kind":"scalar","type":"Decimal"},{"name":"reason","kind":"scalar","type":"String"},{"name":"gatewayRefundId","kind":"scalar","type":"String","dbName":"gateway_refund_id"},{"name":"createdById","kind":"scalar","type":"String","dbName":"created_by_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"payment","kind":"object","type":"Payment","relationName":"PaymentToPaymentRefund"},{"name":"createdBy","kind":"object","type":"User","relationName":"PaymentRefundCreatedBy"}],"dbName":"payment_refunds","schema":"billing"},"GatewayCustomer":{"fields":[{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"gateway","kind":"enum","type":"PaymentGateway"},{"name":"customerRef","kind":"scalar","type":"String","dbName":"customer_ref"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"user","kind":"object","type":"User","relationName":"GatewayCustomerToUser"}],"dbName":"gateway_customers","schema":"billing"},"GatewayEvent":{"fields":[{"name":"gateway","kind":"enum","type":"PaymentGateway"},{"name":"eventId","kind":"scalar","type":"String","dbName":"event_id"},{"name":"type","kind":"scalar","type":"String"},{"name":"receivedAt","kind":"scalar","type":"DateTime","dbName":"received_at"},{"name":"processedAt","kind":"scalar","type":"DateTime","dbName":"processed_at"}],"dbName":"gateway_events","schema":"billing"},"Headline":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"titleBn","kind":"scalar","type":"String","dbName":"title_bn"},{"name":"titleEn","kind":"scalar","type":"String","dbName":"title_en"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"}],"dbName":"headlines","schema":"content"},"Banner":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"imageUrl","kind":"scalar","type":"String","dbName":"image_url"},{"name":"imagePublicId","kind":"scalar","type":"String","dbName":"image_public_id"},{"name":"title","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"}],"dbName":"banners","schema":"content"},"News":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"description","kind":"scalar","type":"String"},{"name":"publishedOn","kind":"scalar","type":"DateTime","dbName":"published_on"},{"name":"imageUrl","kind":"scalar","type":"String","dbName":"image_url"},{"name":"imagePublicId","kind":"scalar","type":"String","dbName":"image_public_id"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"createdById","kind":"scalar","type":"String","dbName":"created_by_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"createdBy","kind":"object","type":"User","relationName":"NewsCreatedBy"}],"dbName":"news","schema":"content"},"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"avatarUrl","kind":"scalar","type":"String","dbName":"avatar_url"},{"name":"avatarPublicId","kind":"scalar","type":"String","dbName":"avatar_public_id"},{"name":"phone","kind":"scalar","type":"String"},{"name":"dateOfBirth","kind":"scalar","type":"DateTime","dbName":"date_of_birth"},{"name":"gender","kind":"enum","type":"Gender"},{"name":"bloodGroup","kind":"scalar","type":"String","dbName":"blood_group"},{"name":"nidOrBirthNo","kind":"scalar","type":"String","dbName":"nid_or_birth_no"},{"name":"role","kind":"enum","type":"Role"},{"name":"status","kind":"enum","type":"UserStatus"},{"name":"passwordHash","kind":"scalar","type":"String","dbName":"password_hash"},{"name":"googleSub","kind":"scalar","type":"String","dbName":"google_sub"},{"name":"emailVerifiedAt","kind":"scalar","type":"DateTime","dbName":"email_verified_at"},{"name":"lastLoginAt","kind":"scalar","type":"DateTime","dbName":"last_login_at"},{"name":"approvedById","kind":"scalar","type":"String","dbName":"approved_by_id"},{"name":"approvedAt","kind":"scalar","type":"DateTime","dbName":"approved_at"},{"name":"statusReason","kind":"scalar","type":"String","dbName":"status_reason"},{"name":"legacyMongoId","kind":"scalar","type":"String","dbName":"legacy_mongo_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"deletedAt","kind":"scalar","type":"DateTime","dbName":"deleted_at"},{"name":"addresses","kind":"object","type":"UserAddress","relationName":"UserToUserAddress"},{"name":"employee","kind":"object","type":"EmployeeProfile","relationName":"EmployeeProfileToUser"},{"name":"refreshTokens","kind":"object","type":"RefreshToken","relationName":"RefreshTokenToUser"},{"name":"authTokens","kind":"object","type":"AuthToken","relationName":"AuthTokenToUser"},{"name":"trainerTrades","kind":"object","type":"TrainerTrade","relationName":"TrainerTradeToUser"},{"name":"assignments","kind":"object","type":"CourseAssignment","relationName":"CourseAssignmentToUser"},{"name":"unlocks","kind":"object","type":"VideoUnlock","relationName":"UserToVideoUnlock"},{"name":"progress","kind":"object","type":"VideoProgress","relationName":"UserToVideoProgress"},{"name":"gatewayCustomers","kind":"object","type":"GatewayCustomer","relationName":"GatewayCustomerToUser"},{"name":"applicantTrade","kind":"object","type":"ApplicantTrade","relationName":"ApplicantTradeToUser"},{"name":"studentTraining","kind":"object","type":"StudentTraining","relationName":"StudentTrainingToUser"},{"name":"donations","kind":"object","type":"Payment","relationName":"PaymentToUser"},{"name":"feedback","kind":"object","type":"StudentFeedback","relationName":"StudentFeedbackToUser"},{"name":"approvedBy","kind":"object","type":"User","relationName":"UserApprovedBy"},{"name":"approvedUsers","kind":"object","type":"User","relationName":"UserApprovedBy"},{"name":"remarksAuthored","kind":"object","type":"StudentRemark","relationName":"StudentRemarkAuthor"},{"name":"coursesCreated","kind":"object","type":"Course","relationName":"CourseCreatedBy"},{"name":"assignmentsMade","kind":"object","type":"CourseAssignment","relationName":"CourseAssignmentAssignedBy"},{"name":"unlocksGranted","kind":"object","type":"VideoUnlock","relationName":"VideoUnlockGrantedBy"},{"name":"feePlansCreated","kind":"object","type":"FeePlan","relationName":"FeePlanCreatedBy"},{"name":"paymentsReceived","kind":"object","type":"Payment","relationName":"PaymentReceivedBy"},{"name":"paymentsVerified","kind":"object","type":"Payment","relationName":"PaymentVerifiedBy"},{"name":"refundsCreated","kind":"object","type":"PaymentRefund","relationName":"PaymentRefundCreatedBy"},{"name":"newsCreated","kind":"object","type":"News","relationName":"NewsCreatedBy"},{"name":"videoGalleriesCreated","kind":"object","type":"VideoGallery","relationName":"VideoGalleryCreatedBy"},{"name":"pictureGalleriesCreated","kind":"object","type":"PictureGallery","relationName":"PictureGalleryCreatedBy"},{"name":"storiesCreated","kind":"object","type":"SuccessStory","relationName":"SuccessStoryCreatedBy"},{"name":"designationsCreated","kind":"object","type":"Designation","relationName":"DesignationCreatedBy"},{"name":"workplacesCreated","kind":"object","type":"Workplace","relationName":"WorkplaceCreatedBy"},{"name":"jobHoldersCreated","kind":"object","type":"JobHolder","relationName":"JobHolderCreatedBy"}],"dbName":"users","schema":"identity"},"UserAddress":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"kind","kind":"enum","type":"AddressKind"},{"name":"address","kind":"scalar","type":"String"},{"name":"division","kind":"scalar","type":"String"},{"name":"district","kind":"scalar","type":"String"},{"name":"upazila","kind":"scalar","type":"String"},{"name":"union","kind":"scalar","type":"String","dbName":"union"},{"name":"user","kind":"object","type":"User","relationName":"UserToUserAddress"}],"dbName":"user_addresses","schema":"identity"},"EmployeeProfile":{"fields":[{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"identityCardNo","kind":"scalar","type":"String","dbName":"identity_card_no"},{"name":"designation","kind":"scalar","type":"String"},{"name":"joiningDate","kind":"scalar","type":"DateTime","dbName":"joining_date"},{"name":"dateOfIssue","kind":"scalar","type":"DateTime","dbName":"date_of_issue"},{"name":"salary","kind":"scalar","type":"Decimal"},{"name":"user","kind":"object","type":"User","relationName":"EmployeeProfileToUser"}],"dbName":"employee_profiles","schema":"identity"},"RefreshToken":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"tokenHash","kind":"scalar","type":"String","dbName":"token_hash"},{"name":"familyId","kind":"scalar","type":"String","dbName":"family_id"},{"name":"expiresAt","kind":"scalar","type":"DateTime","dbName":"expires_at"},{"name":"revokedAt","kind":"scalar","type":"DateTime","dbName":"revoked_at"},{"name":"userAgent","kind":"scalar","type":"String","dbName":"user_agent"},{"name":"ip","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"user","kind":"object","type":"User","relationName":"RefreshTokenToUser"}],"dbName":"refresh_tokens","schema":"identity"},"AuthToken":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"purpose","kind":"enum","type":"AuthTokenPurpose"},{"name":"tokenHash","kind":"scalar","type":"String","dbName":"token_hash"},{"name":"expiresAt","kind":"scalar","type":"DateTime","dbName":"expires_at"},{"name":"usedAt","kind":"scalar","type":"DateTime","dbName":"used_at"},{"name":"user","kind":"object","type":"User","relationName":"AuthTokenToUser"}],"dbName":"auth_tokens","schema":"identity"},"AuditLog":{"fields":[{"name":"id","kind":"scalar","type":"BigInt"},{"name":"actorId","kind":"scalar","type":"String","dbName":"actor_id"},{"name":"service","kind":"scalar","type":"String"},{"name":"action","kind":"scalar","type":"String"},{"name":"entity","kind":"scalar","type":"String"},{"name":"entityId","kind":"scalar","type":"String","dbName":"entity_id"},{"name":"diff","kind":"scalar","type":"Json"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"}],"dbName":"audit_logs","schema":"identity"},"Designation":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"name","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"createdById","kind":"scalar","type":"String","dbName":"created_by_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"trade","kind":"object","type":"Trade","relationName":"DesignationToTrade"},{"name":"createdBy","kind":"object","type":"User","relationName":"DesignationCreatedBy"},{"name":"jobHolders","kind":"object","type":"JobHolder","relationName":"DesignationToJobHolder"}],"dbName":"designations","schema":"jobs"},"Workplace":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"address","kind":"scalar","type":"String"},{"name":"contact","kind":"scalar","type":"String"},{"name":"createdById","kind":"scalar","type":"String","dbName":"created_by_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"createdBy","kind":"object","type":"User","relationName":"WorkplaceCreatedBy"},{"name":"jobHolders","kind":"object","type":"JobHolder","relationName":"JobHolderToWorkplace"}],"dbName":"workplaces","schema":"jobs"},"JobHolder":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"studentId","kind":"scalar","type":"String","dbName":"student_id"},{"name":"photoUrl","kind":"scalar","type":"String","dbName":"photo_url"},{"name":"designationId","kind":"scalar","type":"String","dbName":"designation_id"},{"name":"workplaceId","kind":"scalar","type":"String","dbName":"workplace_id"},{"name":"salary","kind":"scalar","type":"Decimal"},{"name":"createdById","kind":"scalar","type":"String","dbName":"created_by_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"student","kind":"object","type":"StudentInformation","relationName":"JobHolderToStudentInformation"},{"name":"designation","kind":"object","type":"Designation","relationName":"DesignationToJobHolder"},{"name":"workplace","kind":"object","type":"Workplace","relationName":"JobHolderToWorkplace"},{"name":"createdBy","kind":"object","type":"User","relationName":"JobHolderCreatedBy"}],"dbName":"job_holders","schema":"jobs"},"VideoGallery":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"youtubeVideoId","kind":"scalar","type":"String","dbName":"youtube_video_id"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"createdById","kind":"scalar","type":"String","dbName":"created_by_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"trade","kind":"object","type":"Trade","relationName":"TradeToVideoGallery"},{"name":"createdBy","kind":"object","type":"User","relationName":"VideoGalleryCreatedBy"}],"dbName":"video_galleries","schema":"media"},"PictureGallery":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"imageUrl","kind":"scalar","type":"String","dbName":"image_url"},{"name":"imagePublicId","kind":"scalar","type":"String","dbName":"image_public_id"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"createdById","kind":"scalar","type":"String","dbName":"created_by_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"trade","kind":"object","type":"Trade","relationName":"PictureGalleryToTrade"},{"name":"createdBy","kind":"object","type":"User","relationName":"PictureGalleryCreatedBy"}],"dbName":"picture_galleries","schema":"media"},"StudentFeedback":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String","dbName":"user_id"},{"name":"courseId","kind":"scalar","type":"String","dbName":"course_id"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"legacyAuthorName","kind":"scalar","type":"String","dbName":"legacy_author_name"},{"name":"rating","kind":"scalar","type":"Int"},{"name":"comment","kind":"scalar","type":"String"},{"name":"extra","kind":"scalar","type":"Json"},{"name":"status","kind":"enum","type":"FeedbackStatus"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"user","kind":"object","type":"User","relationName":"StudentFeedbackToUser"},{"name":"course","kind":"object","type":"Course","relationName":"CourseToStudentFeedback"},{"name":"trade","kind":"object","type":"Trade","relationName":"StudentFeedbackToTrade"}],"dbName":"student_feedback","schema":"media"},"SuccessStory":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"studentId","kind":"scalar","type":"String","dbName":"student_id"},{"name":"nameBn","kind":"scalar","type":"String","dbName":"name_bn"},{"name":"imageUrl","kind":"scalar","type":"String","dbName":"image_url"},{"name":"imagePublicId","kind":"scalar","type":"String","dbName":"image_public_id"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"nameEn","kind":"scalar","type":"String","dbName":"name_en"},{"name":"roleBn","kind":"scalar","type":"String","dbName":"role_bn"},{"name":"roleEn","kind":"scalar","type":"String","dbName":"role_en"},{"name":"quoteBn","kind":"scalar","type":"String","dbName":"quote_bn"},{"name":"quoteEn","kind":"scalar","type":"String","dbName":"quote_en"},{"name":"sortOrder","kind":"scalar","type":"Int","dbName":"sort_order"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"createdById","kind":"scalar","type":"String","dbName":"created_by_id"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"student","kind":"object","type":"StudentInformation","relationName":"StudentInformationToSuccessStory"},{"name":"trade","kind":"object","type":"Trade","relationName":"SuccessStoryToTrade"},{"name":"createdBy","kind":"object","type":"User","relationName":"SuccessStoryCreatedBy"}],"dbName":"success_stories","schema":"media"},"Trade":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"code","kind":"scalar","type":"String"},{"name":"nameBn","kind":"scalar","type":"String","dbName":"name_bn"},{"name":"nameEn","kind":"scalar","type":"String","dbName":"name_en"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"tradeName","kind":"scalar","type":"String","dbName":"trade_name"},{"name":"image","kind":"scalar","type":"String"},{"name":"details","kind":"scalar","type":"String"},{"name":"detailsEn","kind":"scalar","type":"String","dbName":"details_en"},{"name":"mobile","kind":"scalar","type":"String"},{"name":"fee","kind":"scalar","type":"Int"},{"name":"feeUnit","kind":"scalar","type":"String","dbName":"fee_unit"},{"name":"weeklyClassBn","kind":"scalar","type":"String","dbName":"weekly_class_bn"},{"name":"weeklyClassEn","kind":"scalar","type":"String","dbName":"weekly_class_en"},{"name":"weekendBn","kind":"scalar","type":"String","dbName":"weekend_bn"},{"name":"weekendEn","kind":"scalar","type":"String","dbName":"weekend_en"},{"name":"batchTypeBn","kind":"scalar","type":"String","dbName":"batch_type_bn"},{"name":"batchTypeEn","kind":"scalar","type":"String","dbName":"batch_type_en"},{"name":"info","kind":"object","type":"TradeInfo","relationName":"TradeToTradeInfo"},{"name":"shifts","kind":"object","type":"TradeShift","relationName":"TradeToTradeShift"},{"name":"batches","kind":"object","type":"Batch","relationName":"BatchToTrade"},{"name":"courses","kind":"object","type":"Course","relationName":"CourseToTrade"},{"name":"trainerTrades","kind":"object","type":"TrainerTrade","relationName":"TradeToTrainerTrade"},{"name":"applicants","kind":"object","type":"ApplicantTrade","relationName":"ApplicantTradeToTrade"},{"name":"designations","kind":"object","type":"Designation","relationName":"DesignationToTrade"},{"name":"stories","kind":"object","type":"SuccessStory","relationName":"SuccessStoryToTrade"},{"name":"pictureGalleries","kind":"object","type":"PictureGallery","relationName":"PictureGalleryToTrade"},{"name":"videoGalleries","kind":"object","type":"VideoGallery","relationName":"TradeToVideoGallery"},{"name":"feedbacks","kind":"object","type":"StudentFeedback","relationName":"StudentFeedbackToTrade"},{"name":"trainings","kind":"object","type":"StudentTraining","relationName":"StudentTrainingToTrade"},{"name":"studentTrades","kind":"object","type":"StudentTrade","relationName":"StudentTradeToTrade"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"}],"dbName":"trades","schema":"academy"},"TradeInfo":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"isBteb","kind":"scalar","type":"Boolean","dbName":"is_bteb"},{"name":"seats","kind":"scalar","type":"Int"},{"name":"durationDays","kind":"scalar","type":"Int","dbName":"duration_days"},{"name":"durationBn","kind":"scalar","type":"String","dbName":"duration_bn"},{"name":"durationEn","kind":"scalar","type":"String","dbName":"duration_en"},{"name":"dailyHours","kind":"scalar","type":"Int","dbName":"daily_hours"},{"name":"routineBn","kind":"scalar","type":"String","dbName":"routine_bn"},{"name":"routineEn","kind":"scalar","type":"String","dbName":"routine_en"},{"name":"minGrade","kind":"scalar","type":"Int","dbName":"min_grade"},{"name":"qualificationBn","kind":"scalar","type":"String","dbName":"qualification_bn"},{"name":"qualificationEn","kind":"scalar","type":"String","dbName":"qualification_en"},{"name":"trade","kind":"object","type":"Trade","relationName":"TradeToTradeInfo"}],"dbName":"trade_infos","schema":"academy"},"TradeShift":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"code","kind":"scalar","type":"String"},{"name":"startTime","kind":"scalar","type":"String","dbName":"start_time"},{"name":"endTime","kind":"scalar","type":"String","dbName":"end_time"},{"name":"trade","kind":"object","type":"Trade","relationName":"TradeToTradeShift"},{"name":"batchShifts","kind":"object","type":"BatchShift","relationName":"BatchShiftToTradeShift"},{"name":"trainings","kind":"object","type":"StudentTraining","relationName":"StudentTrainingToTradeShift"}],"dbName":"trade_shifts","schema":"academy"},"Batch":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"tradeId","kind":"scalar","type":"String","dbName":"trade_id"},{"name":"batchNumber","kind":"scalar","type":"String","dbName":"batch_number"},{"name":"batchCode","kind":"scalar","type":"String","dbName":"batch_code"},{"name":"shift","kind":"scalar","type":"String"},{"name":"startDate","kind":"scalar","type":"DateTime","dbName":"start_date"},{"name":"endDate","kind":"scalar","type":"DateTime","dbName":"end_date"},{"name":"admissionOpensAt","kind":"scalar","type":"DateTime","dbName":"admission_opens_at"},{"name":"admissionClosesAt","kind":"scalar","type":"DateTime","dbName":"admission_closes_at"},{"name":"donorId","kind":"scalar","type":"String","dbName":"donor_id"},{"name":"nameBn","kind":"scalar","type":"String","dbName":"name_bn"},{"name":"nameEn","kind":"scalar","type":"String","dbName":"name_en"},{"name":"trade","kind":"object","type":"Trade","relationName":"BatchToTrade"},{"name":"donor","kind":"object","type":"Donor","relationName":"BatchToDonor"},{"name":"shifts","kind":"object","type":"BatchShift","relationName":"BatchToBatchShift"},{"name":"feePlans","kind":"object","type":"FeePlan","relationName":"BatchToFeePlan"},{"name":"trainings","kind":"object","type":"StudentTraining","relationName":"BatchToStudentTraining"}],"dbName":"batches","schema":"academy"},"BatchShift":{"fields":[{"name":"batchId","kind":"scalar","type":"String","dbName":"batch_id"},{"name":"tradeShiftId","kind":"scalar","type":"String","dbName":"trade_shift_id"},{"name":"batch","kind":"object","type":"Batch","relationName":"BatchToBatchShift"},{"name":"tradeShift","kind":"object","type":"TradeShift","relationName":"BatchShiftToTradeShift"},{"name":"studentTrades","kind":"object","type":"StudentTrade","relationName":"BatchShiftToStudentTrade"}],"dbName":"batch_shifts","schema":"academy"}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","orderBy","cursor","trade","info","batch","tradeShift","student","parent","presentOf","permanentOf","guardians","_count","address","guardian","family","education","trades","user","addresses","employee","refreshTokens","authTokens","trainerTrades","createdBy","course","module","video","unlockedBy","unlocks","progress","videos","modules","assignments","feedback","feePlan","receivedBy","verifiedBy","payment","refunds","payments","feePlans","assignedBy","gatewayCustomers","applicantTrade","shift","studentTraining","donations","approvedBy","approvedUsers","remarksAuthored","coursesCreated","assignmentsMade","unlocksGranted","feePlansCreated","paymentsReceived","paymentsVerified","refundsCreated","newsCreated","videoGalleriesCreated","pictureGalleriesCreated","storiesCreated","designation","jobHolders","workplace","designationsCreated","workplacesCreated","jobHoldersCreated","author","remarks","jobHolder","stories","presentAddress","permanentAddress","batchShift","studentTrade","result","studentTrades","batchShifts","trainings","shifts","batches","courses","applicants","designations","pictureGalleries","videoGalleries","feedbacks","donor","Donor.findUnique","Donor.findUniqueOrThrow","Donor.findFirst","Donor.findFirstOrThrow","Donor.findMany","data","Donor.createOne","Donor.createMany","Donor.createManyAndReturn","Donor.updateOne","Donor.updateMany","Donor.updateManyAndReturn","create","update","Donor.upsertOne","Donor.deleteOne","Donor.deleteMany","having","_min","_max","Donor.groupBy","Donor.aggregate","TrainerTrade.findUnique","TrainerTrade.findUniqueOrThrow","TrainerTrade.findFirst","TrainerTrade.findFirstOrThrow","TrainerTrade.findMany","TrainerTrade.createOne","TrainerTrade.createMany","TrainerTrade.createManyAndReturn","TrainerTrade.updateOne","TrainerTrade.updateMany","TrainerTrade.updateManyAndReturn","TrainerTrade.upsertOne","TrainerTrade.deleteOne","TrainerTrade.deleteMany","TrainerTrade.groupBy","TrainerTrade.aggregate","ApplicantTrade.findUnique","ApplicantTrade.findUniqueOrThrow","ApplicantTrade.findFirst","ApplicantTrade.findFirstOrThrow","ApplicantTrade.findMany","ApplicantTrade.createOne","ApplicantTrade.createMany","ApplicantTrade.createManyAndReturn","ApplicantTrade.updateOne","ApplicantTrade.updateMany","ApplicantTrade.updateManyAndReturn","ApplicantTrade.upsertOne","ApplicantTrade.deleteOne","ApplicantTrade.deleteMany","ApplicantTrade.groupBy","ApplicantTrade.aggregate","StudentTraining.findUnique","StudentTraining.findUniqueOrThrow","StudentTraining.findFirst","StudentTraining.findFirstOrThrow","StudentTraining.findMany","StudentTraining.createOne","StudentTraining.createMany","StudentTraining.createManyAndReturn","StudentTraining.updateOne","StudentTraining.updateMany","StudentTraining.updateManyAndReturn","StudentTraining.upsertOne","StudentTraining.deleteOne","StudentTraining.deleteMany","StudentTraining.groupBy","StudentTraining.aggregate","StudentInformation.findUnique","StudentInformation.findUniqueOrThrow","StudentInformation.findFirst","StudentInformation.findFirstOrThrow","StudentInformation.findMany","StudentInformation.createOne","StudentInformation.createMany","StudentInformation.createManyAndReturn","StudentInformation.updateOne","StudentInformation.updateMany","StudentInformation.updateManyAndReturn","StudentInformation.upsertOne","StudentInformation.deleteOne","StudentInformation.deleteMany","StudentInformation.groupBy","StudentInformation.aggregate","Address.findUnique","Address.findUniqueOrThrow","Address.findFirst","Address.findFirstOrThrow","Address.findMany","Address.createOne","Address.createMany","Address.createManyAndReturn","Address.updateOne","Address.updateMany","Address.updateManyAndReturn","Address.upsertOne","Address.deleteOne","Address.deleteMany","Address.groupBy","Address.aggregate","ParentInformation.findUnique","ParentInformation.findUniqueOrThrow","ParentInformation.findFirst","ParentInformation.findFirstOrThrow","ParentInformation.findMany","ParentInformation.createOne","ParentInformation.createMany","ParentInformation.createManyAndReturn","ParentInformation.updateOne","ParentInformation.updateMany","ParentInformation.updateManyAndReturn","ParentInformation.upsertOne","ParentInformation.deleteOne","ParentInformation.deleteMany","ParentInformation.groupBy","ParentInformation.aggregate","GuardianInformation.findUnique","GuardianInformation.findUniqueOrThrow","GuardianInformation.findFirst","GuardianInformation.findFirstOrThrow","GuardianInformation.findMany","GuardianInformation.createOne","GuardianInformation.createMany","GuardianInformation.createManyAndReturn","GuardianInformation.updateOne","GuardianInformation.updateMany","GuardianInformation.updateManyAndReturn","GuardianInformation.upsertOne","GuardianInformation.deleteOne","GuardianInformation.deleteMany","GuardianInformation.groupBy","GuardianInformation.aggregate","FamilyInformation.findUnique","FamilyInformation.findUniqueOrThrow","FamilyInformation.findFirst","FamilyInformation.findFirstOrThrow","FamilyInformation.findMany","FamilyInformation.createOne","FamilyInformation.createMany","FamilyInformation.createManyAndReturn","FamilyInformation.updateOne","FamilyInformation.updateMany","FamilyInformation.updateManyAndReturn","FamilyInformation.upsertOne","FamilyInformation.deleteOne","FamilyInformation.deleteMany","_avg","_sum","FamilyInformation.groupBy","FamilyInformation.aggregate","Education.findUnique","Education.findUniqueOrThrow","Education.findFirst","Education.findFirstOrThrow","Education.findMany","Education.createOne","Education.createMany","Education.createManyAndReturn","Education.updateOne","Education.updateMany","Education.updateManyAndReturn","Education.upsertOne","Education.deleteOne","Education.deleteMany","Education.groupBy","Education.aggregate","StudentTrade.findUnique","StudentTrade.findUniqueOrThrow","StudentTrade.findFirst","StudentTrade.findFirstOrThrow","StudentTrade.findMany","StudentTrade.createOne","StudentTrade.createMany","StudentTrade.createManyAndReturn","StudentTrade.updateOne","StudentTrade.updateMany","StudentTrade.updateManyAndReturn","StudentTrade.upsertOne","StudentTrade.deleteOne","StudentTrade.deleteMany","StudentTrade.groupBy","StudentTrade.aggregate","ExaminationResult.findUnique","ExaminationResult.findUniqueOrThrow","ExaminationResult.findFirst","ExaminationResult.findFirstOrThrow","ExaminationResult.findMany","ExaminationResult.createOne","ExaminationResult.createMany","ExaminationResult.createManyAndReturn","ExaminationResult.updateOne","ExaminationResult.updateMany","ExaminationResult.updateManyAndReturn","ExaminationResult.upsertOne","ExaminationResult.deleteOne","ExaminationResult.deleteMany","ExaminationResult.groupBy","ExaminationResult.aggregate","StudentRemark.findUnique","StudentRemark.findUniqueOrThrow","StudentRemark.findFirst","StudentRemark.findFirstOrThrow","StudentRemark.findMany","StudentRemark.createOne","StudentRemark.createMany","StudentRemark.createManyAndReturn","StudentRemark.updateOne","StudentRemark.updateMany","StudentRemark.updateManyAndReturn","StudentRemark.upsertOne","StudentRemark.deleteOne","StudentRemark.deleteMany","StudentRemark.groupBy","StudentRemark.aggregate","Course.findUnique","Course.findUniqueOrThrow","Course.findFirst","Course.findFirstOrThrow","Course.findMany","Course.createOne","Course.createMany","Course.createManyAndReturn","Course.updateOne","Course.updateMany","Course.updateManyAndReturn","Course.upsertOne","Course.deleteOne","Course.deleteMany","Course.groupBy","Course.aggregate","CourseModule.findUnique","CourseModule.findUniqueOrThrow","CourseModule.findFirst","CourseModule.findFirstOrThrow","CourseModule.findMany","CourseModule.createOne","CourseModule.createMany","CourseModule.createManyAndReturn","CourseModule.updateOne","CourseModule.updateMany","CourseModule.updateManyAndReturn","CourseModule.upsertOne","CourseModule.deleteOne","CourseModule.deleteMany","CourseModule.groupBy","CourseModule.aggregate","CourseVideo.findUnique","CourseVideo.findUniqueOrThrow","CourseVideo.findFirst","CourseVideo.findFirstOrThrow","CourseVideo.findMany","CourseVideo.createOne","CourseVideo.createMany","CourseVideo.createManyAndReturn","CourseVideo.updateOne","CourseVideo.updateMany","CourseVideo.updateManyAndReturn","CourseVideo.upsertOne","CourseVideo.deleteOne","CourseVideo.deleteMany","CourseVideo.groupBy","CourseVideo.aggregate","CourseAssignment.findUnique","CourseAssignment.findUniqueOrThrow","CourseAssignment.findFirst","CourseAssignment.findFirstOrThrow","CourseAssignment.findMany","CourseAssignment.createOne","CourseAssignment.createMany","CourseAssignment.createManyAndReturn","CourseAssignment.updateOne","CourseAssignment.updateMany","CourseAssignment.updateManyAndReturn","CourseAssignment.upsertOne","CourseAssignment.deleteOne","CourseAssignment.deleteMany","CourseAssignment.groupBy","CourseAssignment.aggregate","VideoUnlock.findUnique","VideoUnlock.findUniqueOrThrow","VideoUnlock.findFirst","VideoUnlock.findFirstOrThrow","VideoUnlock.findMany","VideoUnlock.createOne","VideoUnlock.createMany","VideoUnlock.createManyAndReturn","VideoUnlock.updateOne","VideoUnlock.updateMany","VideoUnlock.updateManyAndReturn","VideoUnlock.upsertOne","VideoUnlock.deleteOne","VideoUnlock.deleteMany","VideoUnlock.groupBy","VideoUnlock.aggregate","VideoProgress.findUnique","VideoProgress.findUniqueOrThrow","VideoProgress.findFirst","VideoProgress.findFirstOrThrow","VideoProgress.findMany","VideoProgress.createOne","VideoProgress.createMany","VideoProgress.createManyAndReturn","VideoProgress.updateOne","VideoProgress.updateMany","VideoProgress.updateManyAndReturn","VideoProgress.upsertOne","VideoProgress.deleteOne","VideoProgress.deleteMany","VideoProgress.groupBy","VideoProgress.aggregate","FeePlan.findUnique","FeePlan.findUniqueOrThrow","FeePlan.findFirst","FeePlan.findFirstOrThrow","FeePlan.findMany","FeePlan.createOne","FeePlan.createMany","FeePlan.createManyAndReturn","FeePlan.updateOne","FeePlan.updateMany","FeePlan.updateManyAndReturn","FeePlan.upsertOne","FeePlan.deleteOne","FeePlan.deleteMany","FeePlan.groupBy","FeePlan.aggregate","Payment.findUnique","Payment.findUniqueOrThrow","Payment.findFirst","Payment.findFirstOrThrow","Payment.findMany","Payment.createOne","Payment.createMany","Payment.createManyAndReturn","Payment.updateOne","Payment.updateMany","Payment.updateManyAndReturn","Payment.upsertOne","Payment.deleteOne","Payment.deleteMany","Payment.groupBy","Payment.aggregate","PaymentRefund.findUnique","PaymentRefund.findUniqueOrThrow","PaymentRefund.findFirst","PaymentRefund.findFirstOrThrow","PaymentRefund.findMany","PaymentRefund.createOne","PaymentRefund.createMany","PaymentRefund.createManyAndReturn","PaymentRefund.updateOne","PaymentRefund.updateMany","PaymentRefund.updateManyAndReturn","PaymentRefund.upsertOne","PaymentRefund.deleteOne","PaymentRefund.deleteMany","PaymentRefund.groupBy","PaymentRefund.aggregate","GatewayCustomer.findUnique","GatewayCustomer.findUniqueOrThrow","GatewayCustomer.findFirst","GatewayCustomer.findFirstOrThrow","GatewayCustomer.findMany","GatewayCustomer.createOne","GatewayCustomer.createMany","GatewayCustomer.createManyAndReturn","GatewayCustomer.updateOne","GatewayCustomer.updateMany","GatewayCustomer.updateManyAndReturn","GatewayCustomer.upsertOne","GatewayCustomer.deleteOne","GatewayCustomer.deleteMany","GatewayCustomer.groupBy","GatewayCustomer.aggregate","GatewayEvent.findUnique","GatewayEvent.findUniqueOrThrow","GatewayEvent.findFirst","GatewayEvent.findFirstOrThrow","GatewayEvent.findMany","GatewayEvent.createOne","GatewayEvent.createMany","GatewayEvent.createManyAndReturn","GatewayEvent.updateOne","GatewayEvent.updateMany","GatewayEvent.updateManyAndReturn","GatewayEvent.upsertOne","GatewayEvent.deleteOne","GatewayEvent.deleteMany","GatewayEvent.groupBy","GatewayEvent.aggregate","Headline.findUnique","Headline.findUniqueOrThrow","Headline.findFirst","Headline.findFirstOrThrow","Headline.findMany","Headline.createOne","Headline.createMany","Headline.createManyAndReturn","Headline.updateOne","Headline.updateMany","Headline.updateManyAndReturn","Headline.upsertOne","Headline.deleteOne","Headline.deleteMany","Headline.groupBy","Headline.aggregate","Banner.findUnique","Banner.findUniqueOrThrow","Banner.findFirst","Banner.findFirstOrThrow","Banner.findMany","Banner.createOne","Banner.createMany","Banner.createManyAndReturn","Banner.updateOne","Banner.updateMany","Banner.updateManyAndReturn","Banner.upsertOne","Banner.deleteOne","Banner.deleteMany","Banner.groupBy","Banner.aggregate","News.findUnique","News.findUniqueOrThrow","News.findFirst","News.findFirstOrThrow","News.findMany","News.createOne","News.createMany","News.createManyAndReturn","News.updateOne","News.updateMany","News.updateManyAndReturn","News.upsertOne","News.deleteOne","News.deleteMany","News.groupBy","News.aggregate","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","User.upsertOne","User.deleteOne","User.deleteMany","User.groupBy","User.aggregate","UserAddress.findUnique","UserAddress.findUniqueOrThrow","UserAddress.findFirst","UserAddress.findFirstOrThrow","UserAddress.findMany","UserAddress.createOne","UserAddress.createMany","UserAddress.createManyAndReturn","UserAddress.updateOne","UserAddress.updateMany","UserAddress.updateManyAndReturn","UserAddress.upsertOne","UserAddress.deleteOne","UserAddress.deleteMany","UserAddress.groupBy","UserAddress.aggregate","EmployeeProfile.findUnique","EmployeeProfile.findUniqueOrThrow","EmployeeProfile.findFirst","EmployeeProfile.findFirstOrThrow","EmployeeProfile.findMany","EmployeeProfile.createOne","EmployeeProfile.createMany","EmployeeProfile.createManyAndReturn","EmployeeProfile.updateOne","EmployeeProfile.updateMany","EmployeeProfile.updateManyAndReturn","EmployeeProfile.upsertOne","EmployeeProfile.deleteOne","EmployeeProfile.deleteMany","EmployeeProfile.groupBy","EmployeeProfile.aggregate","RefreshToken.findUnique","RefreshToken.findUniqueOrThrow","RefreshToken.findFirst","RefreshToken.findFirstOrThrow","RefreshToken.findMany","RefreshToken.createOne","RefreshToken.createMany","RefreshToken.createManyAndReturn","RefreshToken.updateOne","RefreshToken.updateMany","RefreshToken.updateManyAndReturn","RefreshToken.upsertOne","RefreshToken.deleteOne","RefreshToken.deleteMany","RefreshToken.groupBy","RefreshToken.aggregate","AuthToken.findUnique","AuthToken.findUniqueOrThrow","AuthToken.findFirst","AuthToken.findFirstOrThrow","AuthToken.findMany","AuthToken.createOne","AuthToken.createMany","AuthToken.createManyAndReturn","AuthToken.updateOne","AuthToken.updateMany","AuthToken.updateManyAndReturn","AuthToken.upsertOne","AuthToken.deleteOne","AuthToken.deleteMany","AuthToken.groupBy","AuthToken.aggregate","AuditLog.findUnique","AuditLog.findUniqueOrThrow","AuditLog.findFirst","AuditLog.findFirstOrThrow","AuditLog.findMany","AuditLog.createOne","AuditLog.createMany","AuditLog.createManyAndReturn","AuditLog.updateOne","AuditLog.updateMany","AuditLog.updateManyAndReturn","AuditLog.upsertOne","AuditLog.deleteOne","AuditLog.deleteMany","AuditLog.groupBy","AuditLog.aggregate","Designation.findUnique","Designation.findUniqueOrThrow","Designation.findFirst","Designation.findFirstOrThrow","Designation.findMany","Designation.createOne","Designation.createMany","Designation.createManyAndReturn","Designation.updateOne","Designation.updateMany","Designation.updateManyAndReturn","Designation.upsertOne","Designation.deleteOne","Designation.deleteMany","Designation.groupBy","Designation.aggregate","Workplace.findUnique","Workplace.findUniqueOrThrow","Workplace.findFirst","Workplace.findFirstOrThrow","Workplace.findMany","Workplace.createOne","Workplace.createMany","Workplace.createManyAndReturn","Workplace.updateOne","Workplace.updateMany","Workplace.updateManyAndReturn","Workplace.upsertOne","Workplace.deleteOne","Workplace.deleteMany","Workplace.groupBy","Workplace.aggregate","JobHolder.findUnique","JobHolder.findUniqueOrThrow","JobHolder.findFirst","JobHolder.findFirstOrThrow","JobHolder.findMany","JobHolder.createOne","JobHolder.createMany","JobHolder.createManyAndReturn","JobHolder.updateOne","JobHolder.updateMany","JobHolder.updateManyAndReturn","JobHolder.upsertOne","JobHolder.deleteOne","JobHolder.deleteMany","JobHolder.groupBy","JobHolder.aggregate","VideoGallery.findUnique","VideoGallery.findUniqueOrThrow","VideoGallery.findFirst","VideoGallery.findFirstOrThrow","VideoGallery.findMany","VideoGallery.createOne","VideoGallery.createMany","VideoGallery.createManyAndReturn","VideoGallery.updateOne","VideoGallery.updateMany","VideoGallery.updateManyAndReturn","VideoGallery.upsertOne","VideoGallery.deleteOne","VideoGallery.deleteMany","VideoGallery.groupBy","VideoGallery.aggregate","PictureGallery.findUnique","PictureGallery.findUniqueOrThrow","PictureGallery.findFirst","PictureGallery.findFirstOrThrow","PictureGallery.findMany","PictureGallery.createOne","PictureGallery.createMany","PictureGallery.createManyAndReturn","PictureGallery.updateOne","PictureGallery.updateMany","PictureGallery.updateManyAndReturn","PictureGallery.upsertOne","PictureGallery.deleteOne","PictureGallery.deleteMany","PictureGallery.groupBy","PictureGallery.aggregate","StudentFeedback.findUnique","StudentFeedback.findUniqueOrThrow","StudentFeedback.findFirst","StudentFeedback.findFirstOrThrow","StudentFeedback.findMany","StudentFeedback.createOne","StudentFeedback.createMany","StudentFeedback.createManyAndReturn","StudentFeedback.updateOne","StudentFeedback.updateMany","StudentFeedback.updateManyAndReturn","StudentFeedback.upsertOne","StudentFeedback.deleteOne","StudentFeedback.deleteMany","StudentFeedback.groupBy","StudentFeedback.aggregate","SuccessStory.findUnique","SuccessStory.findUniqueOrThrow","SuccessStory.findFirst","SuccessStory.findFirstOrThrow","SuccessStory.findMany","SuccessStory.createOne","SuccessStory.createMany","SuccessStory.createManyAndReturn","SuccessStory.updateOne","SuccessStory.updateMany","SuccessStory.updateManyAndReturn","SuccessStory.upsertOne","SuccessStory.deleteOne","SuccessStory.deleteMany","SuccessStory.groupBy","SuccessStory.aggregate","Trade.findUnique","Trade.findUniqueOrThrow","Trade.findFirst","Trade.findFirstOrThrow","Trade.findMany","Trade.createOne","Trade.createMany","Trade.createManyAndReturn","Trade.updateOne","Trade.updateMany","Trade.updateManyAndReturn","Trade.upsertOne","Trade.deleteOne","Trade.deleteMany","Trade.groupBy","Trade.aggregate","TradeInfo.findUnique","TradeInfo.findUniqueOrThrow","TradeInfo.findFirst","TradeInfo.findFirstOrThrow","TradeInfo.findMany","TradeInfo.createOne","TradeInfo.createMany","TradeInfo.createManyAndReturn","TradeInfo.updateOne","TradeInfo.updateMany","TradeInfo.updateManyAndReturn","TradeInfo.upsertOne","TradeInfo.deleteOne","TradeInfo.deleteMany","TradeInfo.groupBy","TradeInfo.aggregate","TradeShift.findUnique","TradeShift.findUniqueOrThrow","TradeShift.findFirst","TradeShift.findFirstOrThrow","TradeShift.findMany","TradeShift.createOne","TradeShift.createMany","TradeShift.createManyAndReturn","TradeShift.updateOne","TradeShift.updateMany","TradeShift.updateManyAndReturn","TradeShift.upsertOne","TradeShift.deleteOne","TradeShift.deleteMany","TradeShift.groupBy","TradeShift.aggregate","Batch.findUnique","Batch.findUniqueOrThrow","Batch.findFirst","Batch.findFirstOrThrow","Batch.findMany","Batch.createOne","Batch.createMany","Batch.createManyAndReturn","Batch.updateOne","Batch.updateMany","Batch.updateManyAndReturn","Batch.upsertOne","Batch.deleteOne","Batch.deleteMany","Batch.groupBy","Batch.aggregate","BatchShift.findUnique","BatchShift.findUniqueOrThrow","BatchShift.findFirst","BatchShift.findFirstOrThrow","BatchShift.findMany","BatchShift.createOne","BatchShift.createMany","BatchShift.createManyAndReturn","BatchShift.updateOne","BatchShift.updateMany","BatchShift.updateManyAndReturn","BatchShift.upsertOne","BatchShift.deleteOne","BatchShift.deleteMany","BatchShift.groupBy","BatchShift.aggregate","AND","OR","NOT","batchId","tradeShiftId","equals","in","notIn","lt","lte","gt","gte","not","contains","startsWith","endsWith","id","tradeId","batchNumber","batchCode","startDate","endDate","admissionOpensAt","admissionClosesAt","donorId","nameBn","nameEn","code","startTime","endTime","isBteb","seats","durationDays","durationBn","durationEn","dailyHours","routineBn","routineEn","minGrade","qualificationBn","qualificationEn","isActive","tradeName","image","details","detailsEn","mobile","fee","feeUnit","weeklyClassBn","weeklyClassEn","weekendBn","weekendEn","batchTypeBn","batchTypeEn","createdAt","updatedAt","every","some","none","studentId","imageUrl","imagePublicId","roleBn","roleEn","quoteBn","quoteEn","sortOrder","createdById","userId","courseId","legacyAuthorName","rating","comment","extra","FeedbackStatus","status","string_contains","string_starts_with","string_ends_with","array_starts_with","array_ends_with","array_contains","title","youtubeVideoId","photoUrl","designationId","workplaceId","salary","name","contact","actorId","service","action","entity","entityId","diff","AuthTokenPurpose","purpose","tokenHash","expiresAt","usedAt","familyId","revokedAt","userAgent","ip","identityCardNo","joiningDate","dateOfIssue","AddressKind","kind","division","district","upazila","union","email","avatarUrl","avatarPublicId","phone","dateOfBirth","Gender","gender","bloodGroup","nidOrBirthNo","Role","role","UserStatus","passwordHash","googleSub","emailVerifiedAt","lastLoginAt","approvedById","approvedAt","statusReason","legacyMongoId","deletedAt","description","publishedOn","titleBn","titleEn","PaymentGateway","gateway","eventId","type","receivedAt","processedAt","gateway_eventId","customerRef","paymentId","amount","reason","gatewayRefundId","PaymentKind","PaymentStatus","PaymentMethod","method","feePlanId","currency","isAnonymous","gatewaySessionId","gatewayPaymentId","receiptNo","receivedById","verifiedById","verifiedAt","paidAt","videoId","watchedSeconds","lastPosition","completed","unlockedById","unlockedAt","assignedById","assignedAt","moduleId","durationSeconds","milestone","slug","thumbnailUrl","isPublished","text","authorId","studentTradeId","theory","practical","viva","totalMarks","attendedDays","totalDays","certificateSl","finalGrade","ResultStatus","ApprovalStatus","qualification","passingYear","institution","totalMembers","income","relation","addressId","fatherName","fatherOccupation","fatherPhone","motherName","motherOccupation","motherPhone","addressLine","postOffice","postCode","formNo","mrNo","photo","birthDate","physicalDisability","disabilityDetails","presentAddressId","permanentAddressId","shiftId","tradeId_name","gateway_customerRef","userId_gateway","gateway_gatewaySessionId","gateway_gatewayPaymentId","userId_videoId","userId_courseId","userId_tradeId","userId_kind","studentId_batchId","batchId_tradeShiftId","tradeId_code","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","increment","decrement","multiply","divide"]'),
  graph: "_BmYA9AFBlEAAIELACCxBgAAgwwAMLIGAACPAgAQswYAAIMMADDBBgEAAAABigcBAAAAAQEAAAABACAUAwAA9woAICkAAJkMACAtAQD9CgAhTwAAigsAIFAAAOgMACBYAADqDAAgsQYAAOkMADCyBgAAAwAQswYAAOkMADDBBgEAwgsAIcIGAQDCCwAhwwYBAPYKACHEBgEA9goAIcUGQACuCwAhxgZAAK4LACHHBkAArgsAIcgGQACuCwAhyQYBAKQLACHKBgEA_QoAIcsGAQD9CgAhDQMAAJ4OACApAACxFgAgLQAAkQ0AIE8AAO8QACBQAADPFgAgWAAA0BYAIMUGAACRDQAgxgYAAJENACDHBgAAkQ0AIMgGAACRDQAgyQYAAJENACDKBgAAkQ0AIMsGAACRDQAgFAMAAPcKACApAACZDAAgLQEA_QoAIU8AAIoLACBQAADoDAAgWAAA6gwAILEGAADpDAAwsgYAAAMAELMGAADpDAAwwQYBAAAAAcIGAQDCCwAhwwYBAPYKACHEBgEAAAABxQZAAK4LACHGBkAArgsAIccGQACuCwAhyAZAAK4LACHJBgEApAsAIcoGAQD9CgAhywYBAP0KACEDAAAAAwAgAQAABAAwAgAABQAgEQMAAPcKACCxBgAA8woAMLIGAAAHABCzBgAA8woAMMEGAQDCCwAhwgYBAMILACHPBiAA9AoAIdAGAgD1CgAh0QYCAPUKACHSBgEA9goAIdMGAQD2CgAh1AYCAPUKACHVBgEA9goAIdYGAQD2CgAh1wYCAPUKACHYBgEA9goAIdkGAQD2CgAhAQAAAAcAIAsDAAD3CgAgTgAA6AwAIE8AAIoLACCxBgAA5wwAMLIGAAAJABCzBgAA5wwAMMEGAQDCCwAhwgYBAMILACHMBgEA9goAIc0GAQD2CgAhzgYBAPYKACEDAwAAng4AIE4AAM8WACBPAADvEAAgDAMAAPcKACBOAADoDAAgTwAAigsAILEGAADnDAAwsgYAAAkAELMGAADnDAAwwQYBAAAAAcIGAQDCCwAhzAYBAPYKACHNBgEA9goAIc4GAQD2CgAhlggAAOYMACADAAAACQAgAQAACgAwAgAACwAgCAUAAIYMACAGAADlDAAgTQAAiwsAILEGAADkDAAwsgYAAA0AELMGAADkDAAwtAYBAMILACG1BgEAwgsAIQMFAACqFgAgBgAAqxYAIE0AAPAQACAJBQAAhgwAIAYAAOUMACBNAACLCwAgsQYAAOQMADCyBgAADQAQswYAAOQMADC0BgEAwgsAIbUGAQDCCwAhlQgAAOMMACADAAAADQAgAQAADgAwAgAADwAgDwMAAPcKACAHAADxCwAgSgAA4QwAIEwAAOIMACCxBgAA3wwAMLIGAAARABCzBgAA3wwAMLQGAQDCCwAhtQYBAMILACHBBgEAwgsAIcIGAQDCCwAh6AZAAP4KACHpBkAA_goAIe0GAQDCCwAh_QYAAOAM8gciBAMAAJ4OACAHAAD8FAAgSgAAzRYAIEwAAM4WACAQAwAA9woAIAcAAPELACBKAADhDAAgTAAA4gwAILEGAADfDAAwsgYAABEAELMGAADfDAAwtAYBAMILACG1BgEAwgsAIcEGAQAAAAHCBgEAwgsAIegGQAD-CgAh6QZAAP4KACHtBgEAwgsAIf0GAADgDPIHIpQIAADeDAAgAwAAABEAIAEAABIAMAIAABMAIAwHAADxCwAgsQYAAPYLADCyBgAAFQAQswYAAPYLADDBBgEAwgsAIe0GAQDCCwAh-QcBAPYKACH6BwEA_QoAIfsHAQD9CgAh_AcBAPYKACH9BwEA_QoAIf4HAQD9CgAhAQAAABUAIAsHAADxCwAgDQAA1gwAILEGAADVDAAwsgYAABcAELMGAADVDAAwwQYBAMILACHtBgEAwgsAIYoHAQD2CgAhpwcBAPYKACH3BwEA9goAIfgHAQCkCwAhAQAAABcAIA8JAAD5CwAgCgAA-QsAIAsAAPoLACCxBgAA-AsAMLIGAAAZABCzBgAA-AsAMMEGAQDCCwAh6AZAAP4KACHpBkAA_goAIaAHAQD2CgAhoQcBAPYKACGiBwEA9goAIf8HAQD2CgAhgAgBAP0KACGBCAEA_QoAIQEAAAAZACAeCAAA2QwAIA4AANoMACAPAADbDAAgEAAA3AwAIBEAAIsLACAoAACnDAAgRQAAqQwAIEYAAN0MACBHAACGCwAgSAAA1gwAIEkAANYMACCxBgAA1wwAMLIGAAAbABCzBgAA1wwAMMEGAQDCCwAh6AZAAP4KACHpBkAA_goAIYoHAQD2CgAhpwcBAPYKACGqBwAA2AyqByKsBwEA9goAIbgHQACuCwAhgggBAPYKACGDCAEA_QoAIYQIAQD9CgAhhQhAAP4KACGGCCAA9AoAIYcIAQD9CgAhiAgBAKQLACGJCAEApAsAIREIAADIFgAgDgAAyRYAIA8AAMoWACAQAADLFgAgEQAA8BAAICgAALsWACBFAAC9FgAgRgAAzBYAIEcAAOsQACBIAADHFgAgSQAAxxYAILgHAACRDQAggwgAAJENACCECAAAkQ0AIIcIAACRDQAgiAgAAJENACCJCAAAkQ0AIB4IAADZDAAgDgAA2gwAIA8AANsMACAQAADcDAAgEQAAiwsAICgAAKcMACBFAACpDAAgRgAA3QwAIEcAAIYLACBIAADWDAAgSQAA1gwAILEGAADXDAAwsgYAABsAELMGAADXDAAwwQYBAAAAAegGQAD-CgAh6QZAAP4KACGKBwEA9goAIacHAQD2CgAhqgcAANgMqgcirAcBAAAAAbgHQACuCwAhgggBAAAAAYMIAQAAAAGECAEA_QoAIYUIQAD-CgAhhgggAPQKACGHCAEA_QoAIYgIAQCkCwAhiQgBAKQLACEDAAAAGwAgAQAAHAAwAgAAHQAgAwAAABsAIAEAABwAMAIAAB0AIAMHAAD8FAAgDQAAxxYAIPgHAACRDQAgCwcAAPELACANAADWDAAgsQYAANUMADCyBgAAFwAQswYAANUMADDBBgEAAAAB7QYBAAAAAYoHAQD2CgAhpwcBAPYKACH3BwEA9goAIfgHAQCkCwAhAwAAABcAIAEAACAAMAIAACEAIAEAAAAbACABAAAAGwAgAQAAABcAIAgHAADxCwAgsQYAAPMLADCyBgAAJgAQswYAAPMLADDBBgEAwgsAIe0GAQDCCwAh9QcCAPUKACH2BwIA9QoAIQEAAAAmACAKBwAA8QsAIEwBAPYKACGxBgAA8AsAMLIGAAAoABCzBgAA8AsAMMEGAQDCCwAh7QYBAMILACHyBwEA9goAIfMHAgD1CgAh9AcBAPYKACEBAAAAKAAgAwAAABEAIAEAABIAMAIAABMAIAoHAADxCwAgRAAAiQwAILEGAADUDAAwsgYAACsAELMGAADUDAAwwQYBAMILACHoBkAA_goAIe0GAQDCCwAh5QcBAPYKACHmBwEApAsAIQMHAAD8FAAgRAAAuxEAIOYHAACRDQAgCgcAAPELACBEAACJDAAgsQYAANQMADCyBgAAKwAQswYAANQMADDBBgEAAAAB6AZAAP4KACHtBgEAwgsAIeUHAQD2CgAh5gcBAKQLACEDAAAAKwAgAQAALAAwAgAALQAgOBMAAJ4MACAUAACfDAAgFQAAoAwAIBYAAKEMACAXAACDCwAgHQAAogwAIB4AAKMMACAhAACYDAAgIgAAiQsAICsAAKQMACAsAAClDAAgLgAApgwAIC8AAKcMACAwAACJDAAgMQAAqAwAIDIAAKkMACAzAACCCwAgNAAAmAwAIDUAAKIMACA2AACZDAAgNwAApwwAIDgAAKcMACA5AACqDAAgOgAAqwwAIDsAAIgLACA8AACHCwAgPQAAhgsAIEEAAIULACBCAACsDAAgQwAAigwAILEGAACaDAAwsgYAAC8AELMGAACaDAAwwQYBAMILACHoBkAA_goAIekGQAD-CgAh_QYAAJ0MsAciigcBAP0KACGkBwEA9goAIaUHAQD9CgAhpgcBAP0KACGnBwEA_QoAIagHQACuCwAhqgcAAJsMqgcjqwcBAP0KACGsBwEA_QoAIa4HAACcDK4HIrAHAQD9CgAhsQcBAP0KACGyB0AArgsAIbMHQACuCwAhtAcBAKQLACG1B0AArgsAIbYHAQD9CgAhtwcBAP0KACG4B0AArgsAIQEAAAAvACAMDQEA_QoAIRIAALALACCxBgAA0gwAMLIGAAAxABCzBgAA0gwAMMEGAQDCCwAh9gYBAMILACGfBwAA0wyfByKgBwEA_QoAIaEHAQD9CgAhogcBAP0KACGjBwEA_QoAIQYNAACRDQAgEgAAuxEAIKAHAACRDQAgoQcAAJENACCiBwAAkQ0AIKMHAACRDQAgDQ0BAP0KACESAACwCwAgsQYAANIMADCyBgAAMQAQswYAANIMADDBBgEAAAAB9gYBAMILACGfBwAA0wyfByKgBwEA_QoAIaEHAQD9CgAhogcBAP0KACGjBwEA_QoAIZMIAADRDAAgAwAAADEAIAEAADIAMAIAADMAIAoSAACwCwAgPgEA_QoAIbEGAACtCwAwsgYAADUAELMGAACtCwAw9gYBAMILACGJBxAArwsAIZsHAQD9CgAhnAdAAK4LACGdB0AArgsAIQEAAAA1ACANEgAAsAsAILEGAADQDAAwsgYAADcAELMGAADQDAAwwQYBAMILACHoBkAA_goAIfYGAQDCCwAhlAcBAPYKACGVB0AA_goAIZcHAQDCCwAhmAdAAK4LACGZBwEA_QoAIZoHAQD9CgAhBBIAALsRACCYBwAAkQ0AIJkHAACRDQAgmgcAAJENACANEgAAsAsAILEGAADQDAAwsgYAADcAELMGAADQDAAwwQYBAAAAAegGQAD-CgAh9gYBAMILACGUBwEAAAABlQdAAP4KACGXBwEAwgsAIZgHQACuCwAhmQcBAP0KACGaBwEA_QoAIQMAAAA3ACABAAA4ADACAAA5ACAKEgAAsAsAILEGAADODAAwsgYAADsAELMGAADODAAwwQYBAMILACH2BgEAwgsAIZMHAADPDJMHIpQHAQD2CgAhlQdAAP4KACGWB0AArgsAIQISAAC7EQAglgcAAJENACAKEgAAsAsAILEGAADODAAwsgYAADsAELMGAADODAAwwQYBAAAAAfYGAQDCCwAhkwcAAM8MkwcilAcBAAAAAZUHQAD-CgAhlgdAAK4LACEDAAAAOwAgAQAAPAAwAgAAPQAgBwMAAPcKACASAACwCwAgsQYAAM0MADCyBgAAPwAQswYAAM0MADDCBgEAwgsAIfYGAQDCCwAhAgMAAJ4OACASAAC7EQAgCAMAAPcKACASAACwCwAgsQYAAM0MADCyBgAAPwAQswYAAM0MADDCBgEAwgsAIfYGAQDCCwAhkggAAMwMACADAAAAPwAgAQAAQAAwAgAAQQAgChIAALALACAZAADIDAAgKgAAiQwAILEGAADLDAAwsgYAAEMAELMGAADLDAAw9gYBAMILACH3BgEAwgsAId0HAQCkCwAh3gdAAP4KACEEEgAAuxEAIBkAAMMWACAqAAC7EQAg3QcAAJENACALEgAAsAsAIBkAAMgMACAqAACJDAAgsQYAAMsMADCyBgAAQwAQswYAAMsMADD2BgEAwgsAIfcGAQDCCwAh3QcBAKQLACHeB0AA_goAIZEIAADKDAAgAwAAAEMAIAEAAEQAMAIAAEUAICQEAAD_CgAgFwAAgwsAIEcAAIYLACBNAACLCwAgTwAAigsAIFAAAIALACBRAACBCwAgUgAAggsAIFMAAIQLACBUAACFCwAgVQAAhwsAIFYAAIgLACBXAACJCwAgsQYAAPwKADCyBgAARwAQswYAAPwKADDBBgEAwgsAIcoGAQD9CgAhywYBAPYKACHMBgEA9goAIdoGIAD0CgAh2wYBAP0KACHcBgEA_QoAId0GAQD2CgAh3gYBAPYKACHfBgEA_QoAIeAGAgD1CgAh4QYBAPYKACHiBgEA9goAIeMGAQD2CgAh5AYBAPYKACHlBgEA9goAIeYGAQD2CgAh5wYBAPYKACHoBkAA_goAIekGQAD-CgAhAQAAAEcAIAEAAAAvACALGQAAyAwAIB8AAMkMACCxBgAAxwwAMLIGAABKABCzBgAAxwwAMMEGAQDCCwAh9AYCAPUKACH3BgEAwgsAIYQHAQD2CgAhtwcBAP0KACHhBwIA9QoAIQMZAADDFgAgHwAAxhYAILcHAACRDQAgCxkAAMgMACAfAADJDAAgsQYAAMcMADCyBgAASgAQswYAAMcMADDBBgEAAAAB9AYCAPUKACH3BgEAwgsAIYQHAQD2CgAhtwcBAP0KACHhBwIA9QoAIQMAAABKACABAABLADACAABMACANGgAAxgwAIB0AAKIMACAeAACjDAAgsQYAAMUMADCyBgAATgAQswYAAMUMADDBBgEAwgsAIfQGAgD1CgAhhAcBAPYKACGFBwEA9goAIbcHAQD9CgAh3wcBAMILACHgBwIAvgwAIQUaAADFFgAgHQAAthYAIB4AALcWACC3BwAAkQ0AIOAHAACRDQAgDRoAAMYMACAdAACiDAAgHgAAowwAILEGAADFDAAwsgYAAE4AELMGAADFDAAwwQYBAAAAAfQGAgD1CgAhhAcBAPYKACGFBwEA9goAIbcHAQD9CgAh3wcBAMILACHgBwIAvgwAIQMAAABOACABAABPADACAABQACAKEgAAsAsAIBsAAMIMACAcAACJDAAgsQYAAMQMADCyBgAAUgAQswYAAMQMADD2BgEAwgsAIdcHAQDCCwAh2wcBAKQLACHcB0AA_goAIQQSAAC7EQAgGwAAxBYAIBwAALsRACDbBwAAkQ0AIAsSAACwCwAgGwAAwgwAIBwAAIkMACCxBgAAxAwAMLIGAABSABCzBgAAxAwAMPYGAQDCCwAh1wcBAMILACHbBwEApAsAIdwHQAD-CgAhkAgAAMMMACADAAAAUgAgAQAAUwAwAgAAVAAgAQAAAC8AIAsSAACwCwAgGwAAwgwAILEGAADBDAAwsgYAAFcAELMGAADBDAAw6QZAAP4KACH2BgEAwgsAIdcHAQDCCwAh2AcCAPUKACHZBwIA9QoAIdoHIAD0CgAhAhIAALsRACAbAADEFgAgDBIAALALACAbAADCDAAgsQYAAMEMADCyBgAAVwAQswYAAMEMADDpBkAA_goAIfYGAQDCCwAh1wcBAMILACHYBwIA9QoAIdkHAgD1CgAh2gcgAPQKACGQCAAAwAwAIAMAAABXACABAABYADACAABZACABAAAAUgAgAQAAAFcAIAEAAABOACADAAAAQwAgAQAARAAwAgAARQAgEQMAAJIMACASAACJDAAgGQAAvAwAILEGAAC9DAAwsgYAAF8AELMGAAC9DAAwwQYBAMILACHCBgEApAsAIegGQAD-CgAh6QZAAP4KACH2BgEApAsAIfcGAQCkCwAh-AYBAP0KACH5BgIAvgwAIfoGAQD9CgAh-wYAAKULACD9BgAAvwz9BiIKAwAAng4AIBIAALsRACAZAADDFgAgwgYAAJENACD2BgAAkQ0AIPcGAACRDQAg-AYAAJENACD5BgAAkQ0AIPoGAACRDQAg-wYAAJENACARAwAAkgwAIBIAAIkMACAZAAC8DAAgsQYAAL0MADCyBgAAXwAQswYAAL0MADDBBgEAAAABwgYBAKQLACHoBkAA_goAIekGQAD-CgAh9gYBAKQLACH3BgEApAsAIfgGAQD9CgAh-QYCAL4MACH6BgEA_QoAIfsGAAClCwAg_QYAAL8M_QYiAwAAAF8AIAEAAGAAMAIAAGEAIAEAAAAvACAVAwAAkgwAIBgAAIkMACAgAACXDAAgIQAAmAwAICIAAIkLACApAACZDAAgsQYAAJYMADCyBgAAZAAQswYAAJYMADDBBgEAwgsAIcIGAQCkCwAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAhhAcBAPYKACG3BwEA_QoAIbgHQACuCwAhuQcBAP0KACHiBwEA9goAIeMHAQD9CgAh5AcgAPQKACEBAAAAZAAgAQAAAEcAIBIFAAC7DAAgGAAAiQwAIBkAALwMACAoAACnDAAgsQYAALoMADCyBgAAZwAQswYAALoMADC0BgEApAsAIcEGAQDCCwAh2gYgAPQKACHoBkAA_goAIekGQAD-CgAh9QYBAKQLACH3BgEApAsAIYoHAQD2CgAhnwcAALYMygcixgcQALEMACHOBwEA9goAIQcFAACqFgAgGAAAuxEAIBkAAMMWACAoAAC7FgAgtAYAAJENACD1BgAAkQ0AIPcGAACRDQAgEgUAALsMACAYAACJDAAgGQAAvAwAICgAAKcMACCxBgAAugwAMLIGAABnABCzBgAAugwAMLQGAQCkCwAhwQYBAAAAAdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAh9wYBAKQLACGKBwEA9goAIZ8HAAC2DMoHIsYHEACxDAAhzgcBAPYKACEDAAAAZwAgAQAAaAAwAgAAaQAgAQAAAAMAIAEAAABkACABAAAALwAgHgcAAJEMACASAACJDAAgIwAAuQwAICQAAIkMACAlAACJDAAgJwAAqgwAILEGAAC1DAAwsgYAAG4AELMGAAC1DAAwwQYBAMILACHoBkAA_goAIekGQAD-CgAh7QYBAKQLACH2BgEApAsAIf0GAAC3DMsHIpUHQACuCwAhnwcAALYMygcivgcAAMsLvgcixgcQALEMACHMBwAAuAzMByPNBwEApAsAIc4HAQD2CgAhzwcgAPQKACHQBwEA_QoAIdEHAQD9CgAh0gcBAP0KACHTBwEApAsAIdQHAQCkCwAh1QdAAK4LACHWB0AArgsAIRIHAAD8FAAgEgAAuxEAICMAAMIWACAkAAC7EQAgJQAAuxEAICcAAL4WACDtBgAAkQ0AIPYGAACRDQAglQcAAJENACDMBwAAkQ0AIM0HAACRDQAg0AcAAJENACDRBwAAkQ0AINIHAACRDQAg0wcAAJENACDUBwAAkQ0AINUHAACRDQAg1gcAAJENACAgBwAAkQwAIBIAAIkMACAjAAC5DAAgJAAAiQwAICUAAIkMACAnAACqDAAgsQYAALUMADCyBgAAbgAQswYAALUMADDBBgEAAAAB6AZAAP4KACHpBkAA_goAIe0GAQCkCwAh9gYBAKQLACH9BgAAtwzLByKVB0AArgsAIZ8HAAC2DMoHIr4HAADLC74HIsYHEACxDAAhzAcAALgMzAcjzQcBAKQLACHOBwEA9goAIc8HIAD0CgAh0AcBAP0KACHRBwEA_QoAIdIHAQAAAAHTBwEApAsAIdQHAQCkCwAh1QdAAK4LACHWB0AArgsAIY4IAACzDAAgjwgAALQMACADAAAAbgAgAQAAbwAwAgAAcAAgAQAAABsAIAEAAAAvACABAAAAZwAgAQAAAC8AIAEAAAAvACAMGAAAiQwAICYAALIMACCxBgAAsAwAMLIGAAB3ABCzBgAAsAwAMMEGAQDCCwAh6AZAAP4KACH1BgEApAsAIcUHAQDCCwAhxgcQALEMACHHBwEA_QoAIcgHAQD9CgAhBRgAALsRACAmAADBFgAg9QYAAJENACDHBwAAkQ0AIMgHAACRDQAgDBgAAIkMACAmAACyDAAgsQYAALAMADCyBgAAdwAQswYAALAMADDBBgEAAAAB6AZAAP4KACH1BgEApAsAIcUHAQDCCwAhxgcQALEMACHHBwEA_QoAIcgHAQD9CgAhAwAAAHcAIAEAAHgAMAIAAHkAIAEAAAAvACABAAAAdwAgAQAAAG4AIAEAAABKACABAAAAQwAgAQAAAF8AIAEAAABnACABAAAALwAgAwAAAFIAIAEAAFMAMAIAAFQAIAMAAABXACABAABYADACAABZACAIEgAAsAsAILEGAACvDAAwsgYAAIUBABCzBgAArwwAMOgGQAD-CgAh9gYBAMILACG-BwAAywu-ByLEBwEA9goAIQESAAC7EQAgChIAALALACCxBgAArwwAMLIGAACFAQAQswYAAK8MADDoBkAA_goAIfYGAQDCCwAhvgcAAMsLvgcixAcBAPYKACGMCAAArQwAII0IAACuDAAgAwAAAIUBACABAACGAQAwAgAAhwEAIAkDAAD3CgAgEgAAsAsAILEGAACEDAAwsgYAAIkBABCzBgAAhAwAMMIGAQDCCwAh6AZAAP4KACHpBkAA_goAIfYGAQDCCwAhAQAAAIkBACAOAwAA9woAIAUAAIYMACASAACwCwAgLQAAhwwAILEGAACFDAAwsgYAAIsBABCzBgAAhQwAMLQGAQDCCwAhwQYBAMILACHCBgEAwgsAIegGQAD-CgAh6QZAAP4KACH2BgEAwgsAIYoIAQCkCwAhAQAAAIsBACABAAAACQAgAwAAAG4AIAEAAG8AMAIAAHAAIAMAAABfACABAABgADACAABhACABAAAALwAgLxMAALIWACAUAACzFgAgFQAAtBYAIBYAALUWACAXAADoEAAgHQAAthYAIB4AALcWACAhAACwFgAgIgAA7hAAICsAALgWACAsAAC5FgAgLgAAuhYAIC8AALsWACAwAAC7EQAgMQAAvBYAIDIAAL0WACAzAADnEAAgNAAAsBYAIDUAALYWACA2AACxFgAgNwAAuxYAIDgAALsWACA5AAC-FgAgOgAAvxYAIDsAAO0QACA8AADsEAAgPQAA6xAAIEEAAOoQACBCAADAFgAgQwAArBYAIIoHAACRDQAgpQcAAJENACCmBwAAkQ0AIKcHAACRDQAgqAcAAJENACCqBwAAkQ0AIKsHAACRDQAgrAcAAJENACCwBwAAkQ0AILEHAACRDQAgsgcAAJENACCzBwAAkQ0AILQHAACRDQAgtQcAAJENACC2BwAAkQ0AILcHAACRDQAguAcAAJENACA4EwAAngwAIBQAAJ8MACAVAACgDAAgFgAAoQwAIBcAAIMLACAdAACiDAAgHgAAowwAICEAAJgMACAiAACJCwAgKwAApAwAICwAAKUMACAuAACmDAAgLwAApwwAIDAAAIkMACAxAACoDAAgMgAAqQwAIDMAAIILACA0AACYDAAgNQAAogwAIDYAAJkMACA3AACnDAAgOAAApwwAIDkAAKoMACA6AACrDAAgOwAAiAsAIDwAAIcLACA9AACGCwAgQQAAhQsAIEIAAKwMACBDAACKDAAgsQYAAJoMADCyBgAALwAQswYAAJoMADDBBgEAAAAB6AZAAP4KACHpBkAA_goAIf0GAACdDLAHIooHAQD9CgAhpAcBAAAAAaUHAQD9CgAhpgcBAP0KACGnBwEA_QoAIagHQACuCwAhqgcAAJsMqgcjqwcBAP0KACGsBwEA_QoAIa4HAACcDK4HIrAHAQD9CgAhsQcBAAAAAbIHQACuCwAhswdAAK4LACG0BwEApAsAIbUHQACuCwAhtgcBAP0KACG3BwEAAAABuAdAAK4LACEDAAAALwAgAQAAkQEAMAIAAJIBACADAAAAKwAgAQAALAAwAgAALQAgDAMAAJ4OACAYAAC7EQAgIAAArxYAICEAALAWACAiAADuEAAgKQAAsRYAIMIGAACRDQAg9QYAAJENACC3BwAAkQ0AILgHAACRDQAguQcAAJENACDjBwAAkQ0AIBUDAACSDAAgGAAAiQwAICAAAJcMACAhAACYDAAgIgAAiQsAICkAAJkMACCxBgAAlgwAMLIGAABkABCzBgAAlgwAMMEGAQAAAAHCBgEApAsAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIYQHAQD2CgAhtwcBAAAAAbgHQACuCwAhuQcBAP0KACHiBwEAAAAB4wcBAP0KACHkByAA9AoAIQMAAABkACABAACVAQAwAgAAlgEAIAMAAABDACABAABEADACAABFACADAAAAUgAgAQAAUwAwAgAAVAAgAwAAAGcAIAEAAGgAMAIAAGkAIAMAAABuACABAABvADACAABwACADAAAAbgAgAQAAbwAwAgAAcAAgAwAAAHcAIAEAAHgAMAIAAHkAIA4YAACJDAAgsQYAAJUMADCyBgAAngEAELMGAACVDAAwwQYBAMILACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACHuBgEA_QoAIe8GAQD9CgAh9QYBAKQLACGEBwEA9goAIbkHAQD9CgAhugdAAK4LACEGGAAAuxEAIO4GAACRDQAg7wYAAJENACD1BgAAkQ0AILkHAACRDQAgugcAAJENACAOGAAAiQwAILEGAACVDAAwsgYAAJ4BABCzBgAAlQwAMMEGAQAAAAHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACHuBgEA_QoAIe8GAQD9CgAh9QYBAKQLACGEBwEA9goAIbkHAQD9CgAhugdAAK4LACEDAAAAngEAIAEAAJ8BADACAACgAQAgAQAAAC8AIA0DAACSDAAgGAAAiQwAILEGAACUDAAwsgYAAKMBABCzBgAAlAwAMMEGAQDCCwAhwgYBAKQLACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIYQHAQD2CgAhhQcBAPYKACEEAwAAng4AIBgAALsRACDCBgAAkQ0AIPUGAACRDQAgDQMAAJIMACAYAACJDAAgsQYAAJQMADCyBgAAowEAELMGAACUDAAwwQYBAAAAAcIGAQCkCwAh2gYgAPQKACHoBkAA_goAIekGQAD-CgAh9QYBAKQLACGEBwEA9goAIYUHAQD2CgAhAwAAAKMBACABAACkAQAwAgAApQEAIAEAAABHACABAAAALwAgDgMAAJIMACAYAACJDAAgsQYAAJMMADCyBgAAqQEAELMGAACTDAAwwQYBAMILACHCBgEApAsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIe4GAQD2CgAh7wYBAP0KACH1BgEApAsAIYQHAQD9CgAhBgMAAJ4OACAYAAC7EQAgwgYAAJENACDvBgAAkQ0AIPUGAACRDQAghAcAAJENACAOAwAAkgwAIBgAAIkMACCxBgAAkwwAMLIGAACpAQAQswYAAJMMADDBBgEAAAABwgYBAKQLACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACHuBgEA9goAIe8GAQD9CgAh9QYBAKQLACGEBwEA_QoAIQMAAACpAQAgAQAAqgEAMAIAAKsBACABAAAARwAgAQAAAC8AIBYDAACSDAAgBwAAkQwAIBgAAIkMACCxBgAAkAwAMLIGAACvAQAQswYAAJAMADDBBgEAwgsAIcIGAQCkCwAhygYBAP0KACHLBgEA_QoAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIe0GAQCkCwAh7gYBAP0KACHvBgEA_QoAIfAGAQD9CgAh8QYBAP0KACHyBgEA_QoAIfMGAQD9CgAh9AYCAPUKACH1BgEApAsAIQ4DAACeDgAgBwAA_BQAIBgAALsRACDCBgAAkQ0AIMoGAACRDQAgywYAAJENACDtBgAAkQ0AIO4GAACRDQAg7wYAAJENACDwBgAAkQ0AIPEGAACRDQAg8gYAAJENACDzBgAAkQ0AIPUGAACRDQAgFgMAAJIMACAHAACRDAAgGAAAiQwAILEGAACQDAAwsgYAAK8BABCzBgAAkAwAMMEGAQAAAAHCBgEApAsAIcoGAQD9CgAhywYBAP0KACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACHtBgEApAsAIe4GAQD9CgAh7wYBAP0KACHwBgEA_QoAIfEGAQD9CgAh8gYBAP0KACHzBgEA_QoAIfQGAgD1CgAh9QYBAKQLACEDAAAArwEAIAEAALABADACAACxAQAgAQAAABsAIAEAAABHACABAAAALwAgDQMAAPcKACAYAACJDAAgPwAAigwAILEGAACPDAAwsgYAALYBABCzBgAAjwwAMMEGAQDCCwAhwgYBAMILACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIYoHAQD2CgAhBAMAAJ4OACAYAAC7EQAgPwAArBYAIPUGAACRDQAgDgMAAPcKACAYAACJDAAgPwAAigwAILEGAACPDAAwsgYAALYBABCzBgAAjwwAMMEGAQAAAAHCBgEAwgsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAhigcBAPYKACGLCAAAjgwAIAMAAAC2AQAgAQAAtwEAMAIAALgBACABAAAALwAgEAcAAPELACAYAACJDAAgPgAAjAwAIEAAAI0MACCxBgAAiwwAMLIGAAC7AQAQswYAAIsMADDBBgEAwgsAIegGQAD-CgAh6QZAAP4KACHtBgEAwgsAIfUGAQCkCwAhhgcBAP0KACGHBwEApAsAIYgHAQCkCwAhiQcQAK8LACEJBwAA_BQAIBgAALsRACA-AACtFgAgQAAArhYAIPUGAACRDQAghgcAAJENACCHBwAAkQ0AIIgHAACRDQAgiQcAAJENACAQBwAA8QsAIBgAAIkMACA-AACMDAAgQAAAjQwAILEGAACLDAAwsgYAALsBABCzBgAAiwwAMMEGAQAAAAHoBkAA_goAIekGQAD-CgAh7QYBAAAAAfUGAQCkCwAhhgcBAP0KACGHBwEApAsAIYgHAQCkCwAhiQcQAK8LACEDAAAAuwEAIAEAALwBADACAAC9AQAgAQAAALYBACAMDQEA9goAIRgAAIkMACA_AACKDAAgsQYAAIgMADCyBgAAwAEAELMGAACIDAAwwQYBAMILACHoBkAA_goAIekGQAD-CgAh9QYBAKQLACGKBwEA9goAIYsHAQD9CgAhAQAAAMABACABAAAALwAgAwAAALsBACABAAC8AQAwAgAAvQEAIAEAAAC7AQAgAQAAAC8AIAEAAAC7AQAgBBgAALsRACA_AACsFgAg9QYAAJENACCLBwAAkQ0AIAwNAQD2CgAhGAAAiQwAID8AAIoMACCxBgAAiAwAMLIGAADAAQAQswYAAIgMADDBBgEAAAAB6AZAAP4KACHpBkAA_goAIfUGAQCkCwAhigcBAPYKACGLBwEA_QoAIQMAAADAAQAgAQAAxwEAMAIAAMgBACADAAAAuwEAIAEAALwBADACAAC9AQAgAQAAADEAIAEAAAA3ACABAAAAOwAgAQAAAD8AIAEAAABDACABAAAAUgAgAQAAAFcAIAEAAACFAQAgAQAAAG4AIAEAAABfACABAAAALwAgAQAAACsAIAEAAABkACABAAAAQwAgAQAAAFIAIAEAAABnACABAAAAbgAgAQAAAG4AIAEAAAB3ACABAAAAngEAIAEAAACjAQAgAQAAAKkBACABAAAArwEAIAEAAAC2AQAgAQAAAMABACABAAAAuwEAIAMAAABuACABAABvADACAABwACABAAAAuwEAIAMAAACvAQAgAQAAsAEAMAIAALEBACABAAAAGQAgAQAAABkAIAEAAAARACABAAAAKwAgAQAAAG4AIAEAAACvAQAgEUsAAOoLACCxBgAA6AsAMLIGAADuAQAQswYAAOgLADDBBgEAwgsAIegGQAD-CgAh6QZAAP4KACH9BgAA6QvxByLnBwEAwgsAIegHAgD1CgAh6QcCAPUKACHqBwIA9QoAIesHAgD1CgAh7AcCAPUKACHtBwIA9QoAIe4HAQD9CgAh7wcBAP0KACEBAAAA7gEAIAEAAAARACAFAwAAng4AIAUAAKoWACASAAC7EQAgLQAAqxYAIIoIAACRDQAgDgMAAPcKACAFAACGDAAgEgAAsAsAIC0AAIcMACCxBgAAhQwAMLIGAACLAQAQswYAAIUMADC0BgEAwgsAIcEGAQAAAAHCBgEAwgsAIegGQAD-CgAh6QZAAP4KACH2BgEAAAABiggBAKQLACEDAAAAiwEAIAEAAPEBADACAADyAQAgAQAAAA0AIAEAAACLAQAgAwAAAAMAIAEAAAQAMAIAAAUAIAMAAABkACABAACVAQAwAgAAlgEAIAMAAAA_ACABAABAADACAABBACACAwAAng4AIBIAALsRACAJAwAA9woAIBIAALALACCxBgAAhAwAMLIGAACJAQAQswYAAIQMADDCBgEAwgsAIegGQAD-CgAh6QZAAP4KACH2BgEAAAABAwAAAIkBACABAAD5AQAwAgAA-gEAIAMAAAC2AQAgAQAAtwEAMAIAALgBACADAAAArwEAIAEAALABADACAACxAQAgAwAAAKkBACABAACqAQAwAgAAqwEAIAMAAACjAQAgAQAApAEAMAIAAKUBACADAAAAXwAgAQAAYAAwAgAAYQAgAwAAAIsBACABAADxAQAwAgAA8gEAIAMAAAARACABAAASADACAAATACABAAAACQAgAQAAAAMAIAEAAABkACABAAAAPwAgAQAAAIkBACABAAAAtgEAIAEAAACvAQAgAQAAAKkBACABAAAAowEAIAEAAABfACABAAAAiwEAIAEAAAARACAGUQAAgQsAILEGAACDDAAwsgYAAI8CABCzBgAAgwwAMMEGAQDCCwAhigcBAPYKACEBAAAAjwIAIAMAAAANACABAAAOADACAAAPACADAAAAZwAgAQAAaAAwAgAAaQAgAwAAAIsBACABAADxAQAwAgAA8gEAIAEAAAANACABAAAAZwAgAQAAAIsBACABAAAAAwAgAQAAAAEAIAFRAADmEAAgAwAAAI8CACABAACZAgAwAgAAAQAgAwAAAI8CACABAACZAgAwAgAAAQAgAwAAAI8CACABAACZAgAwAgAAAQAgA1EAAKkWACDBBgEAAAABigcBAAAAAQFeAACdAgAgAsEGAQAAAAGKBwEAAAABAV4AAJ8CADABXgAAnwIAMANRAACfFgAgwQYBAO4MACGKBwEA7gwAIQIAAAABACBeAACiAgAgAsEGAQDuDAAhigcBAO4MACECAAAAjwIAIF4AAKQCACACAAAAjwIAIF4AAKQCACADAAAAAQAgZQAAnQIAIGYAAKICACABAAAAAQAgAQAAAI8CACADDAAAnBYAIGsAAJ4WACBsAACdFgAgBbEGAACCDAAwsgYAAKsCABCzBgAAggwAMMEGAQDbCgAhigcBAOAKACEDAAAAjwIAIAEAAKoCADBqAACrAgAgAwAAAI8CACABAACZAgAwAgAAAQAgAQAAAEEAIAEAAABBACADAAAAPwAgAQAAQAAwAgAAQQAgAwAAAD8AIAEAAEAAMAIAAEEAIAMAAAA_ACABAABAADACAABBACAEAwAAzhMAIBIAAMEPACDCBgEAAAAB9gYBAAAAAQFeAACzAgAgAsIGAQAAAAH2BgEAAAABAV4AALUCADABXgAAtQIAMAQDAACNFAAgEgAAvw8AIMIGAQDuDAAh9gYBAO4MACECAAAAQQAgXgAAuAIAIALCBgEA7gwAIfYGAQDuDAAhAgAAAD8AIF4AALoCACACAAAAPwAgXgAAugIAIAMAAABBACBlAACzAgAgZgAAuAIAIAEAAABBACABAAAAPwAgAwwAAJkWACBrAACbFgAgbAAAmhYAIAWxBgAAgQwAMLIGAADBAgAQswYAAIEMADDCBgEA2woAIfYGAQDbCgAhAwAAAD8AIAEAAMACADBqAADBAgAgAwAAAD8AIAEAAEAAMAIAAEEAIAEAAAD6AQAgAQAAAPoBACADAAAAiQEAIAEAAPkBADACAAD6AQAgAwAAAIkBACABAAD5AQAwAgAA-gEAIAMAAACJAQAgAQAA-QEAMAIAAPoBACAGAwAAtxMAIBIAALMPACDCBgEAAAAB6AZAAAAAAekGQAAAAAH2BgEAAAABAV4AAMkCACAEwgYBAAAAAegGQAAAAAHpBkAAAAAB9gYBAAAAAQFeAADLAgAwAV4AAMsCADAGAwAA8BMAIBIAALEPACDCBgEA7gwAIegGQAD9DAAh6QZAAP0MACH2BgEA7gwAIQIAAAD6AQAgXgAAzgIAIATCBgEA7gwAIegGQAD9DAAh6QZAAP0MACH2BgEA7gwAIQIAAACJAQAgXgAA0AIAIAIAAACJAQAgXgAA0AIAIAMAAAD6AQAgZQAAyQIAIGYAAM4CACABAAAA-gEAIAEAAACJAQAgAwwAAJYWACBrAACYFgAgbAAAlxYAIAexBgAAgAwAMLIGAADXAgAQswYAAIAMADDCBgEA2woAIegGQAD5CgAh6QZAAPkKACH2BgEA2woAIQMAAACJAQAgAQAA1gIAMGoAANcCACADAAAAiQEAIAEAAPkBADACAAD6AQAgAQAAAPIBACABAAAA8gEAIAMAAACLAQAgAQAA8QEAMAIAAPIBACADAAAAiwEAIAEAAPEBADACAADyAQAgAwAAAIsBACABAADxAQAwAgAA8gEAIAsDAACrDQAgBQAAig4AIBIAAKoNACAtAACsDQAgtAYBAAAAAcEGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAH2BgEAAAABiggBAAAAAQFeAADfAgAgB7QGAQAAAAHBBgEAAAABwgYBAAAAAegGQAAAAAHpBkAAAAAB9gYBAAAAAYoIAQAAAAEBXgAA4QIAMAFeAADhAgAwAQAAAAkAIAsDAACnDQAgBQAAiA4AIBIAAKYNACAtAACoDQAgtAYBAO4MACHBBgEA7gwAIcIGAQDuDAAh6AZAAP0MACHpBkAA_QwAIfYGAQDuDAAhiggBAIgNACECAAAA8gEAIF4AAOUCACAHtAYBAO4MACHBBgEA7gwAIcIGAQDuDAAh6AZAAP0MACHpBkAA_QwAIfYGAQDuDAAhiggBAIgNACECAAAAiwEAIF4AAOcCACACAAAAiwEAIF4AAOcCACABAAAACQAgAwAAAPIBACBlAADfAgAgZgAA5QIAIAEAAADyAQAgAQAAAIsBACAEDAAAkxYAIGsAAJUWACBsAACUFgAgiggAAJENACAKsQYAAP8LADCyBgAA7wIAELMGAAD_CwAwtAYBANsKACHBBgEA2woAIcIGAQDbCgAh6AZAAPkKACHpBkAA-QoAIfYGAQDbCgAhiggBAOMKACEDAAAAiwEAIAEAAO4CADBqAADvAgAgAwAAAIsBACABAADxAQAwAgAA8gEAIAEAAAAdACABAAAAHQAgAwAAABsAIAEAABwAMAIAAB0AIAMAAAAbACABAAAcADACAAAdACADAAAAGwAgAQAAHAAwAgAAHQAgGwgAAPYVACAOAAD3FQAgDwAA-BUAIBAAAPkVACARAAD6FQAgKAAA_BUAIEUAAPsVACBGAAD9FQAgRwAA_hUAIEgAAP8VACBJAACKFgAgwQYBAAAAAegGQAAAAAHpBkAAAAABigcBAAAAAacHAQAAAAGqBwAAAKoHAqwHAQAAAAG4B0AAAAABgggBAAAAAYMIAQAAAAGECAEAAAABhQhAAAAAAYYIIAAAAAGHCAEAAAABiAgBAAAAAYkIAQAAAAEBXgAA9wIAIBDBBgEAAAAB6AZAAAAAAekGQAAAAAGKBwEAAAABpwcBAAAAAaoHAAAAqgcCrAcBAAAAAbgHQAAAAAGCCAEAAAABgwgBAAAAAYQIAQAAAAGFCEAAAAABhgggAAAAAYcIAQAAAAGICAEAAAABiQgBAAAAAQFeAAD5AgAwAV4AAPkCADABAAAAGQAgAQAAABkAIBsIAACuFQAgDgAArxUAIA8AALAVACAQAACxFQAgEQAAshUAICgAALQVACBFAACzFQAgRgAAtRUAIEcAALYVACBIAAC3FQAgSQAAiBYAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIYoHAQDuDAAhpwcBAO4MACGqBwAArBWqByKsBwEA7gwAIbgHQACVDQAhgggBAO4MACGDCAEAiA0AIYQIAQCIDQAhhQhAAP0MACGGCCAAuQ0AIYcIAQCIDQAhiAgBAIgNACGJCAEAiA0AIQIAAAAdACBeAAD-AgAgEMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIYoHAQDuDAAhpwcBAO4MACGqBwAArBWqByKsBwEA7gwAIbgHQACVDQAhgggBAO4MACGDCAEAiA0AIYQIAQCIDQAhhQhAAP0MACGGCCAAuQ0AIYcIAQCIDQAhiAgBAIgNACGJCAEAiA0AIQIAAAAbACBeAACAAwAgAgAAABsAIF4AAIADACABAAAAGQAgAQAAABkAIAMAAAAdACBlAAD3AgAgZgAA_gIAIAEAAAAdACABAAAAGwAgCQwAAJAWACBrAACSFgAgbAAAkRYAILgHAACRDQAggwgAAJENACCECAAAkQ0AIIcIAACRDQAgiAgAAJENACCJCAAAkQ0AIBOxBgAA-wsAMLIGAACJAwAQswYAAPsLADDBBgEA2woAIegGQAD5CgAh6QZAAPkKACGKBwEA4AoAIacHAQDgCgAhqgcAAPwLqgcirAcBAOAKACG4B0AA4goAIYIIAQDgCgAhgwgBAOEKACGECAEA4QoAIYUIQAD5CgAhhgggAO0KACGHCAEA4QoAIYgIAQDjCgAhiQgBAOMKACEDAAAAGwAgAQAAiAMAMGoAAIkDACADAAAAGwAgAQAAHAAwAgAAHQAgDwkAAPkLACAKAAD5CwAgCwAA-gsAILEGAAD4CwAwsgYAABkAELMGAAD4CwAwwQYBAAAAAegGQAD-CgAh6QZAAP4KACGgBwEA9goAIaEHAQD2CgAhogcBAPYKACH_BwEA9goAIYAIAQD9CgAhgQgBAP0KACEBAAAAjAMAIAEAAACMAwAgBQkAAI4WACAKAACOFgAgCwAAjxYAIIAIAACRDQAggQgAAJENACADAAAAGQAgAQAAjwMAMAIAAIwDACADAAAAGQAgAQAAjwMAMAIAAIwDACADAAAAGQAgAQAAjwMAMAIAAIwDACAMCQAAixYAIAoAAIwWACALAACNFgAgwQYBAAAAAegGQAAAAAHpBkAAAAABoAcBAAAAAaEHAQAAAAGiBwEAAAAB_wcBAAAAAYAIAQAAAAGBCAEAAAABAV4AAJMDACAJwQYBAAAAAegGQAAAAAHpBkAAAAABoAcBAAAAAaEHAQAAAAGiBwEAAAAB_wcBAAAAAYAIAQAAAAGBCAEAAAABAV4AAJUDADABXgAAlQMAMAwJAACTFQAgCgAAlBUAIAsAAJUVACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACGgBwEA7gwAIaEHAQDuDAAhogcBAO4MACH_BwEA7gwAIYAIAQCIDQAhgQgBAIgNACECAAAAjAMAIF4AAJgDACAJwQYBAO4MACHoBkAA_QwAIekGQAD9DAAhoAcBAO4MACGhBwEA7gwAIaIHAQDuDAAh_wcBAO4MACGACAEAiA0AIYEIAQCIDQAhAgAAABkAIF4AAJoDACACAAAAGQAgXgAAmgMAIAMAAACMAwAgZQAAkwMAIGYAAJgDACABAAAAjAMAIAEAAAAZACAFDAAAkBUAIGsAAJIVACBsAACRFQAggAgAAJENACCBCAAAkQ0AIAyxBgAA9wsAMLIGAAChAwAQswYAAPcLADDBBgEA2woAIegGQAD5CgAh6QZAAPkKACGgBwEA4AoAIaEHAQDgCgAhogcBAOAKACH_BwEA4AoAIYAIAQDhCgAhgQgBAOEKACEDAAAAGQAgAQAAoAMAMGoAAKEDACADAAAAGQAgAQAAjwMAMAIAAIwDACAMBwAA8QsAILEGAAD2CwAwsgYAABUAELMGAAD2CwAwwQYBAAAAAe0GAQAAAAH5BwEA9goAIfoHAQD9CgAh-wcBAP0KACH8BwEA9goAIf0HAQD9CgAh_gcBAP0KACEBAAAApAMAIAEAAACkAwAgBQcAAPwUACD6BwAAkQ0AIPsHAACRDQAg_QcAAJENACD-BwAAkQ0AIAMAAAAVACABAACnAwAwAgAApAMAIAMAAAAVACABAACnAwAwAgAApAMAIAMAAAAVACABAACnAwAwAgAApAMAIAkHAACPFQAgwQYBAAAAAe0GAQAAAAH5BwEAAAAB-gcBAAAAAfsHAQAAAAH8BwEAAAAB_QcBAAAAAf4HAQAAAAEBXgAAqwMAIAjBBgEAAAAB7QYBAAAAAfkHAQAAAAH6BwEAAAAB-wcBAAAAAfwHAQAAAAH9BwEAAAAB_gcBAAAAAQFeAACtAwAwAV4AAK0DADAJBwAAjhUAIMEGAQDuDAAh7QYBAO4MACH5BwEA7gwAIfoHAQCIDQAh-wcBAIgNACH8BwEA7gwAIf0HAQCIDQAh_gcBAIgNACECAAAApAMAIF4AALADACAIwQYBAO4MACHtBgEA7gwAIfkHAQDuDAAh-gcBAIgNACH7BwEAiA0AIfwHAQDuDAAh_QcBAIgNACH-BwEAiA0AIQIAAAAVACBeAACyAwAgAgAAABUAIF4AALIDACADAAAApAMAIGUAAKsDACBmAACwAwAgAQAAAKQDACABAAAAFQAgBwwAAIsVACBrAACNFQAgbAAAjBUAIPoHAACRDQAg-wcAAJENACD9BwAAkQ0AIP4HAACRDQAgC7EGAAD1CwAwsgYAALkDABCzBgAA9QsAMMEGAQDbCgAh7QYBANsKACH5BwEA4AoAIfoHAQDhCgAh-wcBAOEKACH8BwEA4AoAIf0HAQDhCgAh_gcBAOEKACEDAAAAFQAgAQAAuAMAMGoAALkDACADAAAAFQAgAQAApwMAMAIAAKQDACABAAAAIQAgAQAAACEAIAMAAAAXACABAAAgADACAAAhACADAAAAFwAgAQAAIAAwAgAAIQAgAwAAABcAIAEAACAAMAIAACEAIAgHAACJFQAgDQAAihUAIMEGAQAAAAHtBgEAAAABigcBAAAAAacHAQAAAAH3BwEAAAAB-AcBAAAAAQFeAADBAwAgBsEGAQAAAAHtBgEAAAABigcBAAAAAacHAQAAAAH3BwEAAAAB-AcBAAAAAQFeAADDAwAwAV4AAMMDADABAAAAGQAgCAcAAIcVACANAACIFQAgwQYBAO4MACHtBgEA7gwAIYoHAQDuDAAhpwcBAO4MACH3BwEA7gwAIfgHAQCIDQAhAgAAACEAIF4AAMcDACAGwQYBAO4MACHtBgEA7gwAIYoHAQDuDAAhpwcBAO4MACH3BwEA7gwAIfgHAQCIDQAhAgAAABcAIF4AAMkDACACAAAAFwAgXgAAyQMAIAEAAAAZACADAAAAIQAgZQAAwQMAIGYAAMcDACABAAAAIQAgAQAAABcAIAQMAACEFQAgawAAhhUAIGwAAIUVACD4BwAAkQ0AIAmxBgAA9AsAMLIGAADRAwAQswYAAPQLADDBBgEA2woAIe0GAQDbCgAhigcBAOAKACGnBwEA4AoAIfcHAQDgCgAh-AcBAOMKACEDAAAAFwAgAQAA0AMAMGoAANEDACADAAAAFwAgAQAAIAAwAgAAIQAgCAcAAPELACCxBgAA8wsAMLIGAAAmABCzBgAA8wsAMMEGAQAAAAHtBgEAAAAB9QcCAPUKACH2BwIA9QoAIQEAAADUAwAgAQAAANQDACABBwAA_BQAIAMAAAAmACABAADXAwAwAgAA1AMAIAMAAAAmACABAADXAwAwAgAA1AMAIAMAAAAmACABAADXAwAwAgAA1AMAIAUHAACDFQAgwQYBAAAAAe0GAQAAAAH1BwIAAAAB9gcCAAAAAQFeAADbAwAgBMEGAQAAAAHtBgEAAAAB9QcCAAAAAfYHAgAAAAEBXgAA3QMAMAFeAADdAwAwBQcAAIIVACDBBgEA7gwAIe0GAQDuDAAh9QcCAIcNACH2BwIAhw0AIQIAAADUAwAgXgAA4AMAIATBBgEA7gwAIe0GAQDuDAAh9QcCAIcNACH2BwIAhw0AIQIAAAAmACBeAADiAwAgAgAAACYAIF4AAOIDACADAAAA1AMAIGUAANsDACBmAADgAwAgAQAAANQDACABAAAAJgAgBQwAAP0UACBrAACAFQAgbAAA_xQAIO0BAAD-FAAg7gEAAIEVACAHsQYAAPILADCyBgAA6QMAELMGAADyCwAwwQYBANsKACHtBgEA2woAIfUHAgDuCgAh9gcCAO4KACEDAAAAJgAgAQAA6AMAMGoAAOkDACADAAAAJgAgAQAA1wMAMAIAANQDACAKBwAA8QsAIEwBAPYKACGxBgAA8AsAMLIGAAAoABCzBgAA8AsAMMEGAQAAAAHtBgEAAAAB8gcBAPYKACHzBwIA9QoAIfQHAQD2CgAhAQAAAOwDACABAAAA7AMAIAEHAAD8FAAgAwAAACgAIAEAAO8DADACAADsAwAgAwAAACgAIAEAAO8DADACAADsAwAgAwAAACgAIAEAAO8DADACAADsAwAgBwcAAPsUACBMAQAAAAHBBgEAAAAB7QYBAAAAAfIHAQAAAAHzBwIAAAAB9AcBAAAAAQFeAADzAwAgBkwBAAAAAcEGAQAAAAHtBgEAAAAB8gcBAAAAAfMHAgAAAAH0BwEAAAABAV4AAPUDADABXgAA9QMAMAcHAAD6FAAgTAEA7gwAIcEGAQDuDAAh7QYBAO4MACHyBwEA7gwAIfMHAgCHDQAh9AcBAO4MACECAAAA7AMAIF4AAPgDACAGTAEA7gwAIcEGAQDuDAAh7QYBAO4MACHyBwEA7gwAIfMHAgCHDQAh9AcBAO4MACECAAAAKAAgXgAA-gMAIAIAAAAoACBeAAD6AwAgAwAAAOwDACBlAADzAwAgZgAA-AMAIAEAAADsAwAgAQAAACgAIAUMAAD1FAAgawAA-BQAIGwAAPcUACDtAQAA9hQAIO4BAAD5FAAgCUwBAOAKACGxBgAA7wsAMLIGAACBBAAQswYAAO8LADDBBgEA2woAIe0GAQDbCgAh8gcBAOAKACHzBwIA7goAIfQHAQDgCgAhAwAAACgAIAEAAIAEADBqAACBBAAgAwAAACgAIAEAAO8DADACAADsAwAgAQAAABMAIAEAAAATACADAAAAEQAgAQAAEgAwAgAAEwAgAwAAABEAIAEAABIAMAIAABMAIAMAAAARACABAAASADACAAATACAMAwAAjA0AIAcAAIsNACBKAAC7DgAgTAAAjQ0AILQGAQAAAAG1BgEAAAABwQYBAAAAAcIGAQAAAAHoBkAAAAAB6QZAAAAAAe0GAQAAAAH9BgAAAPIHAgFeAACJBAAgCLQGAQAAAAG1BgEAAAABwQYBAAAAAcIGAQAAAAHoBkAAAAAB6QZAAAAAAe0GAQAAAAH9BgAAAPIHAgFeAACLBAAwAV4AAIsEADAMAwAAgA0AIAcAAP8MACBKAAC5DgAgTAAAgQ0AILQGAQDuDAAhtQYBAO4MACHBBgEA7gwAIcIGAQDuDAAh6AZAAP0MACHpBkAA_QwAIe0GAQDuDAAh_QYAAPwM8gciAgAAABMAIF4AAI4EACAItAYBAO4MACG1BgEA7gwAIcEGAQDuDAAhwgYBAO4MACHoBkAA_QwAIekGQAD9DAAh7QYBAO4MACH9BgAA_AzyByICAAAAEQAgXgAAkAQAIAIAAAARACBeAACQBAAgAwAAABMAIGUAAIkEACBmAACOBAAgAQAAABMAIAEAAAARACADDAAA8hQAIGsAAPQUACBsAADzFAAgC7EGAADrCwAwsgYAAJcEABCzBgAA6wsAMLQGAQDbCgAhtQYBANsKACHBBgEA2woAIcIGAQDbCgAh6AZAAPkKACHpBkAA-QoAIe0GAQDbCgAh_QYAAOwL8gciAwAAABEAIAEAAJYEADBqAACXBAAgAwAAABEAIAEAABIAMAIAABMAIBFLAADqCwAgsQYAAOgLADCyBgAA7gEAELMGAADoCwAwwQYBAAAAAegGQAD-CgAh6QZAAP4KACH9BgAA6QvxByLnBwEAAAAB6AcCAPUKACHpBwIA9QoAIeoHAgD1CgAh6wcCAPUKACHsBwIA9QoAIe0HAgD1CgAh7gcBAAAAAe8HAQD9CgAhAQAAAJoEACABAAAAmgQAIANLAADxFAAg7gcAAJENACDvBwAAkQ0AIAMAAADuAQAgAQAAnQQAMAIAAJoEACADAAAA7gEAIAEAAJ0EADACAACaBAAgAwAAAO4BACABAACdBAAwAgAAmgQAIA5LAADwFAAgwQYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAADxBwLnBwEAAAAB6AcCAAAAAekHAgAAAAHqBwIAAAAB6wcCAAAAAewHAgAAAAHtBwIAAAAB7gcBAAAAAe8HAQAAAAEBXgAAoQQAIA3BBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAAPEHAucHAQAAAAHoBwIAAAAB6QcCAAAAAeoHAgAAAAHrBwIAAAAB7AcCAAAAAe0HAgAAAAHuBwEAAAAB7wcBAAAAAQFeAACjBAAwAV4AAKMEADAOSwAA7xQAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAACJDfEHIucHAQDuDAAh6AcCAIcNACHpBwIAhw0AIeoHAgCHDQAh6wcCAIcNACHsBwIAhw0AIe0HAgCHDQAh7gcBAIgNACHvBwEAiA0AIQIAAACaBAAgXgAApgQAIA3BBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAiQ3xByLnBwEA7gwAIegHAgCHDQAh6QcCAIcNACHqBwIAhw0AIesHAgCHDQAh7AcCAIcNACHtBwIAhw0AIe4HAQCIDQAh7wcBAIgNACECAAAA7gEAIF4AAKgEACACAAAA7gEAIF4AAKgEACADAAAAmgQAIGUAAKEEACBmAACmBAAgAQAAAJoEACABAAAA7gEAIAcMAADqFAAgawAA7RQAIGwAAOwUACDtAQAA6xQAIO4BAADuFAAg7gcAAJENACDvBwAAkQ0AIBCxBgAA5AsAMLIGAACvBAAQswYAAOQLADDBBgEA2woAIegGQAD5CgAh6QZAAPkKACH9BgAA5QvxByLnBwEA2woAIegHAgDuCgAh6QcCAO4KACHqBwIA7goAIesHAgDuCgAh7AcCAO4KACHtBwIA7goAIe4HAQDhCgAh7wcBAOEKACEDAAAA7gEAIAEAAK4EADBqAACvBAAgAwAAAO4BACABAACdBAAwAgAAmgQAIAEAAAAtACABAAAALQAgAwAAACsAIAEAACwAMAIAAC0AIAMAAAArACABAAAsADACAAAtACADAAAAKwAgAQAALAAwAgAALQAgBwcAAIETACBEAADpFAAgwQYBAAAAAegGQAAAAAHtBgEAAAAB5QcBAAAAAeYHAQAAAAEBXgAAtwQAIAXBBgEAAAAB6AZAAAAAAe0GAQAAAAHlBwEAAAAB5gcBAAAAAQFeAAC5BAAwAV4AALkEADABAAAALwAgBwcAAP8SACBEAADoFAAgwQYBAO4MACHoBkAA_QwAIe0GAQDuDAAh5QcBAO4MACHmBwEAiA0AIQIAAAAtACBeAAC9BAAgBcEGAQDuDAAh6AZAAP0MACHtBgEA7gwAIeUHAQDuDAAh5gcBAIgNACECAAAAKwAgXgAAvwQAIAIAAAArACBeAAC_BAAgAQAAAC8AIAMAAAAtACBlAAC3BAAgZgAAvQQAIAEAAAAtACABAAAAKwAgBAwAAOUUACBrAADnFAAgbAAA5hQAIOYHAACRDQAgCLEGAADjCwAwsgYAAMcEABCzBgAA4wsAMMEGAQDbCgAh6AZAAPkKACHtBgEA2woAIeUHAQDgCgAh5gcBAOMKACEDAAAAKwAgAQAAxgQAMGoAAMcEACADAAAAKwAgAQAALAAwAgAALQAgAQAAAJYBACABAAAAlgEAIAMAAABkACABAACVAQAwAgAAlgEAIAMAAABkACABAACVAQAwAgAAlgEAIAMAAABkACABAACVAQAwAgAAlgEAIBIDAADzEgAgGAAAtRAAICAAALYQACAhAAC3EAAgIgAAuBAAICkAALkQACDBBgEAAAABwgYBAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAYQHAQAAAAG3BwEAAAABuAdAAAAAAbkHAQAAAAHiBwEAAAAB4wcBAAAAAeQHIAAAAAEBXgAAzwQAIAzBBgEAAAABwgYBAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAYQHAQAAAAG3BwEAAAABuAdAAAAAAbkHAQAAAAHiBwEAAAAB4wcBAAAAAeQHIAAAAAEBXgAA0QQAMAFeAADRBAAwAQAAAEcAIAEAAAAvACASAwAA8RIAIBgAAM0PACAgAADODwAgIQAAzw8AICIAANAPACApAADRDwAgwQYBAO4MACHCBgEAiA0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIYQHAQDuDAAhtwcBAIgNACG4B0AAlQ0AIbkHAQCIDQAh4gcBAO4MACHjBwEAiA0AIeQHIAC5DQAhAgAAAJYBACBeAADWBAAgDMEGAQDuDAAhwgYBAIgNACHoBkAA_QwAIekGQAD9DAAh9QYBAIgNACGEBwEA7gwAIbcHAQCIDQAhuAdAAJUNACG5BwEAiA0AIeIHAQDuDAAh4wcBAIgNACHkByAAuQ0AIQIAAABkACBeAADYBAAgAgAAAGQAIF4AANgEACABAAAARwAgAQAAAC8AIAMAAACWAQAgZQAAzwQAIGYAANYEACABAAAAlgEAIAEAAABkACAJDAAA4hQAIGsAAOQUACBsAADjFAAgwgYAAJENACD1BgAAkQ0AILcHAACRDQAguAcAAJENACC5BwAAkQ0AIOMHAACRDQAgD7EGAADiCwAwsgYAAOEEABCzBgAA4gsAMMEGAQDbCgAhwgYBAOMKACHoBkAA-QoAIekGQAD5CgAh9QYBAOMKACGEBwEA4AoAIbcHAQDhCgAhuAdAAOIKACG5BwEA4QoAIeIHAQDgCgAh4wcBAOEKACHkByAA7QoAIQMAAABkACABAADgBAAwagAA4QQAIAMAAABkACABAACVAQAwAgAAlgEAIAEAAABMACABAAAATAAgAwAAAEoAIAEAAEsAMAIAAEwAIAMAAABKACABAABLADACAABMACADAAAASgAgAQAASwAwAgAATAAgCBkAAOEUACAfAACzEAAgwQYBAAAAAfQGAgAAAAH3BgEAAAABhAcBAAAAAbcHAQAAAAHhBwIAAAABAV4AAOkEACAGwQYBAAAAAfQGAgAAAAH3BgEAAAABhAcBAAAAAbcHAQAAAAHhBwIAAAABAV4AAOsEADABXgAA6wQAMAgZAADgFAAgHwAAgxAAIMEGAQDuDAAh9AYCAIcNACH3BgEA7gwAIYQHAQDuDAAhtwcBAIgNACHhBwIAhw0AIQIAAABMACBeAADuBAAgBsEGAQDuDAAh9AYCAIcNACH3BgEA7gwAIYQHAQDuDAAhtwcBAIgNACHhBwIAhw0AIQIAAABKACBeAADwBAAgAgAAAEoAIF4AAPAEACADAAAATAAgZQAA6QQAIGYAAO4EACABAAAATAAgAQAAAEoAIAYMAADbFAAgawAA3hQAIGwAAN0UACDtAQAA3BQAIO4BAADfFAAgtwcAAJENACAJsQYAAOELADCyBgAA9wQAELMGAADhCwAwwQYBANsKACH0BgIA7goAIfcGAQDbCgAhhAcBAOAKACG3BwEA4QoAIeEHAgDuCgAhAwAAAEoAIAEAAPYEADBqAAD3BAAgAwAAAEoAIAEAAEsAMAIAAEwAIAEAAABQACABAAAAUAAgAwAAAE4AIAEAAE8AMAIAAFAAIAMAAABOACABAABPADACAABQACADAAAATgAgAQAATwAwAgAAUAAgChoAANoUACAdAACwEAAgHgAAsRAAIMEGAQAAAAH0BgIAAAABhAcBAAAAAYUHAQAAAAG3BwEAAAAB3wcBAAAAAeAHAgAAAAEBXgAA_wQAIAfBBgEAAAAB9AYCAAAAAYQHAQAAAAGFBwEAAAABtwcBAAAAAd8HAQAAAAHgBwIAAAABAV4AAIEFADABXgAAgQUAMAoaAADZFAAgHQAAjxAAIB4AAJAQACDBBgEA7gwAIfQGAgCHDQAhhAcBAO4MACGFBwEA7gwAIbcHAQCIDQAh3wcBAO4MACHgBwIAzw4AIQIAAABQACBeAACEBQAgB8EGAQDuDAAh9AYCAIcNACGEBwEA7gwAIYUHAQDuDAAhtwcBAIgNACHfBwEA7gwAIeAHAgDPDgAhAgAAAE4AIF4AAIYFACACAAAATgAgXgAAhgUAIAMAAABQACBlAAD_BAAgZgAAhAUAIAEAAABQACABAAAATgAgBwwAANQUACBrAADXFAAgbAAA1hQAIO0BAADVFAAg7gEAANgUACC3BwAAkQ0AIOAHAACRDQAgCrEGAADgCwAwsgYAAI0FABCzBgAA4AsAMMEGAQDbCgAh9AYCAO4KACGEBwEA4AoAIYUHAQDgCgAhtwcBAOEKACHfBwEA2woAIeAHAgCOCwAhAwAAAE4AIAEAAIwFADBqAACNBQAgAwAAAE4AIAEAAE8AMAIAAFAAIAEAAABFACABAAAARQAgAwAAAEMAIAEAAEQAMAIAAEUAIAMAAABDACABAABEADACAABFACADAAAAQwAgAQAARAAwAgAARQAgBxIAAPYPACAZAADoEgAgKgAA9w8AIPYGAQAAAAH3BgEAAAAB3QcBAAAAAd4HQAAAAAEBXgAAlQUAIAT2BgEAAAAB9wYBAAAAAd0HAQAAAAHeB0AAAAABAV4AAJcFADABXgAAlwUAMAEAAAAvACAHEgAA8w8AIBkAAOYSACAqAAD0DwAg9gYBAO4MACH3BgEA7gwAId0HAQCIDQAh3gdAAP0MACECAAAARQAgXgAAmwUAIAT2BgEA7gwAIfcGAQDuDAAh3QcBAIgNACHeB0AA_QwAIQIAAABDACBeAACdBQAgAgAAAEMAIF4AAJ0FACABAAAALwAgAwAAAEUAIGUAAJUFACBmAACbBQAgAQAAAEUAIAEAAABDACAEDAAA0RQAIGsAANMUACBsAADSFAAg3QcAAJENACAHsQYAAN8LADCyBgAApQUAELMGAADfCwAw9gYBANsKACH3BgEA2woAId0HAQDjCgAh3gdAAPkKACEDAAAAQwAgAQAApAUAMGoAAKUFACADAAAAQwAgAQAARAAwAgAARQAgAQAAAFQAIAEAAABUACADAAAAUgAgAQAAUwAwAgAAVAAgAwAAAFIAIAEAAFMAMAIAAFQAIAMAAABSACABAABTADACAABUACAHEgAArRAAIBsAAN0SACAcAACuEAAg9gYBAAAAAdcHAQAAAAHbBwEAAAAB3AdAAAAAAQFeAACtBQAgBPYGAQAAAAHXBwEAAAAB2wcBAAAAAdwHQAAAAAEBXgAArwUAMAFeAACvBQAwAQAAAC8AIAcSAACqEAAgGwAA2xIAIBwAAKsQACD2BgEA7gwAIdcHAQDuDAAh2wcBAIgNACHcB0AA_QwAIQIAAABUACBeAACzBQAgBPYGAQDuDAAh1wcBAO4MACHbBwEAiA0AIdwHQAD9DAAhAgAAAFIAIF4AALUFACACAAAAUgAgXgAAtQUAIAEAAAAvACADAAAAVAAgZQAArQUAIGYAALMFACABAAAAVAAgAQAAAFIAIAQMAADOFAAgawAA0BQAIGwAAM8UACDbBwAAkQ0AIAexBgAA3gsAMLIGAAC9BQAQswYAAN4LADD2BgEA2woAIdcHAQDbCgAh2wcBAOMKACHcB0AA-QoAIQMAAABSACABAAC8BQAwagAAvQUAIAMAAABSACABAABTADACAABUACABAAAAWQAgAQAAAFkAIAMAAABXACABAABYADACAABZACADAAAAVwAgAQAAWAAwAgAAWQAgAwAAAFcAIAEAAFgAMAIAAFkAIAgSAACeEAAgGwAAwRMAIOkGQAAAAAH2BgEAAAAB1wcBAAAAAdgHAgAAAAHZBwIAAAAB2gcgAAAAAQFeAADFBQAgBukGQAAAAAH2BgEAAAAB1wcBAAAAAdgHAgAAAAHZBwIAAAAB2gcgAAAAAQFeAADHBQAwAV4AAMcFADAIEgAAnBAAIBsAAP0TACDpBkAA_QwAIfYGAQDuDAAh1wcBAO4MACHYBwIAhw0AIdkHAgCHDQAh2gcgALkNACECAAAAWQAgXgAAygUAIAbpBkAA_QwAIfYGAQDuDAAh1wcBAO4MACHYBwIAhw0AIdkHAgCHDQAh2gcgALkNACECAAAAVwAgXgAAzAUAIAIAAABXACBeAADMBQAgAwAAAFkAIGUAAMUFACBmAADKBQAgAQAAAFkAIAEAAABXACAFDAAAyRQAIGsAAMwUACBsAADLFAAg7QEAAMoUACDuAQAAzRQAIAmxBgAA3QsAMLIGAADTBQAQswYAAN0LADDpBkAA-QoAIfYGAQDbCgAh1wcBANsKACHYBwIA7goAIdkHAgDuCgAh2gcgAO0KACEDAAAAVwAgAQAA0gUAMGoAANMFACADAAAAVwAgAQAAWAAwAgAAWQAgAQAAAGkAIAEAAABpACADAAAAZwAgAQAAaAAwAgAAaQAgAwAAAGcAIAEAAGgAMAIAAGkAIAMAAABnACABAABoADACAABpACAPBQAA3A8AIBgAAOcNACAZAADmDQAgKAAA6A0AILQGAQAAAAHBBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAfcGAQAAAAGKBwEAAAABnwcAAADKBwLGBxAAAAABzgcBAAAAAQFeAADbBQAgC7QGAQAAAAHBBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAfcGAQAAAAGKBwEAAAABnwcAAADKBwLGBxAAAAABzgcBAAAAAQFeAADdBQAwAV4AAN0FADABAAAAAwAgAQAAAGQAIAEAAAAvACAPBQAA2g8AIBgAALwNACAZAAC7DQAgKAAAvQ0AILQGAQCIDQAhwQYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIfcGAQCIDQAhigcBAO4MACGfBwAAtw3KByLGBxAAuA0AIc4HAQDuDAAhAgAAAGkAIF4AAOMFACALtAYBAIgNACHBBgEA7gwAIdoGIAC5DQAh6AZAAP0MACHpBkAA_QwAIfUGAQCIDQAh9wYBAIgNACGKBwEA7gwAIZ8HAAC3DcoHIsYHEAC4DQAhzgcBAO4MACECAAAAZwAgXgAA5QUAIAIAAABnACBeAADlBQAgAQAAAAMAIAEAAABkACABAAAALwAgAwAAAGkAIGUAANsFACBmAADjBQAgAQAAAGkAIAEAAABnACAIDAAAxBQAIGsAAMcUACBsAADGFAAg7QEAAMUUACDuAQAAyBQAILQGAACRDQAg9QYAAJENACD3BgAAkQ0AIA6xBgAA3AsAMLIGAADvBQAQswYAANwLADC0BgEA4woAIcEGAQDbCgAh2gYgAO0KACHoBkAA-QoAIekGQAD5CgAh9QYBAOMKACH3BgEA4woAIYoHAQDgCgAhnwcAANMLygcixgcQAM8LACHOBwEA4AoAIQMAAABnACABAADuBQAwagAA7wUAIAMAAABnACABAABoADACAABpACABAAAAcAAgAQAAAHAAIAMAAABuACABAABvADACAABwACADAAAAbgAgAQAAbwAwAgAAcAAgAwAAAG4AIAEAAG8AMAIAAHAAIBsHAADgDQAgEgAA4Q0AICMAAMASACAkAADiDQAgJQAA4w0AICcAAOQNACDBBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB9gYBAAAAAf0GAAAAywcClQdAAAAAAZ8HAAAAygcCvgcAAAC-BwLGBxAAAAABzAcAAADMBwPNBwEAAAABzgcBAAAAAc8HIAAAAAHQBwEAAAAB0QcBAAAAAdIHAQAAAAHTBwEAAAAB1AcBAAAAAdUHQAAAAAHWB0AAAAABAV4AAPcFACAVwQYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAfYGAQAAAAH9BgAAAMsHApUHQAAAAAGfBwAAAMoHAr4HAAAAvgcCxgcQAAAAAcwHAAAAzAcDzQcBAAAAAc4HAQAAAAHPByAAAAAB0AcBAAAAAdEHAQAAAAHSBwEAAAAB0wcBAAAAAdQHAQAAAAHVB0AAAAAB1gdAAAAAAQFeAAD5BQAwAV4AAPkFADABAAAAGwAgAQAAAC8AIAEAAABnACABAAAALwAgAQAAAC8AIBsHAADMDQAgEgAAzQ0AICMAAL4SACAkAADODQAgJQAAzw0AICcAANANACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACHtBgEAiA0AIfYGAQCIDQAh_QYAAMgNywcilQdAAJUNACGfBwAAtw3KByK-BwAAyQ2-ByLGBxAAuA0AIcwHAADKDcwHI80HAQCIDQAhzgcBAO4MACHPByAAuQ0AIdAHAQCIDQAh0QcBAIgNACHSBwEAiA0AIdMHAQCIDQAh1AcBAIgNACHVB0AAlQ0AIdYHQACVDQAhAgAAAHAAIF4AAIEGACAVwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh7QYBAIgNACH2BgEAiA0AIf0GAADIDcsHIpUHQACVDQAhnwcAALcNygcivgcAAMkNvgcixgcQALgNACHMBwAAyg3MByPNBwEAiA0AIc4HAQDuDAAhzwcgALkNACHQBwEAiA0AIdEHAQCIDQAh0gcBAIgNACHTBwEAiA0AIdQHAQCIDQAh1QdAAJUNACHWB0AAlQ0AIQIAAABuACBeAACDBgAgAgAAAG4AIF4AAIMGACABAAAAGwAgAQAAAC8AIAEAAABnACABAAAALwAgAQAAAC8AIAMAAABwACBlAAD3BQAgZgAAgQYAIAEAAABwACABAAAAbgAgEQwAAL8UACBrAADCFAAgbAAAwRQAIO0BAADAFAAg7gEAAMMUACDtBgAAkQ0AIPYGAACRDQAglQcAAJENACDMBwAAkQ0AIM0HAACRDQAg0AcAAJENACDRBwAAkQ0AINIHAACRDQAg0wcAAJENACDUBwAAkQ0AINUHAACRDQAg1gcAAJENACAYsQYAANILADCyBgAAjwYAELMGAADSCwAwwQYBANsKACHoBkAA-QoAIekGQAD5CgAh7QYBAOMKACH2BgEA4woAIf0GAADUC8sHIpUHQADiCgAhnwcAANMLygcivgcAAMcLvgcixgcQAM8LACHMBwAA1QvMByPNBwEA4woAIc4HAQDgCgAhzwcgAO0KACHQBwEA4QoAIdEHAQDhCgAh0gcBAOEKACHTBwEA4woAIdQHAQDjCgAh1QdAAOIKACHWB0AA4goAIQMAAABuACABAACOBgAwagAAjwYAIAMAAABuACABAABvADACAABwACABAAAAeQAgAQAAAHkAIAMAAAB3ACABAAB4ADACAAB5ACADAAAAdwAgAQAAeAAwAgAAeQAgAwAAAHcAIAEAAHgAMAIAAHkAIAkYAADeDQAgJgAAtRIAIMEGAQAAAAHoBkAAAAAB9QYBAAAAAcUHAQAAAAHGBxAAAAABxwcBAAAAAcgHAQAAAAEBXgAAlwYAIAfBBgEAAAAB6AZAAAAAAfUGAQAAAAHFBwEAAAABxgcQAAAAAccHAQAAAAHIBwEAAAABAV4AAJkGADABXgAAmQYAMAEAAAAvACAJGAAA3A0AICYAALMSACDBBgEA7gwAIegGQAD9DAAh9QYBAIgNACHFBwEA7gwAIcYHEAC4DQAhxwcBAIgNACHIBwEAiA0AIQIAAAB5ACBeAACdBgAgB8EGAQDuDAAh6AZAAP0MACH1BgEAiA0AIcUHAQDuDAAhxgcQALgNACHHBwEAiA0AIcgHAQCIDQAhAgAAAHcAIF4AAJ8GACACAAAAdwAgXgAAnwYAIAEAAAAvACADAAAAeQAgZQAAlwYAIGYAAJ0GACABAAAAeQAgAQAAAHcAIAgMAAC6FAAgawAAvRQAIGwAALwUACDtAQAAuxQAIO4BAAC-FAAg9QYAAJENACDHBwAAkQ0AIMgHAACRDQAgCrEGAADOCwAwsgYAAKcGABCzBgAAzgsAMMEGAQDbCgAh6AZAAPkKACH1BgEA4woAIcUHAQDbCgAhxgcQAM8LACHHBwEA4QoAIcgHAQDhCgAhAwAAAHcAIAEAAKYGADBqAACnBgAgAwAAAHcAIAEAAHgAMAIAAHkAIAEAAACHAQAgAQAAAIcBACADAAAAhQEAIAEAAIYBADACAACHAQAgAwAAAIUBACABAACGAQAwAgAAhwEAIAMAAACFAQAgAQAAhgEAMAIAAIcBACAFEgAAuRQAIOgGQAAAAAH2BgEAAAABvgcAAAC-BwLEBwEAAAABAV4AAK8GACAE6AZAAAAAAfYGAQAAAAG-BwAAAL4HAsQHAQAAAAEBXgAAsQYAMAFeAACxBgAwBRIAALgUACDoBkAA_QwAIfYGAQDuDAAhvgcAAMkNvgcixAcBAO4MACECAAAAhwEAIF4AALQGACAE6AZAAP0MACH2BgEA7gwAIb4HAADJDb4HIsQHAQDuDAAhAgAAAIUBACBeAAC2BgAgAgAAAIUBACBeAAC2BgAgAwAAAIcBACBlAACvBgAgZgAAtAYAIAEAAACHAQAgAQAAAIUBACADDAAAtRQAIGsAALcUACBsAAC2FAAgB7EGAADNCwAwsgYAAL0GABCzBgAAzQsAMOgGQAD5CgAh9gYBANsKACG-BwAAxwu-ByLEBwEA4AoAIQMAAACFAQAgAQAAvAYAMGoAAL0GACADAAAAhQEAIAEAAIYBADACAACHAQAgCbEGAADKCwAwsgYAAMMGABCzBgAAygsAML4HAADLC74HIr8HAQD2CgAhwAcBAPYKACHBB0AA_goAIcIHQACuCwAhwwcAAMwLACABAAAAwAYAIAEAAADABgAgCLEGAADKCwAwsgYAAMMGABCzBgAAygsAML4HAADLC74HIr8HAQD2CgAhwAcBAPYKACHBB0AA_goAIcIHQACuCwAhAcIHAACRDQAgAwAAAMMGACABAADEBgAwAgAAwAYAIAMAAADDBgAgAQAAxAYAMAIAAMAGACADAAAAwwYAIAEAAMQGADACAADABgAgBb4HAAAAvgcCvwcBAAAAAcAHAQAAAAHBB0AAAAABwgdAAAAAAQFeAADIBgAgBb4HAAAAvgcCvwcBAAAAAcAHAQAAAAHBB0AAAAABwgdAAAAAAQFeAADKBgAwAV4AAMoGADAFvgcAAMkNvgcivwcBAO4MACHABwEA7gwAIcEHQAD9DAAhwgdAAJUNACECAAAAwAYAIF4AAM0GACAFvgcAAMkNvgcivwcBAO4MACHABwEA7gwAIcEHQAD9DAAhwgdAAJUNACECAAAAwwYAIF4AAM8GACACAAAAwwYAIF4AAM8GACADAAAAwAYAIGUAAMgGACBmAADNBgAgAQAAAMAGACABAAAAwwYAIAQMAACyFAAgawAAtBQAIGwAALMUACDCBwAAkQ0AIAixBgAAxgsAMLIGAADWBgAQswYAAMYLADC-BwAAxwu-ByK_BwEA4AoAIcAHAQDgCgAhwQdAAPkKACHCB0AA4goAIQMAAADDBgAgAQAA1QYAMGoAANYGACADAAAAwwYAIAEAAMQGADACAADABgAgCbEGAADFCwAwsgYAANwGABCzBgAAxQsAMMEGAQAAAAHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACG7BwEA9goAIbwHAQD2CgAhAQAAANkGACABAAAA2QYAIAmxBgAAxQsAMLIGAADcBgAQswYAAMULADDBBgEAwgsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIbsHAQD2CgAhvAcBAPYKACEAAwAAANwGACABAADdBgAwAgAA2QYAIAMAAADcBgAgAQAA3QYAMAIAANkGACADAAAA3AYAIAEAAN0GADACAADZBgAgBsEGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAG7BwEAAAABvAcBAAAAAQFeAADhBgAgBsEGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAG7BwEAAAABvAcBAAAAAQFeAADjBgAwAV4AAOMGADAGwQYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACG7BwEA7gwAIbwHAQDuDAAhAgAAANkGACBeAADmBgAgBsEGAQDuDAAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAhuwcBAO4MACG8BwEA7gwAIQIAAADcBgAgXgAA6AYAIAIAAADcBgAgXgAA6AYAIAMAAADZBgAgZQAA4QYAIGYAAOYGACABAAAA2QYAIAEAAADcBgAgAwwAAK8UACBrAACxFAAgbAAAsBQAIAmxBgAAxAsAMLIGAADvBgAQswYAAMQLADDBBgEA2woAIdoGIADtCgAh6AZAAPkKACHpBkAA-QoAIbsHAQDgCgAhvAcBAOAKACEDAAAA3AYAIAEAAO4GADBqAADvBgAgAwAAANwGACABAADdBgAwAgAA2QYAIAqxBgAAwQsAMLIGAAD1BgAQswYAAMELADDBBgEAAAAB2gYgAPQKACHoBkAA_goAIekGQAD-CgAh7gYBAPYKACHvBgEA_QoAIYQHAQD9CgAhAQAAAPIGACABAAAA8gYAIAqxBgAAwQsAMLIGAAD1BgAQswYAAMELADDBBgEAwgsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIe4GAQD2CgAh7wYBAP0KACGEBwEA_QoAIQLvBgAAkQ0AIIQHAACRDQAgAwAAAPUGACABAAD2BgAwAgAA8gYAIAMAAAD1BgAgAQAA9gYAMAIAAPIGACADAAAA9QYAIAEAAPYGADACAADyBgAgB8EGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAHuBgEAAAAB7wYBAAAAAYQHAQAAAAEBXgAA-gYAIAfBBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB7gYBAAAAAe8GAQAAAAGEBwEAAAABAV4AAPwGADABXgAA_AYAMAfBBgEA7gwAIdoGIAC5DQAh6AZAAP0MACHpBkAA_QwAIe4GAQDuDAAh7wYBAIgNACGEBwEAiA0AIQIAAADyBgAgXgAA_wYAIAfBBgEA7gwAIdoGIAC5DQAh6AZAAP0MACHpBkAA_QwAIe4GAQDuDAAh7wYBAIgNACGEBwEAiA0AIQIAAAD1BgAgXgAAgQcAIAIAAAD1BgAgXgAAgQcAIAMAAADyBgAgZQAA-gYAIGYAAP8GACABAAAA8gYAIAEAAAD1BgAgBQwAAKwUACBrAACuFAAgbAAArRQAIO8GAACRDQAghAcAAJENACAKsQYAAMALADCyBgAAiAcAELMGAADACwAwwQYBANsKACHaBiAA7QoAIegGQAD5CgAh6QZAAPkKACHuBgEA4AoAIe8GAQDhCgAhhAcBAOEKACEDAAAA9QYAIAEAAIcHADBqAACIBwAgAwAAAPUGACABAAD2BgAwAgAA8gYAIAEAAACgAQAgAQAAAKABACADAAAAngEAIAEAAJ8BADACAACgAQAgAwAAAJ4BACABAACfAQAwAgAAoAEAIAMAAACeAQAgAQAAnwEAMAIAAKABACALGAAAqxQAIMEGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAHuBgEAAAAB7wYBAAAAAfUGAQAAAAGEBwEAAAABuQcBAAAAAboHQAAAAAEBXgAAkAcAIArBBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB7gYBAAAAAe8GAQAAAAH1BgEAAAABhAcBAAAAAbkHAQAAAAG6B0AAAAABAV4AAJIHADABXgAAkgcAMAEAAAAvACALGAAAqhQAIMEGAQDuDAAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh7gYBAIgNACHvBgEAiA0AIfUGAQCIDQAhhAcBAO4MACG5BwEAiA0AIboHQACVDQAhAgAAAKABACBeAACWBwAgCsEGAQDuDAAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh7gYBAIgNACHvBgEAiA0AIfUGAQCIDQAhhAcBAO4MACG5BwEAiA0AIboHQACVDQAhAgAAAJ4BACBeAACYBwAgAgAAAJ4BACBeAACYBwAgAQAAAC8AIAMAAACgAQAgZQAAkAcAIGYAAJYHACABAAAAoAEAIAEAAACeAQAgCAwAAKcUACBrAACpFAAgbAAAqBQAIO4GAACRDQAg7wYAAJENACD1BgAAkQ0AILkHAACRDQAgugcAAJENACANsQYAAL8LADCyBgAAoAcAELMGAAC_CwAwwQYBANsKACHaBiAA7QoAIegGQAD5CgAh6QZAAPkKACHuBgEA4QoAIe8GAQDhCgAh9QYBAOMKACGEBwEA4AoAIbkHAQDhCgAhugdAAOIKACEDAAAAngEAIAEAAJ8HADBqAACgBwAgAwAAAJ4BACABAACfAQAwAgAAoAEAIAEAAACSAQAgAQAAAJIBACADAAAALwAgAQAAkQEAMAIAAJIBACADAAAALwAgAQAAkQEAMAIAAJIBACADAAAALwAgAQAAkQEAMAIAAJIBACA1EwAAjhMAIBQAAI8TACAVAACQEwAgFgAAkRMAIBcAAJITACAdAACUEwAgHgAAlRMAICEAAJMTACAiAACaEwAgKwAAlhMAICwAAJcTACAuAACYEwAgLwAAmRMAIDAAAKYUACAxAACbEwAgMgAAnBMAIDMAAJ0TACA0AACeEwAgNQAAnxMAIDYAAKATACA3AAChEwAgOAAAohMAIDkAAKMTACA6AACkEwAgOwAApRMAIDwAAKYTACA9AACnEwAgQQAAqBMAIEIAAKkTACBDAACqEwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAACwBwKKBwEAAAABpAcBAAAAAaUHAQAAAAGmBwEAAAABpwcBAAAAAagHQAAAAAGqBwAAAKoHA6sHAQAAAAGsBwEAAAABrgcAAACuBwKwBwEAAAABsQcBAAAAAbIHQAAAAAGzB0AAAAABtAcBAAAAAbUHQAAAAAG2BwEAAAABtwcBAAAAAbgHQAAAAAEBXgAAqAcAIBfBBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAALAHAooHAQAAAAGkBwEAAAABpQcBAAAAAaYHAQAAAAGnBwEAAAABqAdAAAAAAaoHAAAAqgcDqwcBAAAAAawHAQAAAAGuBwAAAK4HArAHAQAAAAGxBwEAAAABsgdAAAAAAbMHQAAAAAG0BwEAAAABtQdAAAAAAbYHAQAAAAG3BwEAAAABuAdAAAAAAQFeAACqBwAwAV4AAKoHADABAAAALwAgNRMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACECAAAAkgEAIF4AAK4HACAXwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AIQIAAAAvACBeAACwBwAgAgAAAC8AIF4AALAHACABAAAALwAgAwAAAJIBACBlAACoBwAgZgAArgcAIAEAAACSAQAgAQAAAC8AIBQMAADCEQAgawAAxBEAIGwAAMMRACCKBwAAkQ0AIKUHAACRDQAgpgcAAJENACCnBwAAkQ0AIKgHAACRDQAgqgcAAJENACCrBwAAkQ0AIKwHAACRDQAgsAcAAJENACCxBwAAkQ0AILIHAACRDQAgswcAAJENACC0BwAAkQ0AILUHAACRDQAgtgcAAJENACC3BwAAkQ0AILgHAACRDQAgGrEGAAC1CwAwsgYAALgHABCzBgAAtQsAMMEGAQDbCgAh6AZAAPkKACHpBkAA-QoAIf0GAAC4C7AHIooHAQDhCgAhpAcBAOAKACGlBwEA4QoAIaYHAQDhCgAhpwcBAOEKACGoB0AA4goAIaoHAAC2C6oHI6sHAQDhCgAhrAcBAOEKACGuBwAAtwuuByKwBwEA4QoAIbEHAQDhCgAhsgdAAOIKACGzB0AA4goAIbQHAQDjCgAhtQdAAOIKACG2BwEA4QoAIbcHAQDhCgAhuAdAAOIKACEDAAAALwAgAQAAtwcAMGoAALgHACADAAAALwAgAQAAkQEAMAIAAJIBACABAAAAMwAgAQAAADMAIAMAAAAxACABAAAyADACAAAzACADAAAAMQAgAQAAMgAwAgAAMwAgAwAAADEAIAEAADIAMAIAADMAIAkNAQAAAAESAADBEQAgwQYBAAAAAfYGAQAAAAGfBwAAAJ8HAqAHAQAAAAGhBwEAAAABogcBAAAAAaMHAQAAAAEBXgAAwAcAIAgNAQAAAAHBBgEAAAAB9gYBAAAAAZ8HAAAAnwcCoAcBAAAAAaEHAQAAAAGiBwEAAAABowcBAAAAAQFeAADCBwAwAV4AAMIHADAJDQEAiA0AIRIAAMARACDBBgEA7gwAIfYGAQDuDAAhnwcAAL8RnwcioAcBAIgNACGhBwEAiA0AIaIHAQCIDQAhowcBAIgNACECAAAAMwAgXgAAxQcAIAgNAQCIDQAhwQYBAO4MACH2BgEA7gwAIZ8HAAC_EZ8HIqAHAQCIDQAhoQcBAIgNACGiBwEAiA0AIaMHAQCIDQAhAgAAADEAIF4AAMcHACACAAAAMQAgXgAAxwcAIAMAAAAzACBlAADABwAgZgAAxQcAIAEAAAAzACABAAAAMQAgCAwAALwRACANAACRDQAgawAAvhEAIGwAAL0RACCgBwAAkQ0AIKEHAACRDQAgogcAAJENACCjBwAAkQ0AIAsNAQDhCgAhsQYAALELADCyBgAAzgcAELMGAACxCwAwwQYBANsKACH2BgEA2woAIZ8HAACyC58HIqAHAQDhCgAhoQcBAOEKACGiBwEA4QoAIaMHAQDhCgAhAwAAADEAIAEAAM0HADBqAADOBwAgAwAAADEAIAEAADIAMAIAADMAIAoSAACwCwAgPgEA_QoAIbEGAACtCwAwsgYAADUAELMGAACtCwAw9gYBAAAAAYkHEACvCwAhmwcBAAAAAZwHQACuCwAhnQdAAK4LACEBAAAA0QcAIAEAAADRBwAgBhIAALsRACA-AACRDQAgiQcAAJENACCbBwAAkQ0AIJwHAACRDQAgnQcAAJENACADAAAANQAgAQAA1AcAMAIAANEHACADAAAANQAgAQAA1AcAMAIAANEHACADAAAANQAgAQAA1AcAMAIAANEHACAHEgAAuhEAID4BAAAAAfYGAQAAAAGJBxAAAAABmwcBAAAAAZwHQAAAAAGdB0AAAAABAV4AANgHACAGPgEAAAAB9gYBAAAAAYkHEAAAAAGbBwEAAAABnAdAAAAAAZ0HQAAAAAEBXgAA2gcAMAFeAADaBwAwBxIAALkRACA-AQCIDQAh9gYBAO4MACGJBxAAmg8AIZsHAQCIDQAhnAdAAJUNACGdB0AAlQ0AIQIAAADRBwAgXgAA3QcAIAY-AQCIDQAh9gYBAO4MACGJBxAAmg8AIZsHAQCIDQAhnAdAAJUNACGdB0AAlQ0AIQIAAAA1ACBeAADfBwAgAgAAADUAIF4AAN8HACADAAAA0QcAIGUAANgHACBmAADdBwAgAQAAANEHACABAAAANQAgCgwAALQRACA-AACRDQAgawAAtxEAIGwAALYRACDtAQAAtREAIO4BAAC4EQAgiQcAAJENACCbBwAAkQ0AIJwHAACRDQAgnQcAAJENACAJPgEA4QoAIbEGAACsCwAwsgYAAOYHABCzBgAArAsAMPYGAQDbCgAhiQcQAJkLACGbBwEA4QoAIZwHQADiCgAhnQdAAOIKACEDAAAANQAgAQAA5QcAMGoAAOYHACADAAAANQAgAQAA1AcAMAIAANEHACABAAAAOQAgAQAAADkAIAMAAAA3ACABAAA4ADACAAA5ACADAAAANwAgAQAAOAAwAgAAOQAgAwAAADcAIAEAADgAMAIAADkAIAoSAACzEQAgwQYBAAAAAegGQAAAAAH2BgEAAAABlAcBAAAAAZUHQAAAAAGXBwEAAAABmAdAAAAAAZkHAQAAAAGaBwEAAAABAV4AAO4HACAJwQYBAAAAAegGQAAAAAH2BgEAAAABlAcBAAAAAZUHQAAAAAGXBwEAAAABmAdAAAAAAZkHAQAAAAGaBwEAAAABAV4AAPAHADABXgAA8AcAMAoSAACyEQAgwQYBAO4MACHoBkAA_QwAIfYGAQDuDAAhlAcBAO4MACGVB0AA_QwAIZcHAQDuDAAhmAdAAJUNACGZBwEAiA0AIZoHAQCIDQAhAgAAADkAIF4AAPMHACAJwQYBAO4MACHoBkAA_QwAIfYGAQDuDAAhlAcBAO4MACGVB0AA_QwAIZcHAQDuDAAhmAdAAJUNACGZBwEAiA0AIZoHAQCIDQAhAgAAADcAIF4AAPUHACACAAAANwAgXgAA9QcAIAMAAAA5ACBlAADuBwAgZgAA8wcAIAEAAAA5ACABAAAANwAgBgwAAK8RACBrAACxEQAgbAAAsBEAIJgHAACRDQAgmQcAAJENACCaBwAAkQ0AIAyxBgAAqwsAMLIGAAD8BwAQswYAAKsLADDBBgEA2woAIegGQAD5CgAh9gYBANsKACGUBwEA4AoAIZUHQAD5CgAhlwcBANsKACGYB0AA4goAIZkHAQDhCgAhmgcBAOEKACEDAAAANwAgAQAA-wcAMGoAAPwHACADAAAANwAgAQAAOAAwAgAAOQAgAQAAAD0AIAEAAAA9ACADAAAAOwAgAQAAPAAwAgAAPQAgAwAAADsAIAEAADwAMAIAAD0AIAMAAAA7ACABAAA8ADACAAA9ACAHEgAArhEAIMEGAQAAAAH2BgEAAAABkwcAAACTBwKUBwEAAAABlQdAAAAAAZYHQAAAAAEBXgAAhAgAIAbBBgEAAAAB9gYBAAAAAZMHAAAAkwcClAcBAAAAAZUHQAAAAAGWB0AAAAABAV4AAIYIADABXgAAhggAMAcSAACtEQAgwQYBAO4MACH2BgEA7gwAIZMHAACsEZMHIpQHAQDuDAAhlQdAAP0MACGWB0AAlQ0AIQIAAAA9ACBeAACJCAAgBsEGAQDuDAAh9gYBAO4MACGTBwAArBGTByKUBwEA7gwAIZUHQAD9DAAhlgdAAJUNACECAAAAOwAgXgAAiwgAIAIAAAA7ACBeAACLCAAgAwAAAD0AIGUAAIQIACBmAACJCAAgAQAAAD0AIAEAAAA7ACAEDAAAqREAIGsAAKsRACBsAACqEQAglgcAAJENACAJsQYAAKcLADCyBgAAkggAELMGAACnCwAwwQYBANsKACH2BgEA2woAIZMHAACoC5MHIpQHAQDgCgAhlQdAAPkKACGWB0AA4goAIQMAAAA7ACABAACRCAAwagAAkggAIAMAAAA7ACABAAA8ADACAAA9ACALsQYAAKILADCyBgAAmAgAELMGAACiCwAwwQYEAAAAAegGQAD-CgAhjAcBAKQLACGNBwEA9goAIY4HAQD2CgAhjwcBAPYKACGQBwEA9goAIZEHAAClCwAgAQAAAJUIACABAAAAlQgAIAuxBgAAogsAMLIGAACYCAAQswYAAKILADDBBgQAowsAIegGQAD-CgAhjAcBAKQLACGNBwEA9goAIY4HAQD2CgAhjwcBAPYKACGQBwEA9goAIZEHAAClCwAgAowHAACRDQAgkQcAAJENACADAAAAmAgAIAEAAJkIADACAACVCAAgAwAAAJgIACABAACZCAAwAgAAlQgAIAMAAACYCAAgAQAAmQgAMAIAAJUIACAIwQYEAAAAAegGQAAAAAGMBwEAAAABjQcBAAAAAY4HAQAAAAGPBwEAAAABkAcBAAAAAZEHgAAAAAEBXgAAnQgAIAjBBgQAAAAB6AZAAAAAAYwHAQAAAAGNBwEAAAABjgcBAAAAAY8HAQAAAAGQBwEAAAABkQeAAAAAAQFeAACfCAAwAV4AAJ8IADAIwQYEAKgRACHoBkAA_QwAIYwHAQCIDQAhjQcBAO4MACGOBwEA7gwAIY8HAQDuDAAhkAcBAO4MACGRB4AAAAABAgAAAJUIACBeAACiCAAgCMEGBACoEQAh6AZAAP0MACGMBwEAiA0AIY0HAQDuDAAhjgcBAO4MACGPBwEA7gwAIZAHAQDuDAAhkQeAAAAAAQIAAACYCAAgXgAApAgAIAIAAACYCAAgXgAApAgAIAMAAACVCAAgZQAAnQgAIGYAAKIIACABAAAAlQgAIAEAAACYCAAgBwwAAKMRACBrAACmEQAgbAAApREAIO0BAACkEQAg7gEAAKcRACCMBwAAkQ0AIJEHAACRDQAgC7EGAACeCwAwsgYAAKsIABCzBgAAngsAMMEGBACfCwAh6AZAAPkKACGMBwEA4woAIY0HAQDgCgAhjgcBAOAKACGPBwEA4AoAIZAHAQDgCgAhkQcAAI8LACADAAAAmAgAIAEAAKoIADBqAACrCAAgAwAAAJgIACABAACZCAAwAgAAlQgAIAEAAAC4AQAgAQAAALgBACADAAAAtgEAIAEAALcBADACAAC4AQAgAwAAALYBACABAAC3AQAwAgAAuAEAIAMAAAC2AQAgAQAAtwEAMAIAALgBACAKAwAAohEAIBgAAKQPACA_AAClDwAgwQYBAAAAAcIGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAH1BgEAAAABigcBAAAAAQFeAACzCAAgB8EGAQAAAAHCBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAYoHAQAAAAEBXgAAtQgAMAFeAAC1CAAwAQAAAC8AIAoDAAChEQAgGAAAjg8AID8AAI8PACDBBgEA7gwAIcIGAQDuDAAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh9QYBAIgNACGKBwEA7gwAIQIAAAC4AQAgXgAAuQgAIAfBBgEA7gwAIcIGAQDuDAAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh9QYBAIgNACGKBwEA7gwAIQIAAAC2AQAgXgAAuwgAIAIAAAC2AQAgXgAAuwgAIAEAAAAvACADAAAAuAEAIGUAALMIACBmAAC5CAAgAQAAALgBACABAAAAtgEAIAQMAACeEQAgawAAoBEAIGwAAJ8RACD1BgAAkQ0AIAqxBgAAnQsAMLIGAADDCAAQswYAAJ0LADDBBgEA2woAIcIGAQDbCgAh2gYgAO0KACHoBkAA-QoAIekGQAD5CgAh9QYBAOMKACGKBwEA4AoAIQMAAAC2AQAgAQAAwggAMGoAAMMIACADAAAAtgEAIAEAALcBADACAAC4AQAgAQAAAMgBACABAAAAyAEAIAMAAADAAQAgAQAAxwEAMAIAAMgBACADAAAAwAEAIAEAAMcBADACAADIAQAgAwAAAMABACABAADHAQAwAgAAyAEAIAkNAQAAAAEYAACcEQAgPwAAnREAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAfUGAQAAAAGKBwEAAAABiwcBAAAAAQFeAADLCAAgBw0BAAAAAcEGAQAAAAHoBkAAAAAB6QZAAAAAAfUGAQAAAAGKBwEAAAABiwcBAAAAAQFeAADNCAAwAV4AAM0IADABAAAALwAgCQ0BAO4MACEYAACREQAgPwAAkhEAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIfUGAQCIDQAhigcBAO4MACGLBwEAiA0AIQIAAADIAQAgXgAA0QgAIAcNAQDuDAAhwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh9QYBAIgNACGKBwEA7gwAIYsHAQCIDQAhAgAAAMABACBeAADTCAAgAgAAAMABACBeAADTCAAgAQAAAC8AIAMAAADIAQAgZQAAywgAIGYAANEIACABAAAAyAEAIAEAAADAAQAgBQwAAI4RACBrAACQEQAgbAAAjxEAIPUGAACRDQAgiwcAAJENACAKDQEA4AoAIbEGAACcCwAwsgYAANsIABCzBgAAnAsAMMEGAQDbCgAh6AZAAPkKACHpBkAA-QoAIfUGAQDjCgAhigcBAOAKACGLBwEA4QoAIQMAAADAAQAgAQAA2ggAMGoAANsIACADAAAAwAEAIAEAAMcBADACAADIAQAgAQAAAL0BACABAAAAvQEAIAMAAAC7AQAgAQAAvAEAMAIAAL0BACADAAAAuwEAIAEAALwBADACAAC9AQAgAwAAALsBACABAAC8AQAwAgAAvQEAIA0HAACgDwAgGAAAog8AID4AAI0RACBAAAChDwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAfUGAQAAAAGGBwEAAAABhwcBAAAAAYgHAQAAAAGJBxAAAAABAV4AAOMIACAJwQYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAfUGAQAAAAGGBwEAAAABhwcBAAAAAYgHAQAAAAGJBxAAAAABAV4AAOUIADABXgAA5QgAMAEAAAC2AQAgAQAAAMABACABAAAALwAgDQcAAJwPACAYAACeDwAgPgAAjBEAIEAAAJ0PACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACHtBgEA7gwAIfUGAQCIDQAhhgcBAIgNACGHBwEAiA0AIYgHAQCIDQAhiQcQAJoPACECAAAAvQEAIF4AAOsIACAJwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh7QYBAO4MACH1BgEAiA0AIYYHAQCIDQAhhwcBAIgNACGIBwEAiA0AIYkHEACaDwAhAgAAALsBACBeAADtCAAgAgAAALsBACBeAADtCAAgAQAAALYBACABAAAAwAEAIAEAAAAvACADAAAAvQEAIGUAAOMIACBmAADrCAAgAQAAAL0BACABAAAAuwEAIAoMAACHEQAgawAAihEAIGwAAIkRACDtAQAAiBEAIO4BAACLEQAg9QYAAJENACCGBwAAkQ0AIIcHAACRDQAgiAcAAJENACCJBwAAkQ0AIAyxBgAAmAsAMLIGAAD3CAAQswYAAJgLADDBBgEA2woAIegGQAD5CgAh6QZAAPkKACHtBgEA2woAIfUGAQDjCgAhhgcBAOEKACGHBwEA4woAIYgHAQDjCgAhiQcQAJkLACEDAAAAuwEAIAEAAPYIADBqAAD3CAAgAwAAALsBACABAAC8AQAwAgAAvQEAIAEAAAClAQAgAQAAAKUBACADAAAAowEAIAEAAKQBADACAAClAQAgAwAAAKMBACABAACkAQAwAgAApQEAIAMAAACjAQAgAQAApAEAMAIAAKUBACAKAwAAhhEAIBgAAOQOACDBBgEAAAABwgYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAfUGAQAAAAGEBwEAAAABhQcBAAAAAQFeAAD_CAAgCMEGAQAAAAHCBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAYQHAQAAAAGFBwEAAAABAV4AAIEJADABXgAAgQkAMAEAAABHACABAAAALwAgCgMAAIURACAYAADiDgAgwQYBAO4MACHCBgEAiA0AIdoGIAC5DQAh6AZAAP0MACHpBkAA_QwAIfUGAQCIDQAhhAcBAO4MACGFBwEA7gwAIQIAAAClAQAgXgAAhgkAIAjBBgEA7gwAIcIGAQCIDQAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh9QYBAIgNACGEBwEA7gwAIYUHAQDuDAAhAgAAAKMBACBeAACICQAgAgAAAKMBACBeAACICQAgAQAAAEcAIAEAAAAvACADAAAApQEAIGUAAP8IACBmAACGCQAgAQAAAKUBACABAAAAowEAIAUMAACCEQAgawAAhBEAIGwAAIMRACDCBgAAkQ0AIPUGAACRDQAgC7EGAACXCwAwsgYAAJEJABCzBgAAlwsAMMEGAQDbCgAhwgYBAOMKACHaBiAA7QoAIegGQAD5CgAh6QZAAPkKACH1BgEA4woAIYQHAQDgCgAhhQcBAOAKACEDAAAAowEAIAEAAJAJADBqAACRCQAgAwAAAKMBACABAACkAQAwAgAApQEAIAEAAACrAQAgAQAAAKsBACADAAAAqQEAIAEAAKoBADACAACrAQAgAwAAAKkBACABAACqAQAwAgAAqwEAIAMAAACpAQAgAQAAqgEAMAIAAKsBACALAwAAgREAIBgAAPIOACDBBgEAAAABwgYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAe4GAQAAAAHvBgEAAAAB9QYBAAAAAYQHAQAAAAEBXgAAmQkAIAnBBgEAAAABwgYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAe4GAQAAAAHvBgEAAAAB9QYBAAAAAYQHAQAAAAEBXgAAmwkAMAFeAACbCQAwAQAAAEcAIAEAAAAvACALAwAAgBEAIBgAAPAOACDBBgEA7gwAIcIGAQCIDQAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh7gYBAO4MACHvBgEAiA0AIfUGAQCIDQAhhAcBAIgNACECAAAAqwEAIF4AAKAJACAJwQYBAO4MACHCBgEAiA0AIdoGIAC5DQAh6AZAAP0MACHpBkAA_QwAIe4GAQDuDAAh7wYBAIgNACH1BgEAiA0AIYQHAQCIDQAhAgAAAKkBACBeAACiCQAgAgAAAKkBACBeAACiCQAgAQAAAEcAIAEAAAAvACADAAAAqwEAIGUAAJkJACBmAACgCQAgAQAAAKsBACABAAAAqQEAIAcMAAD9EAAgawAA_xAAIGwAAP4QACDCBgAAkQ0AIO8GAACRDQAg9QYAAJENACCEBwAAkQ0AIAyxBgAAlgsAMLIGAACrCQAQswYAAJYLADDBBgEA2woAIcIGAQDjCgAh2gYgAO0KACHoBkAA-QoAIekGQAD5CgAh7gYBAOAKACHvBgEA4QoAIfUGAQDjCgAhhAcBAOEKACEDAAAAqQEAIAEAAKoJADBqAACrCQAgAwAAAKkBACABAACqAQAwAgAAqwEAIAEAAABhACABAAAAYQAgAwAAAF8AIAEAAGAAMAIAAGEAIAMAAABfACABAABgADACAABhACADAAAAXwAgAQAAYAAwAgAAYQAgDgMAAOcPACASAADVDgAgGQAA1g4AIMEGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAH2BgEAAAAB9wYBAAAAAfgGAQAAAAH5BgIAAAAB-gYBAAAAAfsGgAAAAAH9BgAAAP0GAgFeAACzCQAgC8EGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAH2BgEAAAAB9wYBAAAAAfgGAQAAAAH5BgIAAAAB-gYBAAAAAfsGgAAAAAH9BgAAAP0GAgFeAAC1CQAwAV4AALUJADABAAAALwAgAQAAAGQAIAEAAABHACAOAwAA5Q8AIBIAANIOACAZAADTDgAgwQYBAO4MACHCBgEAiA0AIegGQAD9DAAh6QZAAP0MACH2BgEAiA0AIfcGAQCIDQAh-AYBAIgNACH5BgIAzw4AIfoGAQCIDQAh-waAAAAAAf0GAADQDv0GIgIAAABhACBeAAC7CQAgC8EGAQDuDAAhwgYBAIgNACHoBkAA_QwAIekGQAD9DAAh9gYBAIgNACH3BgEAiA0AIfgGAQCIDQAh-QYCAM8OACH6BgEAiA0AIfsGgAAAAAH9BgAA0A79BiICAAAAXwAgXgAAvQkAIAIAAABfACBeAAC9CQAgAQAAAC8AIAEAAABkACABAAAARwAgAwAAAGEAIGUAALMJACBmAAC7CQAgAQAAAGEAIAEAAABfACAMDAAA-BAAIGsAAPsQACBsAAD6EAAg7QEAAPkQACDuAQAA_BAAIMIGAACRDQAg9gYAAJENACD3BgAAkQ0AIPgGAACRDQAg-QYAAJENACD6BgAAkQ0AIPsGAACRDQAgDrEGAACNCwAwsgYAAMcJABCzBgAAjQsAMMEGAQDbCgAhwgYBAOMKACHoBkAA-QoAIekGQAD5CgAh9gYBAOMKACH3BgEA4woAIfgGAQDhCgAh-QYCAI4LACH6BgEA4QoAIfsGAACPCwAg_QYAAJAL_QYiAwAAAF8AIAEAAMYJADBqAADHCQAgAwAAAF8AIAEAAGAAMAIAAGEAIAEAAACxAQAgAQAAALEBACADAAAArwEAIAEAALABADACAACxAQAgAwAAAK8BACABAACwAQAwAgAAsQEAIAMAAACvAQAgAQAAsAEAMAIAALEBACATAwAA9xAAIAcAAIEPACAYAACCDwAgwQYBAAAAAcIGAQAAAAHKBgEAAAABywYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAe0GAQAAAAHuBgEAAAAB7wYBAAAAAfAGAQAAAAHxBgEAAAAB8gYBAAAAAfMGAQAAAAH0BgIAAAAB9QYBAAAAAQFeAADPCQAgEMEGAQAAAAHCBgEAAAABygYBAAAAAcsGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB7gYBAAAAAe8GAQAAAAHwBgEAAAAB8QYBAAAAAfIGAQAAAAHzBgEAAAAB9AYCAAAAAfUGAQAAAAEBXgAA0QkAMAFeAADRCQAwAQAAABsAIAEAAABHACABAAAALwAgEwMAAPYQACAHAAD-DgAgGAAA_w4AIMEGAQDuDAAhwgYBAIgNACHKBgEAiA0AIcsGAQCIDQAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh7QYBAIgNACHuBgEAiA0AIe8GAQCIDQAh8AYBAIgNACHxBgEAiA0AIfIGAQCIDQAh8wYBAIgNACH0BgIAhw0AIfUGAQCIDQAhAgAAALEBACBeAADXCQAgEMEGAQDuDAAhwgYBAIgNACHKBgEAiA0AIcsGAQCIDQAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh7QYBAIgNACHuBgEAiA0AIe8GAQCIDQAh8AYBAIgNACHxBgEAiA0AIfIGAQCIDQAh8wYBAIgNACH0BgIAhw0AIfUGAQCIDQAhAgAAAK8BACBeAADZCQAgAgAAAK8BACBeAADZCQAgAQAAABsAIAEAAABHACABAAAALwAgAwAAALEBACBlAADPCQAgZgAA1wkAIAEAAACxAQAgAQAAAK8BACAQDAAA8RAAIGsAAPQQACBsAADzEAAg7QEAAPIQACDuAQAA9RAAIMIGAACRDQAgygYAAJENACDLBgAAkQ0AIO0GAACRDQAg7gYAAJENACDvBgAAkQ0AIPAGAACRDQAg8QYAAJENACDyBgAAkQ0AIPMGAACRDQAg9QYAAJENACATsQYAAIwLADCyBgAA4wkAELMGAACMCwAwwQYBANsKACHCBgEA4woAIcoGAQDhCgAhywYBAOEKACHaBiAA7QoAIegGQAD5CgAh6QZAAPkKACHtBgEA4woAIe4GAQDhCgAh7wYBAOEKACHwBgEA4QoAIfEGAQDhCgAh8gYBAOEKACHzBgEA4QoAIfQGAgDuCgAh9QYBAOMKACEDAAAArwEAIAEAAOIJADBqAADjCQAgAwAAAK8BACABAACwAQAwAgAAsQEAICQEAAD_CgAgFwAAgwsAIEcAAIYLACBNAACLCwAgTwAAigsAIFAAAIALACBRAACBCwAgUgAAggsAIFMAAIQLACBUAACFCwAgVQAAhwsAIFYAAIgLACBXAACJCwAgsQYAAPwKADCyBgAARwAQswYAAPwKADDBBgEAAAABygYBAP0KACHLBgEA9goAIcwGAQAAAAHaBiAA9AoAIdsGAQD9CgAh3AYBAP0KACHdBgEA9goAId4GAQD2CgAh3wYBAP0KACHgBgIA9QoAIeEGAQD2CgAh4gYBAPYKACHjBgEA9goAIeQGAQD2CgAh5QYBAPYKACHmBgEA9goAIecGAQD2CgAh6AZAAP4KACHpBkAA_goAIQEAAADmCQAgAQAAAOYJACARBAAA5BAAIBcAAOgQACBHAADrEAAgTQAA8BAAIE8AAO8QACBQAADlEAAgUQAA5hAAIFIAAOcQACBTAADpEAAgVAAA6hAAIFUAAOwQACBWAADtEAAgVwAA7hAAIMoGAACRDQAg2wYAAJENACDcBgAAkQ0AIN8GAACRDQAgAwAAAEcAIAEAAOkJADACAADmCQAgAwAAAEcAIAEAAOkJADACAADmCQAgAwAAAEcAIAEAAOkJADACAADmCQAgIQQAANcQACAXAADbEAAgRwAA3hAAIE0AAOMQACBPAADiEAAgUAAA2BAAIFEAANkQACBSAADaEAAgUwAA3BAAIFQAAN0QACBVAADfEAAgVgAA4BAAIFcAAOEQACDBBgEAAAABygYBAAAAAcsGAQAAAAHMBgEAAAAB2gYgAAAAAdsGAQAAAAHcBgEAAAAB3QYBAAAAAd4GAQAAAAHfBgEAAAAB4AYCAAAAAeEGAQAAAAHiBgEAAAAB4wYBAAAAAeQGAQAAAAHlBgEAAAAB5gYBAAAAAecGAQAAAAHoBkAAAAAB6QZAAAAAAQFeAADtCQAgFMEGAQAAAAHKBgEAAAABywYBAAAAAcwGAQAAAAHaBiAAAAAB2wYBAAAAAdwGAQAAAAHdBgEAAAAB3gYBAAAAAd8GAQAAAAHgBgIAAAAB4QYBAAAAAeIGAQAAAAHjBgEAAAAB5AYBAAAAAeUGAQAAAAHmBgEAAAAB5wYBAAAAAegGQAAAAAHpBkAAAAABAV4AAO8JADABXgAA7wkAMCEEAACkDgAgFwAAqA4AIEcAAKsOACBNAACwDgAgTwAArw4AIFAAAKUOACBRAACmDgAgUgAApw4AIFMAAKkOACBUAACqDgAgVQAArA4AIFYAAK0OACBXAACuDgAgwQYBAO4MACHKBgEAiA0AIcsGAQDuDAAhzAYBAO4MACHaBiAAuQ0AIdsGAQCIDQAh3AYBAIgNACHdBgEA7gwAId4GAQDuDAAh3wYBAIgNACHgBgIAhw0AIeEGAQDuDAAh4gYBAO4MACHjBgEA7gwAIeQGAQDuDAAh5QYBAO4MACHmBgEA7gwAIecGAQDuDAAh6AZAAP0MACHpBkAA_QwAIQIAAADmCQAgXgAA8gkAIBTBBgEA7gwAIcoGAQCIDQAhywYBAO4MACHMBgEA7gwAIdoGIAC5DQAh2wYBAIgNACHcBgEAiA0AId0GAQDuDAAh3gYBAO4MACHfBgEAiA0AIeAGAgCHDQAh4QYBAO4MACHiBgEA7gwAIeMGAQDuDAAh5AYBAO4MACHlBgEA7gwAIeYGAQDuDAAh5wYBAO4MACHoBkAA_QwAIekGQAD9DAAhAgAAAEcAIF4AAPQJACACAAAARwAgXgAA9AkAIAMAAADmCQAgZQAA7QkAIGYAAPIJACABAAAA5gkAIAEAAABHACAJDAAAnw4AIGsAAKIOACBsAAChDgAg7QEAAKAOACDuAQAAow4AIMoGAACRDQAg2wYAAJENACDcBgAAkQ0AIN8GAACRDQAgF7EGAAD4CgAwsgYAAPsJABCzBgAA-AoAMMEGAQDbCgAhygYBAOEKACHLBgEA4AoAIcwGAQDgCgAh2gYgAO0KACHbBgEA4QoAIdwGAQDhCgAh3QYBAOAKACHeBgEA4AoAId8GAQDhCgAh4AYCAO4KACHhBgEA4AoAIeIGAQDgCgAh4wYBAOAKACHkBgEA4AoAIeUGAQDgCgAh5gYBAOAKACHnBgEA4AoAIegGQAD5CgAh6QZAAPkKACEDAAAARwAgAQAA-gkAMGoAAPsJACADAAAARwAgAQAA6QkAMAIAAOYJACARAwAA9woAILEGAADzCgAwsgYAAAcAELMGAADzCgAwwQYBAAAAAcIGAQAAAAHPBiAA9AoAIdAGAgD1CgAh0QYCAPUKACHSBgEA9goAIdMGAQD2CgAh1AYCAPUKACHVBgEA9goAIdYGAQD2CgAh1wYCAPUKACHYBgEA9goAIdkGAQD2CgAhAQAAAP4JACABAAAA_gkAIAEDAACeDgAgAwAAAAcAIAEAAIEKADACAAD-CQAgAwAAAAcAIAEAAIEKADACAAD-CQAgAwAAAAcAIAEAAIEKADACAAD-CQAgDgMAAJ0OACDBBgEAAAABwgYBAAAAAc8GIAAAAAHQBgIAAAAB0QYCAAAAAdIGAQAAAAHTBgEAAAAB1AYCAAAAAdUGAQAAAAHWBgEAAAAB1wYCAAAAAdgGAQAAAAHZBgEAAAABAV4AAIUKACANwQYBAAAAAcIGAQAAAAHPBiAAAAAB0AYCAAAAAdEGAgAAAAHSBgEAAAAB0wYBAAAAAdQGAgAAAAHVBgEAAAAB1gYBAAAAAdcGAgAAAAHYBgEAAAAB2QYBAAAAAQFeAACHCgAwAV4AAIcKADAOAwAAnA4AIMEGAQDuDAAhwgYBAO4MACHPBiAAuQ0AIdAGAgCHDQAh0QYCAIcNACHSBgEA7gwAIdMGAQDuDAAh1AYCAIcNACHVBgEA7gwAIdYGAQDuDAAh1wYCAIcNACHYBgEA7gwAIdkGAQDuDAAhAgAAAP4JACBeAACKCgAgDcEGAQDuDAAhwgYBAO4MACHPBiAAuQ0AIdAGAgCHDQAh0QYCAIcNACHSBgEA7gwAIdMGAQDuDAAh1AYCAIcNACHVBgEA7gwAIdYGAQDuDAAh1wYCAIcNACHYBgEA7gwAIdkGAQDuDAAhAgAAAAcAIF4AAIwKACACAAAABwAgXgAAjAoAIAMAAAD-CQAgZQAAhQoAIGYAAIoKACABAAAA_gkAIAEAAAAHACAFDAAAlw4AIGsAAJoOACBsAACZDgAg7QEAAJgOACDuAQAAmw4AIBCxBgAA7AoAMLIGAACTCgAQswYAAOwKADDBBgEA2woAIcIGAQDbCgAhzwYgAO0KACHQBgIA7goAIdEGAgDuCgAh0gYBAOAKACHTBgEA4AoAIdQGAgDuCgAh1QYBAOAKACHWBgEA4AoAIdcGAgDuCgAh2AYBAOAKACHZBgEA4AoAIQMAAAAHACABAACSCgAwagAAkwoAIAMAAAAHACABAACBCgAwAgAA_gkAIAEAAAALACABAAAACwAgAwAAAAkAIAEAAAoAMAIAAAsAIAMAAAAJACABAAAKADACAAALACADAAAACQAgAQAACgAwAgAACwAgCAMAAJQOACBOAACVDgAgTwAAlg4AIMEGAQAAAAHCBgEAAAABzAYBAAAAAc0GAQAAAAHOBgEAAAABAV4AAJsKACAFwQYBAAAAAcIGAQAAAAHMBgEAAAABzQYBAAAAAc4GAQAAAAEBXgAAnQoAMAFeAACdCgAwCAMAAP0NACBOAAD-DQAgTwAA_w0AIMEGAQDuDAAhwgYBAO4MACHMBgEA7gwAIc0GAQDuDAAhzgYBAO4MACECAAAACwAgXgAAoAoAIAXBBgEA7gwAIcIGAQDuDAAhzAYBAO4MACHNBgEA7gwAIc4GAQDuDAAhAgAAAAkAIF4AAKIKACACAAAACQAgXgAAogoAIAMAAAALACBlAACbCgAgZgAAoAoAIAEAAAALACABAAAACQAgAwwAAPoNACBrAAD8DQAgbAAA-w0AIAixBgAA6woAMLIGAACpCgAQswYAAOsKADDBBgEA2woAIcIGAQDbCgAhzAYBAOAKACHNBgEA4AoAIc4GAQDgCgAhAwAAAAkAIAEAAKgKADBqAACpCgAgAwAAAAkAIAEAAAoAMAIAAAsAIAEAAAAFACABAAAABQAgAwAAAAMAIAEAAAQAMAIAAAUAIAMAAAADACABAAAEADACAAAFACADAAAAAwAgAQAABAAwAgAABQAgEQMAAPUNACApAAD4DQAgLQEAAAABTwAA-Q0AIFAAAPcNACBYAAD2DQAgwQYBAAAAAcIGAQAAAAHDBgEAAAABxAYBAAAAAcUGQAAAAAHGBkAAAAABxwZAAAAAAcgGQAAAAAHJBgEAAAABygYBAAAAAcsGAQAAAAEBXgAAsQoAIAwtAQAAAAHBBgEAAAABwgYBAAAAAcMGAQAAAAHEBgEAAAABxQZAAAAAAcYGQAAAAAHHBkAAAAAByAZAAAAAAckGAQAAAAHKBgEAAAABywYBAAAAAQFeAACzCgAwAV4AALMKADABAAAAjwIAIBEDAACWDQAgKQAAmQ0AIC0BAIgNACFPAACaDQAgUAAAmA0AIFgAAJcNACDBBgEA7gwAIcIGAQDuDAAhwwYBAO4MACHEBgEA7gwAIcUGQACVDQAhxgZAAJUNACHHBkAAlQ0AIcgGQACVDQAhyQYBAIgNACHKBgEAiA0AIcsGAQCIDQAhAgAAAAUAIF4AALcKACAMLQEAiA0AIcEGAQDuDAAhwgYBAO4MACHDBgEA7gwAIcQGAQDuDAAhxQZAAJUNACHGBkAAlQ0AIccGQACVDQAhyAZAAJUNACHJBgEAiA0AIcoGAQCIDQAhywYBAIgNACECAAAAAwAgXgAAuQoAIAIAAAADACBeAAC5CgAgAQAAAI8CACADAAAABQAgZQAAsQoAIGYAALcKACABAAAABQAgAQAAAAMAIAsMAACSDQAgLQAAkQ0AIGsAAJQNACBsAACTDQAgxQYAAJENACDGBgAAkQ0AIMcGAACRDQAgyAYAAJENACDJBgAAkQ0AIMoGAACRDQAgywYAAJENACAPLQEA4QoAIbEGAADfCgAwsgYAAMEKABCzBgAA3woAMMEGAQDbCgAhwgYBANsKACHDBgEA4AoAIcQGAQDgCgAhxQZAAOIKACHGBkAA4goAIccGQADiCgAhyAZAAOIKACHJBgEA4woAIcoGAQDhCgAhywYBAOEKACEDAAAAAwAgAQAAwAoAMGoAAMEKACADAAAAAwAgAQAABAAwAgAABQAgAQAAAA8AIAEAAAAPACADAAAADQAgAQAADgAwAgAADwAgAwAAAA0AIAEAAA4AMAIAAA8AIAMAAAANACABAAAOADACAAAPACAFBQAAjg0AIAYAAI8NACBNAACQDQAgtAYBAAAAAbUGAQAAAAEBXgAAyQoAIAK0BgEAAAABtQYBAAAAAQFeAADLCgAwAV4AAMsKADAFBQAA7wwAIAYAAPAMACBNAADxDAAgtAYBAO4MACG1BgEA7gwAIQIAAAAPACBeAADOCgAgArQGAQDuDAAhtQYBAO4MACECAAAADQAgXgAA0AoAIAIAAAANACBeAADQCgAgAwAAAA8AIGUAAMkKACBmAADOCgAgAQAAAA8AIAEAAAANACADDAAA6wwAIGsAAO0MACBsAADsDAAgBbEGAADaCgAwsgYAANcKABCzBgAA2goAMLQGAQDbCgAhtQYBANsKACEDAAAADQAgAQAA1goAMGoAANcKACADAAAADQAgAQAADgAwAgAADwAgBbEGAADaCgAwsgYAANcKABCzBgAA2goAMLQGAQDbCgAhtQYBANsKACELDAAA3QoAIGsAAN4KACBsAADeCgAgtgYBAAAAAbcGAQAAAAS4BgEAAAAEuQYBAAAAAboGAQAAAAG7BgEAAAABvAYBAAAAAb0GAQDcCgAhCwwAAN0KACBrAADeCgAgbAAA3goAILYGAQAAAAG3BgEAAAAEuAYBAAAABLkGAQAAAAG6BgEAAAABuwYBAAAAAbwGAQAAAAG9BgEA3AoAIQi2BgIAAAABtwYCAAAABLgGAgAAAAS5BgIAAAABugYCAAAAAbsGAgAAAAG8BgIAAAABvQYCAN0KACELtgYBAAAAAbcGAQAAAAS4BgEAAAAEuQYBAAAAAboGAQAAAAG7BgEAAAABvAYBAAAAAb0GAQDeCgAhvgYBAAAAAb8GAQAAAAHABgEAAAABDy0BAOEKACGxBgAA3woAMLIGAADBCgAQswYAAN8KADDBBgEA2woAIcIGAQDbCgAhwwYBAOAKACHEBgEA4AoAIcUGQADiCgAhxgZAAOIKACHHBkAA4goAIcgGQADiCgAhyQYBAOMKACHKBgEA4QoAIcsGAQDhCgAhDgwAAN0KACBrAADeCgAgbAAA3goAILYGAQAAAAG3BgEAAAAEuAYBAAAABLkGAQAAAAG6BgEAAAABuwYBAAAAAbwGAQAAAAG9BgEA6goAIb4GAQAAAAG_BgEAAAABwAYBAAAAAQ4MAADlCgAgawAA5goAIGwAAOYKACC2BgEAAAABtwYBAAAABbgGAQAAAAW5BgEAAAABugYBAAAAAbsGAQAAAAG8BgEAAAABvQYBAOkKACG-BgEAAAABvwYBAAAAAcAGAQAAAAELDAAA5QoAIGsAAOgKACBsAADoCgAgtgZAAAAAAbcGQAAAAAW4BkAAAAAFuQZAAAAAAboGQAAAAAG7BkAAAAABvAZAAAAAAb0GQADnCgAhCwwAAOUKACBrAADmCgAgbAAA5goAILYGAQAAAAG3BgEAAAAFuAYBAAAABbkGAQAAAAG6BgEAAAABuwYBAAAAAbwGAQAAAAG9BgEA5AoAIQsMAADlCgAgawAA5goAIGwAAOYKACC2BgEAAAABtwYBAAAABbgGAQAAAAW5BgEAAAABugYBAAAAAbsGAQAAAAG8BgEAAAABvQYBAOQKACEItgYCAAAAAbcGAgAAAAW4BgIAAAAFuQYCAAAAAboGAgAAAAG7BgIAAAABvAYCAAAAAb0GAgDlCgAhC7YGAQAAAAG3BgEAAAAFuAYBAAAABbkGAQAAAAG6BgEAAAABuwYBAAAAAbwGAQAAAAG9BgEA5goAIb4GAQAAAAG_BgEAAAABwAYBAAAAAQsMAADlCgAgawAA6AoAIGwAAOgKACC2BkAAAAABtwZAAAAABbgGQAAAAAW5BkAAAAABugZAAAAAAbsGQAAAAAG8BkAAAAABvQZAAOcKACEItgZAAAAAAbcGQAAAAAW4BkAAAAAFuQZAAAAAAboGQAAAAAG7BkAAAAABvAZAAAAAAb0GQADoCgAhDgwAAOUKACBrAADmCgAgbAAA5goAILYGAQAAAAG3BgEAAAAFuAYBAAAABbkGAQAAAAG6BgEAAAABuwYBAAAAAbwGAQAAAAG9BgEA6QoAIb4GAQAAAAG_BgEAAAABwAYBAAAAAQ4MAADdCgAgawAA3goAIGwAAN4KACC2BgEAAAABtwYBAAAABLgGAQAAAAS5BgEAAAABugYBAAAAAbsGAQAAAAG8BgEAAAABvQYBAOoKACG-BgEAAAABvwYBAAAAAcAGAQAAAAEIsQYAAOsKADCyBgAAqQoAELMGAADrCgAwwQYBANsKACHCBgEA2woAIcwGAQDgCgAhzQYBAOAKACHOBgEA4AoAIRCxBgAA7AoAMLIGAACTCgAQswYAAOwKADDBBgEA2woAIcIGAQDbCgAhzwYgAO0KACHQBgIA7goAIdEGAgDuCgAh0gYBAOAKACHTBgEA4AoAIdQGAgDuCgAh1QYBAOAKACHWBgEA4AoAIdcGAgDuCgAh2AYBAOAKACHZBgEA4AoAIQUMAADdCgAgawAA8goAIGwAAPIKACC2BiAAAAABvQYgAPEKACENDAAA3QoAIGsAAN0KACBsAADdCgAg7QEAAPAKACDuAQAA3QoAILYGAgAAAAG3BgIAAAAEuAYCAAAABLkGAgAAAAG6BgIAAAABuwYCAAAAAbwGAgAAAAG9BgIA7woAIQ0MAADdCgAgawAA3QoAIGwAAN0KACDtAQAA8AoAIO4BAADdCgAgtgYCAAAAAbcGAgAAAAS4BgIAAAAEuQYCAAAAAboGAgAAAAG7BgIAAAABvAYCAAAAAb0GAgDvCgAhCLYGCAAAAAG3BggAAAAEuAYIAAAABLkGCAAAAAG6BggAAAABuwYIAAAAAbwGCAAAAAG9BggA8AoAIQUMAADdCgAgawAA8goAIGwAAPIKACC2BiAAAAABvQYgAPEKACECtgYgAAAAAb0GIADyCgAhEQMAAPcKACCxBgAA8woAMLIGAAAHABCzBgAA8woAMMEGAQDCCwAhwgYBAMILACHPBiAA9AoAIdAGAgD1CgAh0QYCAPUKACHSBgEA9goAIdMGAQD2CgAh1AYCAPUKACHVBgEA9goAIdYGAQD2CgAh1wYCAPUKACHYBgEA9goAIdkGAQD2CgAhArYGIAAAAAG9BiAA8goAIQi2BgIAAAABtwYCAAAABLgGAgAAAAS5BgIAAAABugYCAAAAAbsGAgAAAAG8BgIAAAABvQYCAN0KACELtgYBAAAAAbcGAQAAAAS4BgEAAAAEuQYBAAAAAboGAQAAAAG7BgEAAAABvAYBAAAAAb0GAQDeCgAhvgYBAAAAAb8GAQAAAAHABgEAAAABJgQAAP8KACAXAACDCwAgRwAAhgsAIE0AAIsLACBPAACKCwAgUAAAgAsAIFEAAIELACBSAACCCwAgUwAAhAsAIFQAAIULACBVAACHCwAgVgAAiAsAIFcAAIkLACCxBgAA_AoAMLIGAABHABCzBgAA_AoAMMEGAQDCCwAhygYBAP0KACHLBgEA9goAIcwGAQD2CgAh2gYgAPQKACHbBgEA_QoAIdwGAQD9CgAh3QYBAPYKACHeBgEA9goAId8GAQD9CgAh4AYCAPUKACHhBgEA9goAIeIGAQD2CgAh4wYBAPYKACHkBgEA9goAIeUGAQD2CgAh5gYBAPYKACHnBgEA9goAIegGQAD-CgAh6QZAAP4KACGXCAAARwAgmAgAAEcAIBexBgAA-AoAMLIGAAD7CQAQswYAAPgKADDBBgEA2woAIcoGAQDhCgAhywYBAOAKACHMBgEA4AoAIdoGIADtCgAh2wYBAOEKACHcBgEA4QoAId0GAQDgCgAh3gYBAOAKACHfBgEA4QoAIeAGAgDuCgAh4QYBAOAKACHiBgEA4AoAIeMGAQDgCgAh5AYBAOAKACHlBgEA4AoAIeYGAQDgCgAh5wYBAOAKACHoBkAA-QoAIekGQAD5CgAhCwwAAN0KACBrAAD7CgAgbAAA-woAILYGQAAAAAG3BkAAAAAEuAZAAAAABLkGQAAAAAG6BkAAAAABuwZAAAAAAbwGQAAAAAG9BkAA-goAIQsMAADdCgAgawAA-woAIGwAAPsKACC2BkAAAAABtwZAAAAABLgGQAAAAAS5BkAAAAABugZAAAAAAbsGQAAAAAG8BkAAAAABvQZAAPoKACEItgZAAAAAAbcGQAAAAAS4BkAAAAAEuQZAAAAAAboGQAAAAAG7BkAAAAABvAZAAAAAAb0GQAD7CgAhJAQAAP8KACAXAACDCwAgRwAAhgsAIE0AAIsLACBPAACKCwAgUAAAgAsAIFEAAIELACBSAACCCwAgUwAAhAsAIFQAAIULACBVAACHCwAgVgAAiAsAIFcAAIkLACCxBgAA_AoAMLIGAABHABCzBgAA_AoAMMEGAQDCCwAhygYBAP0KACHLBgEA9goAIcwGAQD2CgAh2gYgAPQKACHbBgEA_QoAIdwGAQD9CgAh3QYBAPYKACHeBgEA9goAId8GAQD9CgAh4AYCAPUKACHhBgEA9goAIeIGAQD2CgAh4wYBAPYKACHkBgEA9goAIeUGAQD2CgAh5gYBAPYKACHnBgEA9goAIegGQAD-CgAh6QZAAP4KACELtgYBAAAAAbcGAQAAAAW4BgEAAAAFuQYBAAAAAboGAQAAAAG7BgEAAAABvAYBAAAAAb0GAQDmCgAhvgYBAAAAAb8GAQAAAAHABgEAAAABCLYGQAAAAAG3BkAAAAAEuAZAAAAABLkGQAAAAAG6BkAAAAABuwZAAAAAAbwGQAAAAAG9BkAA-woAIRMDAAD3CgAgsQYAAPMKADCyBgAABwAQswYAAPMKADDBBgEAwgsAIcIGAQDCCwAhzwYgAPQKACHQBgIA9QoAIdEGAgD1CgAh0gYBAPYKACHTBgEA9goAIdQGAgD1CgAh1QYBAPYKACHWBgEA9goAIdcGAgD1CgAh2AYBAPYKACHZBgEA9goAIZcIAAAHACCYCAAABwAgA-oGAAAJACDrBgAACQAg7AYAAAkAIAPqBgAAAwAg6wYAAAMAIOwGAAADACAD6gYAAGQAIOsGAABkACDsBgAAZAAgA-oGAAA_ACDrBgAAPwAg7AYAAD8AIAPqBgAAiQEAIOsGAACJAQAg7AYAAIkBACAD6gYAALYBACDrBgAAtgEAIOwGAAC2AQAgA-oGAACvAQAg6wYAAK8BACDsBgAArwEAIAPqBgAAqQEAIOsGAACpAQAg7AYAAKkBACAD6gYAAKMBACDrBgAAowEAIOwGAACjAQAgA-oGAABfACDrBgAAXwAg7AYAAF8AIAPqBgAAiwEAIOsGAACLAQAg7AYAAIsBACAD6gYAABEAIOsGAAARACDsBgAAEQAgE7EGAACMCwAwsgYAAOMJABCzBgAAjAsAMMEGAQDbCgAhwgYBAOMKACHKBgEA4QoAIcsGAQDhCgAh2gYgAO0KACHoBkAA-QoAIekGQAD5CgAh7QYBAOMKACHuBgEA4QoAIe8GAQDhCgAh8AYBAOEKACHxBgEA4QoAIfIGAQDhCgAh8wYBAOEKACH0BgIA7goAIfUGAQDjCgAhDrEGAACNCwAwsgYAAMcJABCzBgAAjQsAMMEGAQDbCgAhwgYBAOMKACHoBkAA-QoAIekGQAD5CgAh9gYBAOMKACH3BgEA4woAIfgGAQDhCgAh-QYCAI4LACH6BgEA4QoAIfsGAACPCwAg_QYAAJAL_QYiDQwAAOUKACBrAADlCgAgbAAA5QoAIO0BAACVCwAg7gEAAOUKACC2BgIAAAABtwYCAAAABbgGAgAAAAW5BgIAAAABugYCAAAAAbsGAgAAAAG8BgIAAAABvQYCAJQLACEPDAAA5QoAIGsAAJMLACBsAACTCwAgtgaAAAAAAbkGgAAAAAG6BoAAAAABuwaAAAAAAbwGgAAAAAG9BoAAAAAB_gYBAAAAAf8GAQAAAAGABwEAAAABgQeAAAAAAYIHgAAAAAGDB4AAAAABBwwAAN0KACBrAACSCwAgbAAAkgsAILYGAAAA_QYCtwYAAAD9Bgi4BgAAAP0GCL0GAACRC_0GIgcMAADdCgAgawAAkgsAIGwAAJILACC2BgAAAP0GArcGAAAA_QYIuAYAAAD9Bgi9BgAAkQv9BiIEtgYAAAD9BgK3BgAAAP0GCLgGAAAA_QYIvQYAAJIL_QYiDLYGgAAAAAG5BoAAAAABugaAAAAAAbsGgAAAAAG8BoAAAAABvQaAAAAAAf4GAQAAAAH_BgEAAAABgAcBAAAAAYEHgAAAAAGCB4AAAAABgweAAAAAAQ0MAADlCgAgawAA5QoAIGwAAOUKACDtAQAAlQsAIO4BAADlCgAgtgYCAAAAAbcGAgAAAAW4BgIAAAAFuQYCAAAAAboGAgAAAAG7BgIAAAABvAYCAAAAAb0GAgCUCwAhCLYGCAAAAAG3BggAAAAFuAYIAAAABbkGCAAAAAG6BggAAAABuwYIAAAAAbwGCAAAAAG9BggAlQsAIQyxBgAAlgsAMLIGAACrCQAQswYAAJYLADDBBgEA2woAIcIGAQDjCgAh2gYgAO0KACHoBkAA-QoAIekGQAD5CgAh7gYBAOAKACHvBgEA4QoAIfUGAQDjCgAhhAcBAOEKACELsQYAAJcLADCyBgAAkQkAELMGAACXCwAwwQYBANsKACHCBgEA4woAIdoGIADtCgAh6AZAAPkKACHpBkAA-QoAIfUGAQDjCgAhhAcBAOAKACGFBwEA4AoAIQyxBgAAmAsAMLIGAAD3CAAQswYAAJgLADDBBgEA2woAIegGQAD5CgAh6QZAAPkKACHtBgEA2woAIfUGAQDjCgAhhgcBAOEKACGHBwEA4woAIYgHAQDjCgAhiQcQAJkLACENDAAA5QoAIGsAAJsLACBsAACbCwAg7QEAAJsLACDuAQAAmwsAILYGEAAAAAG3BhAAAAAFuAYQAAAABbkGEAAAAAG6BhAAAAABuwYQAAAAAbwGEAAAAAG9BhAAmgsAIQ0MAADlCgAgawAAmwsAIGwAAJsLACDtAQAAmwsAIO4BAACbCwAgtgYQAAAAAbcGEAAAAAW4BhAAAAAFuQYQAAAAAboGEAAAAAG7BhAAAAABvAYQAAAAAb0GEACaCwAhCLYGEAAAAAG3BhAAAAAFuAYQAAAABbkGEAAAAAG6BhAAAAABuwYQAAAAAbwGEAAAAAG9BhAAmwsAIQoNAQDgCgAhsQYAAJwLADCyBgAA2wgAELMGAACcCwAwwQYBANsKACHoBkAA-QoAIekGQAD5CgAh9QYBAOMKACGKBwEA4AoAIYsHAQDhCgAhCrEGAACdCwAwsgYAAMMIABCzBgAAnQsAMMEGAQDbCgAhwgYBANsKACHaBiAA7QoAIegGQAD5CgAh6QZAAPkKACH1BgEA4woAIYoHAQDgCgAhC7EGAACeCwAwsgYAAKsIABCzBgAAngsAMMEGBACfCwAh6AZAAPkKACGMBwEA4woAIY0HAQDgCgAhjgcBAOAKACGPBwEA4AoAIZAHAQDgCgAhkQcAAI8LACANDAAA3QoAIGsAAKELACBsAAChCwAg7QEAAPAKACDuAQAAoQsAILYGBAAAAAG3BgQAAAAEuAYEAAAABLkGBAAAAAG6BgQAAAABuwYEAAAAAbwGBAAAAAG9BgQAoAsAIQ0MAADdCgAgawAAoQsAIGwAAKELACDtAQAA8AoAIO4BAAChCwAgtgYEAAAAAbcGBAAAAAS4BgQAAAAEuQYEAAAAAboGBAAAAAG7BgQAAAABvAYEAAAAAb0GBACgCwAhCLYGBAAAAAG3BgQAAAAEuAYEAAAABLkGBAAAAAG6BgQAAAABuwYEAAAAAbwGBAAAAAG9BgQAoQsAIQuxBgAAogsAMLIGAACYCAAQswYAAKILADDBBgQAowsAIegGQAD-CgAhjAcBAKQLACGNBwEA9goAIY4HAQD2CgAhjwcBAPYKACGQBwEA9goAIZEHAAClCwAgCLYGBAAAAAG3BgQAAAAEuAYEAAAABLkGBAAAAAG6BgQAAAABuwYEAAAAAbwGBAAAAAG9BgQAoQsAIQi2BgEAAAABtwYBAAAABbgGAQAAAAW5BgEAAAABugYBAAAAAbsGAQAAAAG8BgEAAAABvQYBAKYLACEMtgaAAAAAAbkGgAAAAAG6BoAAAAABuwaAAAAAAbwGgAAAAAG9BoAAAAAB_gYBAAAAAf8GAQAAAAGABwEAAAABgQeAAAAAAYIHgAAAAAGDB4AAAAABCLYGAQAAAAG3BgEAAAAFuAYBAAAABbkGAQAAAAG6BgEAAAABuwYBAAAAAbwGAQAAAAG9BgEApgsAIQmxBgAApwsAMLIGAACSCAAQswYAAKcLADDBBgEA2woAIfYGAQDbCgAhkwcAAKgLkwcilAcBAOAKACGVB0AA-QoAIZYHQADiCgAhBwwAAN0KACBrAACqCwAgbAAAqgsAILYGAAAAkwcCtwYAAACTBwi4BgAAAJMHCL0GAACpC5MHIgcMAADdCgAgawAAqgsAIGwAAKoLACC2BgAAAJMHArcGAAAAkwcIuAYAAACTBwi9BgAAqQuTByIEtgYAAACTBwK3BgAAAJMHCLgGAAAAkwcIvQYAAKoLkwciDLEGAACrCwAwsgYAAPwHABCzBgAAqwsAMMEGAQDbCgAh6AZAAPkKACH2BgEA2woAIZQHAQDgCgAhlQdAAPkKACGXBwEA2woAIZgHQADiCgAhmQcBAOEKACGaBwEA4QoAIQk-AQDhCgAhsQYAAKwLADCyBgAA5gcAELMGAACsCwAw9gYBANsKACGJBxAAmQsAIZsHAQDhCgAhnAdAAOIKACGdB0AA4goAIQoSAACwCwAgPgEA_QoAIbEGAACtCwAwsgYAADUAELMGAACtCwAw9gYBAMILACGJBxAArwsAIZsHAQD9CgAhnAdAAK4LACGdB0AArgsAIQi2BkAAAAABtwZAAAAABbgGQAAAAAW5BkAAAAABugZAAAAAAbsGQAAAAAG8BkAAAAABvQZAAOgKACEItgYQAAAAAbcGEAAAAAW4BhAAAAAFuQYQAAAAAboGEAAAAAG7BhAAAAABvAYQAAAAAb0GEACbCwAhOhMAAJ4MACAUAACfDAAgFQAAoAwAIBYAAKEMACAXAACDCwAgHQAAogwAIB4AAKMMACAhAACYDAAgIgAAiQsAICsAAKQMACAsAAClDAAgLgAApgwAIC8AAKcMACAwAACJDAAgMQAAqAwAIDIAAKkMACAzAACCCwAgNAAAmAwAIDUAAKIMACA2AACZDAAgNwAApwwAIDgAAKcMACA5AACqDAAgOgAAqwwAIDsAAIgLACA8AACHCwAgPQAAhgsAIEEAAIULACBCAACsDAAgQwAAigwAILEGAACaDAAwsgYAAC8AELMGAACaDAAwwQYBAMILACHoBkAA_goAIekGQAD-CgAh_QYAAJ0MsAciigcBAP0KACGkBwEA9goAIaUHAQD9CgAhpgcBAP0KACGnBwEA_QoAIagHQACuCwAhqgcAAJsMqgcjqwcBAP0KACGsBwEA_QoAIa4HAACcDK4HIrAHAQD9CgAhsQcBAP0KACGyB0AArgsAIbMHQACuCwAhtAcBAKQLACG1B0AArgsAIbYHAQD9CgAhtwcBAP0KACG4B0AArgsAIZcIAAAvACCYCAAALwAgCw0BAOEKACGxBgAAsQsAMLIGAADOBwAQswYAALELADDBBgEA2woAIfYGAQDbCgAhnwcAALILnwcioAcBAOEKACGhBwEA4QoAIaIHAQDhCgAhowcBAOEKACEHDAAA3QoAIGsAALQLACBsAAC0CwAgtgYAAACfBwK3BgAAAJ8HCLgGAAAAnwcIvQYAALMLnwciBwwAAN0KACBrAAC0CwAgbAAAtAsAILYGAAAAnwcCtwYAAACfBwi4BgAAAJ8HCL0GAACzC58HIgS2BgAAAJ8HArcGAAAAnwcIuAYAAACfBwi9BgAAtAufByIasQYAALULADCyBgAAuAcAELMGAAC1CwAwwQYBANsKACHoBkAA-QoAIekGQAD5CgAh_QYAALgLsAciigcBAOEKACGkBwEA4AoAIaUHAQDhCgAhpgcBAOEKACGnBwEA4QoAIagHQADiCgAhqgcAALYLqgcjqwcBAOEKACGsBwEA4QoAIa4HAAC3C64HIrAHAQDhCgAhsQcBAOEKACGyB0AA4goAIbMHQADiCgAhtAcBAOMKACG1B0AA4goAIbYHAQDhCgAhtwcBAOEKACG4B0AA4goAIQcMAADlCgAgawAAvgsAIGwAAL4LACC2BgAAAKoHA7cGAAAAqgcJuAYAAACqBwm9BgAAvQuqByMHDAAA3QoAIGsAALwLACBsAAC8CwAgtgYAAACuBwK3BgAAAK4HCLgGAAAArgcIvQYAALsLrgciBwwAAN0KACBrAAC6CwAgbAAAugsAILYGAAAAsAcCtwYAAACwBwi4BgAAALAHCL0GAAC5C7AHIgcMAADdCgAgawAAugsAIGwAALoLACC2BgAAALAHArcGAAAAsAcIuAYAAACwBwi9BgAAuQuwByIEtgYAAACwBwK3BgAAALAHCLgGAAAAsAcIvQYAALoLsAciBwwAAN0KACBrAAC8CwAgbAAAvAsAILYGAAAArgcCtwYAAACuBwi4BgAAAK4HCL0GAAC7C64HIgS2BgAAAK4HArcGAAAArgcIuAYAAACuBwi9BgAAvAuuByIHDAAA5QoAIGsAAL4LACBsAAC-CwAgtgYAAACqBwO3BgAAAKoHCbgGAAAAqgcJvQYAAL0LqgcjBLYGAAAAqgcDtwYAAACqBwm4BgAAAKoHCb0GAAC-C6oHIw2xBgAAvwsAMLIGAACgBwAQswYAAL8LADDBBgEA2woAIdoGIADtCgAh6AZAAPkKACHpBkAA-QoAIe4GAQDhCgAh7wYBAOEKACH1BgEA4woAIYQHAQDgCgAhuQcBAOEKACG6B0AA4goAIQqxBgAAwAsAMLIGAACIBwAQswYAAMALADDBBgEA2woAIdoGIADtCgAh6AZAAPkKACHpBkAA-QoAIe4GAQDgCgAh7wYBAOEKACGEBwEA4QoAIQqxBgAAwQsAMLIGAAD1BgAQswYAAMELADDBBgEAwgsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIe4GAQD2CgAh7wYBAP0KACGEBwEA_QoAIQi2BgEAAAABtwYBAAAABLgGAQAAAAS5BgEAAAABugYBAAAAAbsGAQAAAAG8BgEAAAABvQYBAMMLACEItgYBAAAAAbcGAQAAAAS4BgEAAAAEuQYBAAAAAboGAQAAAAG7BgEAAAABvAYBAAAAAb0GAQDDCwAhCbEGAADECwAwsgYAAO8GABCzBgAAxAsAMMEGAQDbCgAh2gYgAO0KACHoBkAA-QoAIekGQAD5CgAhuwcBAOAKACG8BwEA4AoAIQmxBgAAxQsAMLIGAADcBgAQswYAAMULADDBBgEAwgsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIbsHAQD2CgAhvAcBAPYKACEIsQYAAMYLADCyBgAA1gYAELMGAADGCwAwvgcAAMcLvgcivwcBAOAKACHABwEA4AoAIcEHQAD5CgAhwgdAAOIKACEHDAAA3QoAIGsAAMkLACBsAADJCwAgtgYAAAC-BwK3BgAAAL4HCLgGAAAAvgcIvQYAAMgLvgciBwwAAN0KACBrAADJCwAgbAAAyQsAILYGAAAAvgcCtwYAAAC-Bwi4BgAAAL4HCL0GAADIC74HIgS2BgAAAL4HArcGAAAAvgcIuAYAAAC-Bwi9BgAAyQu-ByIIsQYAAMoLADCyBgAAwwYAELMGAADKCwAwvgcAAMsLvgcivwcBAPYKACHABwEA9goAIcEHQAD-CgAhwgdAAK4LACEEtgYAAAC-BwK3BgAAAL4HCLgGAAAAvgcIvQYAAMkLvgciAr4HAAAAvgcCvwcBAAAAAQexBgAAzQsAMLIGAAC9BgAQswYAAM0LADDoBkAA-QoAIfYGAQDbCgAhvgcAAMcLvgcixAcBAOAKACEKsQYAAM4LADCyBgAApwYAELMGAADOCwAwwQYBANsKACHoBkAA-QoAIfUGAQDjCgAhxQcBANsKACHGBxAAzwsAIccHAQDhCgAhyAcBAOEKACENDAAA3QoAIGsAANELACBsAADRCwAg7QEAANELACDuAQAA0QsAILYGEAAAAAG3BhAAAAAEuAYQAAAABLkGEAAAAAG6BhAAAAABuwYQAAAAAbwGEAAAAAG9BhAA0AsAIQ0MAADdCgAgawAA0QsAIGwAANELACDtAQAA0QsAIO4BAADRCwAgtgYQAAAAAbcGEAAAAAS4BhAAAAAEuQYQAAAAAboGEAAAAAG7BhAAAAABvAYQAAAAAb0GEADQCwAhCLYGEAAAAAG3BhAAAAAEuAYQAAAABLkGEAAAAAG6BhAAAAABuwYQAAAAAbwGEAAAAAG9BhAA0QsAIRixBgAA0gsAMLIGAACPBgAQswYAANILADDBBgEA2woAIegGQAD5CgAh6QZAAPkKACHtBgEA4woAIfYGAQDjCgAh_QYAANQLywcilQdAAOIKACGfBwAA0wvKByK-BwAAxwu-ByLGBxAAzwsAIcwHAADVC8wHI80HAQDjCgAhzgcBAOAKACHPByAA7QoAIdAHAQDhCgAh0QcBAOEKACHSBwEA4QoAIdMHAQDjCgAh1AcBAOMKACHVB0AA4goAIdYHQADiCgAhBwwAAN0KACBrAADbCwAgbAAA2wsAILYGAAAAygcCtwYAAADKBwi4BgAAAMoHCL0GAADaC8oHIgcMAADdCgAgawAA2QsAIGwAANkLACC2BgAAAMsHArcGAAAAywcIuAYAAADLBwi9BgAA2AvLByIHDAAA5QoAIGsAANcLACBsAADXCwAgtgYAAADMBwO3BgAAAMwHCbgGAAAAzAcJvQYAANYLzAcjBwwAAOUKACBrAADXCwAgbAAA1wsAILYGAAAAzAcDtwYAAADMBwm4BgAAAMwHCb0GAADWC8wHIwS2BgAAAMwHA7cGAAAAzAcJuAYAAADMBwm9BgAA1wvMByMHDAAA3QoAIGsAANkLACBsAADZCwAgtgYAAADLBwK3BgAAAMsHCLgGAAAAywcIvQYAANgLywciBLYGAAAAywcCtwYAAADLBwi4BgAAAMsHCL0GAADZC8sHIgcMAADdCgAgawAA2wsAIGwAANsLACC2BgAAAMoHArcGAAAAygcIuAYAAADKBwi9BgAA2gvKByIEtgYAAADKBwK3BgAAAMoHCLgGAAAAygcIvQYAANsLygciDrEGAADcCwAwsgYAAO8FABCzBgAA3AsAMLQGAQDjCgAhwQYBANsKACHaBiAA7QoAIegGQAD5CgAh6QZAAPkKACH1BgEA4woAIfcGAQDjCgAhigcBAOAKACGfBwAA0wvKByLGBxAAzwsAIc4HAQDgCgAhCbEGAADdCwAwsgYAANMFABCzBgAA3QsAMOkGQAD5CgAh9gYBANsKACHXBwEA2woAIdgHAgDuCgAh2QcCAO4KACHaByAA7QoAIQexBgAA3gsAMLIGAAC9BQAQswYAAN4LADD2BgEA2woAIdcHAQDbCgAh2wcBAOMKACHcB0AA-QoAIQexBgAA3wsAMLIGAAClBQAQswYAAN8LADD2BgEA2woAIfcGAQDbCgAh3QcBAOMKACHeB0AA-QoAIQqxBgAA4AsAMLIGAACNBQAQswYAAOALADDBBgEA2woAIfQGAgDuCgAhhAcBAOAKACGFBwEA4AoAIbcHAQDhCgAh3wcBANsKACHgBwIAjgsAIQmxBgAA4QsAMLIGAAD3BAAQswYAAOELADDBBgEA2woAIfQGAgDuCgAh9wYBANsKACGEBwEA4AoAIbcHAQDhCgAh4QcCAO4KACEPsQYAAOILADCyBgAA4QQAELMGAADiCwAwwQYBANsKACHCBgEA4woAIegGQAD5CgAh6QZAAPkKACH1BgEA4woAIYQHAQDgCgAhtwcBAOEKACG4B0AA4goAIbkHAQDhCgAh4gcBAOAKACHjBwEA4QoAIeQHIADtCgAhCLEGAADjCwAwsgYAAMcEABCzBgAA4wsAMMEGAQDbCgAh6AZAAPkKACHtBgEA2woAIeUHAQDgCgAh5gcBAOMKACEQsQYAAOQLADCyBgAArwQAELMGAADkCwAwwQYBANsKACHoBkAA-QoAIekGQAD5CgAh_QYAAOUL8Qci5wcBANsKACHoBwIA7goAIekHAgDuCgAh6gcCAO4KACHrBwIA7goAIewHAgDuCgAh7QcCAO4KACHuBwEA4QoAIe8HAQDhCgAhBwwAAN0KACBrAADnCwAgbAAA5wsAILYGAAAA8QcCtwYAAADxBwi4BgAAAPEHCL0GAADmC_EHIgcMAADdCgAgawAA5wsAIGwAAOcLACC2BgAAAPEHArcGAAAA8QcIuAYAAADxBwi9BgAA5gvxByIEtgYAAADxBwK3BgAAAPEHCLgGAAAA8QcIvQYAAOcL8QciEUsAAOoLACCxBgAA6AsAMLIGAADuAQAQswYAAOgLADDBBgEAwgsAIegGQAD-CgAh6QZAAP4KACH9BgAA6QvxByLnBwEAwgsAIegHAgD1CgAh6QcCAPUKACHqBwIA9QoAIesHAgD1CgAh7AcCAPUKACHtBwIA9QoAIe4HAQD9CgAh7wcBAP0KACEEtgYAAADxBwK3BgAAAPEHCLgGAAAA8QcIvQYAAOcL8QciEQMAAPcKACAHAADxCwAgSgAA4QwAIEwAAOIMACCxBgAA3wwAMLIGAAARABCzBgAA3wwAMLQGAQDCCwAhtQYBAMILACHBBgEAwgsAIcIGAQDCCwAh6AZAAP4KACHpBkAA_goAIe0GAQDCCwAh_QYAAOAM8gcilwgAABEAIJgIAAARACALsQYAAOsLADCyBgAAlwQAELMGAADrCwAwtAYBANsKACG1BgEA2woAIcEGAQDbCgAhwgYBANsKACHoBkAA-QoAIekGQAD5CgAh7QYBANsKACH9BgAA7AvyByIHDAAA3QoAIGsAAO4LACBsAADuCwAgtgYAAADyBwK3BgAAAPIHCLgGAAAA8gcIvQYAAO0L8gciBwwAAN0KACBrAADuCwAgbAAA7gsAILYGAAAA8gcCtwYAAADyBwi4BgAAAPIHCL0GAADtC_IHIgS2BgAAAPIHArcGAAAA8gcIuAYAAADyBwi9BgAA7gvyByIJTAEA4AoAIbEGAADvCwAwsgYAAIEEABCzBgAA7wsAMMEGAQDbCgAh7QYBANsKACHyBwEA4AoAIfMHAgDuCgAh9AcBAOAKACEKBwAA8QsAIEwBAPYKACGxBgAA8AsAMLIGAAAoABCzBgAA8AsAMMEGAQDCCwAh7QYBAMILACHyBwEA9goAIfMHAgD1CgAh9AcBAPYKACEgCAAA2QwAIA4AANoMACAPAADbDAAgEAAA3AwAIBEAAIsLACAoAACnDAAgRQAAqQwAIEYAAN0MACBHAACGCwAgSAAA1gwAIEkAANYMACCxBgAA1wwAMLIGAAAbABCzBgAA1wwAMMEGAQDCCwAh6AZAAP4KACHpBkAA_goAIYoHAQD2CgAhpwcBAPYKACGqBwAA2AyqByKsBwEA9goAIbgHQACuCwAhgggBAPYKACGDCAEA_QoAIYQIAQD9CgAhhQhAAP4KACGGCCAA9AoAIYcIAQD9CgAhiAgBAKQLACGJCAEApAsAIZcIAAAbACCYCAAAGwAgB7EGAADyCwAwsgYAAOkDABCzBgAA8gsAMMEGAQDbCgAh7QYBANsKACH1BwIA7goAIfYHAgDuCgAhCAcAAPELACCxBgAA8wsAMLIGAAAmABCzBgAA8wsAMMEGAQDCCwAh7QYBAMILACH1BwIA9QoAIfYHAgD1CgAhCbEGAAD0CwAwsgYAANEDABCzBgAA9AsAMMEGAQDbCgAh7QYBANsKACGKBwEA4AoAIacHAQDgCgAh9wcBAOAKACH4BwEA4woAIQuxBgAA9QsAMLIGAAC5AwAQswYAAPULADDBBgEA2woAIe0GAQDbCgAh-QcBAOAKACH6BwEA4QoAIfsHAQDhCgAh_AcBAOAKACH9BwEA4QoAIf4HAQDhCgAhDAcAAPELACCxBgAA9gsAMLIGAAAVABCzBgAA9gsAMMEGAQDCCwAh7QYBAMILACH5BwEA9goAIfoHAQD9CgAh-wcBAP0KACH8BwEA9goAIf0HAQD9CgAh_gcBAP0KACEMsQYAAPcLADCyBgAAoQMAELMGAAD3CwAwwQYBANsKACHoBkAA-QoAIekGQAD5CgAhoAcBAOAKACGhBwEA4AoAIaIHAQDgCgAh_wcBAOAKACGACAEA4QoAIYEIAQDhCgAhDwkAAPkLACAKAAD5CwAgCwAA-gsAILEGAAD4CwAwsgYAABkAELMGAAD4CwAwwQYBAMILACHoBkAA_goAIekGQAD-CgAhoAcBAPYKACGhBwEA9goAIaIHAQD2CgAh_wcBAPYKACGACAEA_QoAIYEIAQD9CgAhA-oGAAAbACDrBgAAGwAg7AYAABsAIAPqBgAAFwAg6wYAABcAIOwGAAAXACATsQYAAPsLADCyBgAAiQMAELMGAAD7CwAwwQYBANsKACHoBkAA-QoAIekGQAD5CgAhigcBAOAKACGnBwEA4AoAIaoHAAD8C6oHIqwHAQDgCgAhuAdAAOIKACGCCAEA4AoAIYMIAQDhCgAhhAgBAOEKACGFCEAA-QoAIYYIIADtCgAhhwgBAOEKACGICAEA4woAIYkIAQDjCgAhBwwAAN0KACBrAAD-CwAgbAAA_gsAILYGAAAAqgcCtwYAAACqBwi4BgAAAKoHCL0GAAD9C6oHIgcMAADdCgAgawAA_gsAIGwAAP4LACC2BgAAAKoHArcGAAAAqgcIuAYAAACqBwi9BgAA_QuqByIEtgYAAACqBwK3BgAAAKoHCLgGAAAAqgcIvQYAAP4LqgciCrEGAAD_CwAwsgYAAO8CABCzBgAA_wsAMLQGAQDbCgAhwQYBANsKACHCBgEA2woAIegGQAD5CgAh6QZAAPkKACH2BgEA2woAIYoIAQDjCgAhB7EGAACADAAwsgYAANcCABCzBgAAgAwAMMIGAQDbCgAh6AZAAPkKACHpBkAA-QoAIfYGAQDbCgAhBbEGAACBDAAwsgYAAMECABCzBgAAgQwAMMIGAQDbCgAh9gYBANsKACEFsQYAAIIMADCyBgAAqwIAELMGAACCDAAwwQYBANsKACGKBwEA4AoAIQZRAACBCwAgsQYAAIMMADCyBgAAjwIAELMGAACDDAAwwQYBAMILACGKBwEA9goAIQkDAAD3CgAgEgAAsAsAILEGAACEDAAwsgYAAIkBABCzBgAAhAwAMMIGAQDCCwAh6AZAAP4KACHpBkAA_goAIfYGAQDCCwAhDgMAAPcKACAFAACGDAAgEgAAsAsAIC0AAIcMACCxBgAAhQwAMLIGAACLAQAQswYAAIUMADC0BgEAwgsAIcEGAQDCCwAhwgYBAMILACHoBkAA_goAIekGQAD-CgAh9gYBAMILACGKCAEApAsAIRYDAAD3CgAgKQAAmQwAIC0BAP0KACFPAACKCwAgUAAA6AwAIFgAAOoMACCxBgAA6QwAMLIGAAADABCzBgAA6QwAMMEGAQDCCwAhwgYBAMILACHDBgEA9goAIcQGAQD2CgAhxQZAAK4LACHGBkAArgsAIccGQACuCwAhyAZAAK4LACHJBgEApAsAIcoGAQD9CgAhywYBAP0KACGXCAAAAwAgmAgAAAMAIA0DAAD3CgAgTgAA6AwAIE8AAIoLACCxBgAA5wwAMLIGAAAJABCzBgAA5wwAMMEGAQDCCwAhwgYBAMILACHMBgEA9goAIc0GAQD2CgAhzgYBAPYKACGXCAAACQAgmAgAAAkAIAwNAQD2CgAhGAAAiQwAID8AAIoMACCxBgAAiAwAMLIGAADAAQAQswYAAIgMADDBBgEAwgsAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIYoHAQD2CgAhiwcBAP0KACE6EwAAngwAIBQAAJ8MACAVAACgDAAgFgAAoQwAIBcAAIMLACAdAACiDAAgHgAAowwAICEAAJgMACAiAACJCwAgKwAApAwAICwAAKUMACAuAACmDAAgLwAApwwAIDAAAIkMACAxAACoDAAgMgAAqQwAIDMAAIILACA0AACYDAAgNQAAogwAIDYAAJkMACA3AACnDAAgOAAApwwAIDkAAKoMACA6AACrDAAgOwAAiAsAIDwAAIcLACA9AACGCwAgQQAAhQsAIEIAAKwMACBDAACKDAAgsQYAAJoMADCyBgAALwAQswYAAJoMADDBBgEAwgsAIegGQAD-CgAh6QZAAP4KACH9BgAAnQywByKKBwEA_QoAIaQHAQD2CgAhpQcBAP0KACGmBwEA_QoAIacHAQD9CgAhqAdAAK4LACGqBwAAmwyqByOrBwEA_QoAIawHAQD9CgAhrgcAAJwMrgcisAcBAP0KACGxBwEA_QoAIbIHQACuCwAhswdAAK4LACG0BwEApAsAIbUHQACuCwAhtgcBAP0KACG3BwEA_QoAIbgHQACuCwAhlwgAAC8AIJgIAAAvACAD6gYAALsBACDrBgAAuwEAIOwGAAC7AQAgEAcAAPELACAYAACJDAAgPgAAjAwAIEAAAI0MACCxBgAAiwwAMLIGAAC7AQAQswYAAIsMADDBBgEAwgsAIegGQAD-CgAh6QZAAP4KACHtBgEAwgsAIfUGAQCkCwAhhgcBAP0KACGHBwEApAsAIYgHAQCkCwAhiQcQAK8LACEPAwAA9woAIBgAAIkMACA_AACKDAAgsQYAAI8MADCyBgAAtgEAELMGAACPDAAwwQYBAMILACHCBgEAwgsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAhigcBAPYKACGXCAAAtgEAIJgIAAC2AQAgDg0BAPYKACEYAACJDAAgPwAAigwAILEGAACIDAAwsgYAAMABABCzBgAAiAwAMMEGAQDCCwAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAhigcBAPYKACGLBwEA_QoAIZcIAADAAQAgmAgAAMABACACwgYBAAAAAYoHAQAAAAENAwAA9woAIBgAAIkMACA_AACKDAAgsQYAAI8MADCyBgAAtgEAELMGAACPDAAwwQYBAMILACHCBgEAwgsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAhigcBAPYKACEWAwAAkgwAIAcAAJEMACAYAACJDAAgsQYAAJAMADCyBgAArwEAELMGAACQDAAwwQYBAMILACHCBgEApAsAIcoGAQD9CgAhywYBAP0KACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACHtBgEApAsAIe4GAQD9CgAh7wYBAP0KACHwBgEA_QoAIfEGAQD9CgAh8gYBAP0KACHzBgEA_QoAIfQGAgD1CgAh9QYBAKQLACEgCAAA2QwAIA4AANoMACAPAADbDAAgEAAA3AwAIBEAAIsLACAoAACnDAAgRQAAqQwAIEYAAN0MACBHAACGCwAgSAAA1gwAIEkAANYMACCxBgAA1wwAMLIGAAAbABCzBgAA1wwAMMEGAQDCCwAh6AZAAP4KACHpBkAA_goAIYoHAQD2CgAhpwcBAPYKACGqBwAA2AyqByKsBwEA9goAIbgHQACuCwAhgggBAPYKACGDCAEA_QoAIYQIAQD9CgAhhQhAAP4KACGGCCAA9AoAIYcIAQD9CgAhiAgBAKQLACGJCAEApAsAIZcIAAAbACCYCAAAGwAgJgQAAP8KACAXAACDCwAgRwAAhgsAIE0AAIsLACBPAACKCwAgUAAAgAsAIFEAAIELACBSAACCCwAgUwAAhAsAIFQAAIULACBVAACHCwAgVgAAiAsAIFcAAIkLACCxBgAA_AoAMLIGAABHABCzBgAA_AoAMMEGAQDCCwAhygYBAP0KACHLBgEA9goAIcwGAQD2CgAh2gYgAPQKACHbBgEA_QoAIdwGAQD9CgAh3QYBAPYKACHeBgEA9goAId8GAQD9CgAh4AYCAPUKACHhBgEA9goAIeIGAQD2CgAh4wYBAPYKACHkBgEA9goAIeUGAQD2CgAh5gYBAPYKACHnBgEA9goAIegGQAD-CgAh6QZAAP4KACGXCAAARwAgmAgAAEcAIA4DAACSDAAgGAAAiQwAILEGAACTDAAwsgYAAKkBABCzBgAAkwwAMMEGAQDCCwAhwgYBAKQLACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACHuBgEA9goAIe8GAQD9CgAh9QYBAKQLACGEBwEA_QoAIQ0DAACSDAAgGAAAiQwAILEGAACUDAAwsgYAAKMBABCzBgAAlAwAMMEGAQDCCwAhwgYBAKQLACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIYQHAQD2CgAhhQcBAPYKACEOGAAAiQwAILEGAACVDAAwsgYAAJ4BABCzBgAAlQwAMMEGAQDCCwAh2gYgAPQKACHoBkAA_goAIekGQAD-CgAh7gYBAP0KACHvBgEA_QoAIfUGAQCkCwAhhAcBAPYKACG5BwEA_QoAIboHQACuCwAhFQMAAJIMACAYAACJDAAgIAAAlwwAICEAAJgMACAiAACJCwAgKQAAmQwAILEGAACWDAAwsgYAAGQAELMGAACWDAAwwQYBAMILACHCBgEApAsAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIYQHAQD2CgAhtwcBAP0KACG4B0AArgsAIbkHAQD9CgAh4gcBAPYKACHjBwEA_QoAIeQHIAD0CgAhA-oGAABKACDrBgAASgAg7AYAAEoAIAPqBgAAQwAg6wYAAEMAIOwGAABDACAD6gYAAGcAIOsGAABnACDsBgAAZwAgOBMAAJ4MACAUAACfDAAgFQAAoAwAIBYAAKEMACAXAACDCwAgHQAAogwAIB4AAKMMACAhAACYDAAgIgAAiQsAICsAAKQMACAsAAClDAAgLgAApgwAIC8AAKcMACAwAACJDAAgMQAAqAwAIDIAAKkMACAzAACCCwAgNAAAmAwAIDUAAKIMACA2AACZDAAgNwAApwwAIDgAAKcMACA5AACqDAAgOgAAqwwAIDsAAIgLACA8AACHCwAgPQAAhgsAIEEAAIULACBCAACsDAAgQwAAigwAILEGAACaDAAwsgYAAC8AELMGAACaDAAwwQYBAMILACHoBkAA_goAIekGQAD-CgAh_QYAAJ0MsAciigcBAP0KACGkBwEA9goAIaUHAQD9CgAhpgcBAP0KACGnBwEA_QoAIagHQACuCwAhqgcAAJsMqgcjqwcBAP0KACGsBwEA_QoAIa4HAACcDK4HIrAHAQD9CgAhsQcBAP0KACGyB0AArgsAIbMHQACuCwAhtAcBAKQLACG1B0AArgsAIbYHAQD9CgAhtwcBAP0KACG4B0AArgsAIQS2BgAAAKoHA7cGAAAAqgcJuAYAAACqBwm9BgAAvguqByMEtgYAAACuBwK3BgAAAK4HCLgGAAAArgcIvQYAALwLrgciBLYGAAAAsAcCtwYAAACwBwi4BgAAALAHCL0GAAC6C7AHIgPqBgAAMQAg6wYAADEAIOwGAAAxACAMEgAAsAsAID4BAP0KACGxBgAArQsAMLIGAAA1ABCzBgAArQsAMPYGAQDCCwAhiQcQAK8LACGbBwEA_QoAIZwHQACuCwAhnQdAAK4LACGXCAAANQAgmAgAADUAIAPqBgAANwAg6wYAADcAIOwGAAA3ACAD6gYAADsAIOsGAAA7ACDsBgAAOwAgA-oGAABSACDrBgAAUgAg7AYAAFIAIAPqBgAAVwAg6wYAAFcAIOwGAABXACAD6gYAAIUBACDrBgAAhQEAIOwGAACFAQAgCwMAAPcKACASAACwCwAgsQYAAIQMADCyBgAAiQEAELMGAACEDAAwwgYBAMILACHoBkAA_goAIekGQAD-CgAh9gYBAMILACGXCAAAiQEAIJgIAACJAQAgEAMAAPcKACAFAACGDAAgEgAAsAsAIC0AAIcMACCxBgAAhQwAMLIGAACLAQAQswYAAIUMADC0BgEAwgsAIcEGAQDCCwAhwgYBAMILACHoBkAA_goAIekGQAD-CgAh9gYBAMILACGKCAEApAsAIZcIAACLAQAgmAgAAIsBACAD6gYAAG4AIOsGAABuACDsBgAAbgAgA-oGAAAvACDrBgAALwAg7AYAAC8AIAPqBgAAKwAg6wYAACsAIOwGAAArACAD6gYAAHcAIOsGAAB3ACDsBgAAdwAgA-oGAACeAQAg6wYAAJ4BACDsBgAAngEAIAPqBgAAwAEAIOsGAADAAQAg7AYAAMABACACvgcAAAC-BwLEBwEAAAABAvYGAQAAAAG-BwAAAL4HAggSAACwCwAgsQYAAK8MADCyBgAAhQEAELMGAACvDAAw6AZAAP4KACH2BgEAwgsAIb4HAADLC74HIsQHAQD2CgAhDBgAAIkMACAmAACyDAAgsQYAALAMADCyBgAAdwAQswYAALAMADDBBgEAwgsAIegGQAD-CgAh9QYBAKQLACHFBwEAwgsAIcYHEACxDAAhxwcBAP0KACHIBwEA_QoAIQi2BhAAAAABtwYQAAAABLgGEAAAAAS5BhAAAAABugYQAAAAAbsGEAAAAAG8BhAAAAABvQYQANELACEgBwAAkQwAIBIAAIkMACAjAAC5DAAgJAAAiQwAICUAAIkMACAnAACqDAAgsQYAALUMADCyBgAAbgAQswYAALUMADDBBgEAwgsAIegGQAD-CgAh6QZAAP4KACHtBgEApAsAIfYGAQCkCwAh_QYAALcMywcilQdAAK4LACGfBwAAtgzKByK-BwAAywu-ByLGBxAAsQwAIcwHAAC4DMwHI80HAQCkCwAhzgcBAPYKACHPByAA9AoAIdAHAQD9CgAh0QcBAP0KACHSBwEA_QoAIdMHAQCkCwAh1AcBAKQLACHVB0AArgsAIdYHQACuCwAhlwgAAG4AIJgIAABuACACvgcAAAC-BwLQBwEAAAABAr4HAAAAvgcC0QcBAAAAAR4HAACRDAAgEgAAiQwAICMAALkMACAkAACJDAAgJQAAiQwAICcAAKoMACCxBgAAtQwAMLIGAABuABCzBgAAtQwAMMEGAQDCCwAh6AZAAP4KACHpBkAA_goAIe0GAQCkCwAh9gYBAKQLACH9BgAAtwzLByKVB0AArgsAIZ8HAAC2DMoHIr4HAADLC74HIsYHEACxDAAhzAcAALgMzAcjzQcBAKQLACHOBwEA9goAIc8HIAD0CgAh0AcBAP0KACHRBwEA_QoAIdIHAQD9CgAh0wcBAKQLACHUBwEApAsAIdUHQACuCwAh1gdAAK4LACEEtgYAAADKBwK3BgAAAMoHCLgGAAAAygcIvQYAANsLygciBLYGAAAAywcCtwYAAADLBwi4BgAAAMsHCL0GAADZC8sHIgS2BgAAAMwHA7cGAAAAzAcJuAYAAADMBwm9BgAA1wvMByMUBQAAuwwAIBgAAIkMACAZAAC8DAAgKAAApwwAILEGAAC6DAAwsgYAAGcAELMGAAC6DAAwtAYBAKQLACHBBgEAwgsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAh9wYBAKQLACGKBwEA9goAIZ8HAAC2DMoHIsYHEACxDAAhzgcBAPYKACGXCAAAZwAgmAgAAGcAIBIFAAC7DAAgGAAAiQwAIBkAALwMACAoAACnDAAgsQYAALoMADCyBgAAZwAQswYAALoMADC0BgEApAsAIcEGAQDCCwAh2gYgAPQKACHoBkAA_goAIekGQAD-CgAh9QYBAKQLACH3BgEApAsAIYoHAQD2CgAhnwcAALYMygcixgcQALEMACHOBwEA9goAIRYDAAD3CgAgKQAAmQwAIC0BAP0KACFPAACKCwAgUAAA6AwAIFgAAOoMACCxBgAA6QwAMLIGAAADABCzBgAA6QwAMMEGAQDCCwAhwgYBAMILACHDBgEA9goAIcQGAQD2CgAhxQZAAK4LACHGBkAArgsAIccGQACuCwAhyAZAAK4LACHJBgEApAsAIcoGAQD9CgAhywYBAP0KACGXCAAAAwAgmAgAAAMAIBcDAACSDAAgGAAAiQwAICAAAJcMACAhAACYDAAgIgAAiQsAICkAAJkMACCxBgAAlgwAMLIGAABkABCzBgAAlgwAMMEGAQDCCwAhwgYBAKQLACHoBkAA_goAIekGQAD-CgAh9QYBAKQLACGEBwEA9goAIbcHAQD9CgAhuAdAAK4LACG5BwEA_QoAIeIHAQD2CgAh4wcBAP0KACHkByAA9AoAIZcIAABkACCYCAAAZAAgEQMAAJIMACASAACJDAAgGQAAvAwAILEGAAC9DAAwsgYAAF8AELMGAAC9DAAwwQYBAMILACHCBgEApAsAIegGQAD-CgAh6QZAAP4KACH2BgEApAsAIfcGAQCkCwAh-AYBAP0KACH5BgIAvgwAIfoGAQD9CgAh-wYAAKULACD9BgAAvwz9BiIItgYCAAAAAbcGAgAAAAW4BgIAAAAFuQYCAAAAAboGAgAAAAG7BgIAAAABvAYCAAAAAb0GAgDlCgAhBLYGAAAA_QYCtwYAAAD9Bgi4BgAAAP0GCL0GAACSC_0GIgL2BgEAAAAB1wcBAAAAAQsSAACwCwAgGwAAwgwAILEGAADBDAAwsgYAAFcAELMGAADBDAAw6QZAAP4KACH2BgEAwgsAIdcHAQDCCwAh2AcCAPUKACHZBwIA9QoAIdoHIAD0CgAhDxoAAMYMACAdAACiDAAgHgAAowwAILEGAADFDAAwsgYAAE4AELMGAADFDAAwwQYBAMILACH0BgIA9QoAIYQHAQD2CgAhhQcBAPYKACG3BwEA_QoAId8HAQDCCwAh4AcCAL4MACGXCAAATgAgmAgAAE4AIAL2BgEAAAAB1wcBAAAAAQoSAACwCwAgGwAAwgwAIBwAAIkMACCxBgAAxAwAMLIGAABSABCzBgAAxAwAMPYGAQDCCwAh1wcBAMILACHbBwEApAsAIdwHQAD-CgAhDRoAAMYMACAdAACiDAAgHgAAowwAILEGAADFDAAwsgYAAE4AELMGAADFDAAwwQYBAMILACH0BgIA9QoAIYQHAQD2CgAhhQcBAPYKACG3BwEA_QoAId8HAQDCCwAh4AcCAL4MACENGQAAyAwAIB8AAMkMACCxBgAAxwwAMLIGAABKABCzBgAAxwwAMMEGAQDCCwAh9AYCAPUKACH3BgEAwgsAIYQHAQD2CgAhtwcBAP0KACHhBwIA9QoAIZcIAABKACCYCAAASgAgCxkAAMgMACAfAADJDAAgsQYAAMcMADCyBgAASgAQswYAAMcMADDBBgEAwgsAIfQGAgD1CgAh9wYBAMILACGEBwEA9goAIbcHAQD9CgAh4QcCAPUKACEXAwAAkgwAIBgAAIkMACAgAACXDAAgIQAAmAwAICIAAIkLACApAACZDAAgsQYAAJYMADCyBgAAZAAQswYAAJYMADDBBgEAwgsAIcIGAQCkCwAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAhhAcBAPYKACG3BwEA_QoAIbgHQACuCwAhuQcBAP0KACHiBwEA9goAIeMHAQD9CgAh5AcgAPQKACGXCAAAZAAgmAgAAGQAIAPqBgAATgAg6wYAAE4AIOwGAABOACAC9gYBAAAAAfcGAQAAAAEKEgAAsAsAIBkAAMgMACAqAACJDAAgsQYAAMsMADCyBgAAQwAQswYAAMsMADD2BgEAwgsAIfcGAQDCCwAh3QcBAKQLACHeB0AA_goAIQLCBgEAAAAB9gYBAAAAAQcDAAD3CgAgEgAAsAsAILEGAADNDAAwsgYAAD8AELMGAADNDAAwwgYBAMILACH2BgEAwgsAIQoSAACwCwAgsQYAAM4MADCyBgAAOwAQswYAAM4MADDBBgEAwgsAIfYGAQDCCwAhkwcAAM8MkwcilAcBAPYKACGVB0AA_goAIZYHQACuCwAhBLYGAAAAkwcCtwYAAACTBwi4BgAAAJMHCL0GAACqC5MHIg0SAACwCwAgsQYAANAMADCyBgAANwAQswYAANAMADDBBgEAwgsAIegGQAD-CgAh9gYBAMILACGUBwEA9goAIZUHQAD-CgAhlwcBAMILACGYB0AArgsAIZkHAQD9CgAhmgcBAP0KACEC9gYBAAAAAZ8HAAAAnwcCDA0BAP0KACESAACwCwAgsQYAANIMADCyBgAAMQAQswYAANIMADDBBgEAwgsAIfYGAQDCCwAhnwcAANMMnwcioAcBAP0KACGhBwEA_QoAIaIHAQD9CgAhowcBAP0KACEEtgYAAACfBwK3BgAAAJ8HCLgGAAAAnwcIvQYAALQLnwciCgcAAPELACBEAACJDAAgsQYAANQMADCyBgAAKwAQswYAANQMADDBBgEAwgsAIegGQAD-CgAh7QYBAMILACHlBwEA9goAIeYHAQCkCwAhCwcAAPELACANAADWDAAgsQYAANUMADCyBgAAFwAQswYAANUMADDBBgEAwgsAIe0GAQDCCwAhigcBAPYKACGnBwEA9goAIfcHAQD2CgAh-AcBAKQLACERCQAA-QsAIAoAAPkLACALAAD6CwAgsQYAAPgLADCyBgAAGQAQswYAAPgLADDBBgEAwgsAIegGQAD-CgAh6QZAAP4KACGgBwEA9goAIaEHAQD2CgAhogcBAPYKACH_BwEA9goAIYAIAQD9CgAhgQgBAP0KACGXCAAAGQAgmAgAABkAIB4IAADZDAAgDgAA2gwAIA8AANsMACAQAADcDAAgEQAAiwsAICgAAKcMACBFAACpDAAgRgAA3QwAIEcAAIYLACBIAADWDAAgSQAA1gwAILEGAADXDAAwsgYAABsAELMGAADXDAAwwQYBAMILACHoBkAA_goAIekGQAD-CgAhigcBAPYKACGnBwEA9goAIaoHAADYDKoHIqwHAQD2CgAhuAdAAK4LACGCCAEA9goAIYMIAQD9CgAhhAgBAP0KACGFCEAA_goAIYYIIAD0CgAhhwgBAP0KACGICAEApAsAIYkIAQCkCwAhBLYGAAAAqgcCtwYAAACqBwi4BgAAAKoHCL0GAAD-C6oHIg4HAADxCwAgsQYAAPYLADCyBgAAFQAQswYAAPYLADDBBgEAwgsAIe0GAQDCCwAh-QcBAPYKACH6BwEA_QoAIfsHAQD9CgAh_AcBAPYKACH9BwEA_QoAIf4HAQD9CgAhlwgAABUAIJgIAAAVACANBwAA8QsAIA0AANYMACCxBgAA1QwAMLIGAAAXABCzBgAA1QwAMMEGAQDCCwAh7QYBAMILACGKBwEA9goAIacHAQD2CgAh9wcBAPYKACH4BwEApAsAIZcIAAAXACCYCAAAFwAgCgcAAPELACCxBgAA8wsAMLIGAAAmABCzBgAA8wsAMMEGAQDCCwAh7QYBAMILACH1BwIA9QoAIfYHAgD1CgAhlwgAACYAIJgIAAAmACAMBwAA8QsAIEwBAPYKACGxBgAA8AsAMLIGAAAoABCzBgAA8AsAMMEGAQDCCwAh7QYBAMILACHyBwEA9goAIfMHAgD1CgAh9AcBAPYKACGXCAAAKAAgmAgAACgAIBIHAADxCwAgGAAAiQwAID4AAIwMACBAAACNDAAgsQYAAIsMADCyBgAAuwEAELMGAACLDAAwwQYBAMILACHoBkAA_goAIekGQAD-CgAh7QYBAMILACH1BgEApAsAIYYHAQD9CgAhhwcBAKQLACGIBwEApAsAIYkHEACvCwAhlwgAALsBACCYCAAAuwEAIAK0BgEAAAAB7QYBAAAAAQ8DAAD3CgAgBwAA8QsAIEoAAOEMACBMAADiDAAgsQYAAN8MADCyBgAAEQAQswYAAN8MADC0BgEAwgsAIbUGAQDCCwAhwQYBAMILACHCBgEAwgsAIegGQAD-CgAh6QZAAP4KACHtBgEAwgsAIf0GAADgDPIHIgS2BgAAAPIHArcGAAAA8gcIuAYAAADyBwi9BgAA7gvyByIKBQAAhgwAIAYAAOUMACBNAACLCwAgsQYAAOQMADCyBgAADQAQswYAAOQMADC0BgEAwgsAIbUGAQDCCwAhlwgAAA0AIJgIAAANACATSwAA6gsAILEGAADoCwAwsgYAAO4BABCzBgAA6AsAMMEGAQDCCwAh6AZAAP4KACHpBkAA_goAIf0GAADpC_EHIucHAQDCCwAh6AcCAPUKACHpBwIA9QoAIeoHAgD1CgAh6wcCAPUKACHsBwIA9QoAIe0HAgD1CgAh7gcBAP0KACHvBwEA_QoAIZcIAADuAQAgmAgAAO4BACACtAYBAAAAAbUGAQAAAAEIBQAAhgwAIAYAAOUMACBNAACLCwAgsQYAAOQMADCyBgAADQAQswYAAOQMADC0BgEAwgsAIbUGAQDCCwAhDQMAAPcKACBOAADoDAAgTwAAigsAILEGAADnDAAwsgYAAAkAELMGAADnDAAwwQYBAMILACHCBgEAwgsAIcwGAQD2CgAhzQYBAPYKACHOBgEA9goAIZcIAAAJACCYCAAACQAgAsIGAQAAAAHMBgEAAAABCwMAAPcKACBOAADoDAAgTwAAigsAILEGAADnDAAwsgYAAAkAELMGAADnDAAwwQYBAMILACHCBgEAwgsAIcwGAQD2CgAhzQYBAPYKACHOBgEA9goAIQPqBgAADQAg6wYAAA0AIOwGAAANACAUAwAA9woAICkAAJkMACAtAQD9CgAhTwAAigsAIFAAAOgMACBYAADqDAAgsQYAAOkMADCyBgAAAwAQswYAAOkMADDBBgEAwgsAIcIGAQDCCwAhwwYBAPYKACHEBgEA9goAIcUGQACuCwAhxgZAAK4LACHHBkAArgsAIcgGQACuCwAhyQYBAKQLACHKBgEA_QoAIcsGAQD9CgAhCFEAAIELACCxBgAAgwwAMLIGAACPAgAQswYAAIMMADDBBgEAwgsAIYoHAQD2CgAhlwgAAI8CACCYCAAAjwIAIAAAAAGcCAEAAAABBWUAAOoZACBmAAD7GQAgmQgAAOsZACCaCAAA-hkAIJ8IAAAFACAFZQAA6BkAIGYAAPgZACCZCAAA6RkAIJoIAAD3GQAgnwgAAAsAIAtlAADyDAAwZgAA9wwAMJkIAADzDAAwmggAAPQMADCbCAAA9QwAIJwIAAD2DAAwnQgAAPYMADCeCAAA9gwAMJ8IAAD2DAAwoAgAAPgMADChCAAA-QwAMAkDAACMDQAgBwAAiw0AIEwAAI0NACDBBgEAAAABwgYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAf0GAAAA8gcCAgAAABMAIGUAAIoNACADAAAAEwAgZQAAig0AIGYAAP4MACABXgAA9hkAMBADAAD3CgAgBwAA8QsAIEoAAOEMACBMAADiDAAgsQYAAN8MADCyBgAAEQAQswYAAN8MADC0BgEAwgsAIbUGAQDCCwAhwQYBAAAAAcIGAQDCCwAh6AZAAP4KACHpBkAA_goAIe0GAQDCCwAh_QYAAOAM8gcilAgAAN4MACACAAAAEwAgXgAA_gwAIAIAAAD6DAAgXgAA-wwAIAuxBgAA-QwAMLIGAAD6DAAQswYAAPkMADC0BgEAwgsAIbUGAQDCCwAhwQYBAMILACHCBgEAwgsAIegGQAD-CgAh6QZAAP4KACHtBgEAwgsAIf0GAADgDPIHIguxBgAA-QwAMLIGAAD6DAAQswYAAPkMADC0BgEAwgsAIbUGAQDCCwAhwQYBAMILACHCBgEAwgsAIegGQAD-CgAh6QZAAP4KACHtBgEAwgsAIf0GAADgDPIHIgbBBgEA7gwAIcIGAQDuDAAh6AZAAP0MACHpBkAA_QwAIe0GAQDuDAAh_QYAAPwM8gciAZwIAAAA8gcCAZwIQAAAAAEJAwAAgA0AIAcAAP8MACBMAACBDQAgwQYBAO4MACHCBgEA7gwAIegGQAD9DAAh6QZAAP0MACHtBgEA7gwAIf0GAAD8DPIHIgVlAADuGQAgZgAA9BkAIJkIAADvGQAgmggAAPMZACCfCAAAHQAgBWUAAOwZACBmAADxGQAgmQgAAO0ZACCaCAAA8BkAIJ8IAADmCQAgB2UAAIINACBmAACFDQAgmQgAAIMNACCaCAAAhA0AIJ0IAADuAQAgnggAAO4BACCfCAAAmgQAIAzBBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAAPEHAugHAgAAAAHpBwIAAAAB6gcCAAAAAesHAgAAAAHsBwIAAAAB7QcCAAAAAe4HAQAAAAHvBwEAAAABAgAAAJoEACBlAACCDQAgAwAAAO4BACBlAACCDQAgZgAAhg0AIA4AAADuAQAgXgAAhg0AIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAACJDfEHIugHAgCHDQAh6QcCAIcNACHqBwIAhw0AIesHAgCHDQAh7AcCAIcNACHtBwIAhw0AIe4HAQCIDQAh7wcBAIgNACEMwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAIkN8Qci6AcCAIcNACHpBwIAhw0AIeoHAgCHDQAh6wcCAIcNACHsBwIAhw0AIe0HAgCHDQAh7gcBAIgNACHvBwEAiA0AIQWcCAIAAAABoggCAAAAAaMIAgAAAAGkCAIAAAABpQgCAAAAAQGcCAEAAAABAZwIAAAA8QcCCQMAAIwNACAHAACLDQAgTAAAjQ0AIMEGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB_QYAAADyBwIDZQAA7hkAIJkIAADvGQAgnwgAAB0AIANlAADsGQAgmQgAAO0ZACCfCAAA5gkAIANlAACCDQAgmQgAAIMNACCfCAAAmgQAIANlAADqGQAgmQgAAOsZACCfCAAABQAgA2UAAOgZACCZCAAA6RkAIJ8IAAALACAEZQAA8gwAMJkIAADzDAAwmwgAAPUMACCfCAAA9gwAMAAAAAABnAhAAAAAAQVlAACpGQAgZgAA5hkAIJkIAACqGQAgmggAAOUZACCfCAAA5gkAIAdlAACnGQAgZgAA4xkAIJkIAACoGQAgmggAAOIZACCdCAAAjwIAIJ4IAACPAgAgnwgAAAEAIAtlAADpDQAwZgAA7g0AMJkIAADqDQAwmggAAOsNADCbCAAA7A0AIJwIAADtDQAwnQgAAO0NADCeCAAA7Q0AMJ8IAADtDQAwoAgAAO8NADChCAAA8A0AMAtlAACtDQAwZgAAsg0AMJkIAACuDQAwmggAAK8NADCbCAAAsA0AIJwIAACxDQAwnQgAALENADCeCAAAsQ0AMJ8IAACxDQAwoAgAALMNADChCAAAtA0AMAtlAACbDQAwZgAAoA0AMJkIAACcDQAwmggAAJ0NADCbCAAAng0AIJwIAACfDQAwnQgAAJ8NADCeCAAAnw0AMJ8IAACfDQAwoAgAAKENADChCAAAog0AMAkDAACrDQAgEgAAqg0AIC0AAKwNACDBBgEAAAABwgYBAAAAAegGQAAAAAHpBkAAAAAB9gYBAAAAAYoIAQAAAAECAAAA8gEAIGUAAKkNACADAAAA8gEAIGUAAKkNACBmAAClDQAgAV4AAOEZADAOAwAA9woAIAUAAIYMACASAACwCwAgLQAAhwwAILEGAACFDAAwsgYAAIsBABCzBgAAhQwAMLQGAQDCCwAhwQYBAAAAAcIGAQDCCwAh6AZAAP4KACHpBkAA_goAIfYGAQAAAAGKCAEApAsAIQIAAADyAQAgXgAApQ0AIAIAAACjDQAgXgAApA0AIAqxBgAAog0AMLIGAACjDQAQswYAAKINADC0BgEAwgsAIcEGAQDCCwAhwgYBAMILACHoBkAA_goAIekGQAD-CgAh9gYBAMILACGKCAEApAsAIQqxBgAAog0AMLIGAACjDQAQswYAAKINADC0BgEAwgsAIcEGAQDCCwAhwgYBAMILACHoBkAA_goAIekGQAD-CgAh9gYBAMILACGKCAEApAsAIQbBBgEA7gwAIcIGAQDuDAAh6AZAAP0MACHpBkAA_QwAIfYGAQDuDAAhiggBAIgNACEJAwAApw0AIBIAAKYNACAtAACoDQAgwQYBAO4MACHCBgEA7gwAIegGQAD9DAAh6QZAAP0MACH2BgEA7gwAIYoIAQCIDQAhBWUAANYZACBmAADfGQAgmQgAANcZACCaCAAA3hkAIJ8IAACSAQAgBWUAANQZACBmAADcGQAgmQgAANUZACCaCAAA2xkAIJ8IAADmCQAgB2UAANIZACBmAADZGQAgmQgAANMZACCaCAAA2BkAIJ0IAAAJACCeCAAACQAgnwgAAAsAIAkDAACrDQAgEgAAqg0AIC0AAKwNACDBBgEAAAABwgYBAAAAAegGQAAAAAHpBkAAAAAB9gYBAAAAAYoIAQAAAAEDZQAA1hkAIJkIAADXGQAgnwgAAJIBACADZQAA1BkAIJkIAADVGQAgnwgAAOYJACADZQAA0hkAIJkIAADTGQAgnwgAAAsAIA0YAADnDQAgGQAA5g0AICgAAOgNACDBBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAfcGAQAAAAGKBwEAAAABnwcAAADKBwLGBxAAAAABzgcBAAAAAQIAAABpACBlAADlDQAgAwAAAGkAIGUAAOUNACBmAAC6DQAgAV4AANEZADASBQAAuwwAIBgAAIkMACAZAAC8DAAgKAAApwwAILEGAAC6DAAwsgYAAGcAELMGAAC6DAAwtAYBAKQLACHBBgEAAAAB2gYgAPQKACHoBkAA_goAIekGQAD-CgAh9QYBAKQLACH3BgEApAsAIYoHAQD2CgAhnwcAALYMygcixgcQALEMACHOBwEA9goAIQIAAABpACBeAAC6DQAgAgAAALUNACBeAAC2DQAgDrEGAAC0DQAwsgYAALUNABCzBgAAtA0AMLQGAQCkCwAhwQYBAMILACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIfcGAQCkCwAhigcBAPYKACGfBwAAtgzKByLGBxAAsQwAIc4HAQD2CgAhDrEGAAC0DQAwsgYAALUNABCzBgAAtA0AMLQGAQCkCwAhwQYBAMILACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIfcGAQCkCwAhigcBAPYKACGfBwAAtgzKByLGBxAAsQwAIc4HAQD2CgAhCsEGAQDuDAAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh9QYBAIgNACH3BgEAiA0AIYoHAQDuDAAhnwcAALcNygcixgcQALgNACHOBwEA7gwAIQGcCAAAAMoHAgWcCBAAAAABoggQAAAAAaMIEAAAAAGkCBAAAAABpQgQAAAAAQGcCCAAAAABDRgAALwNACAZAAC7DQAgKAAAvQ0AIMEGAQDuDAAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh9QYBAIgNACH3BgEAiA0AIYoHAQDuDAAhnwcAALcNygcixgcQALgNACHOBwEA7gwAIQdlAACuGQAgZgAAzxkAIJkIAACvGQAgmggAAM4ZACCdCAAAZAAgnggAAGQAIJ8IAACWAQAgB2UAAKwZACBmAADMGQAgmQgAAK0ZACCaCAAAyxkAIJ0IAAAvACCeCAAALwAgnwgAAJIBACALZQAAvg0AMGYAAMMNADCZCAAAvw0AMJoIAADADQAwmwgAAMENACCcCAAAwg0AMJ0IAADCDQAwnggAAMINADCfCAAAwg0AMKAIAADEDQAwoQgAAMUNADAZBwAA4A0AIBIAAOENACAkAADiDQAgJQAA4w0AICcAAOQNACDBBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB9gYBAAAAAf0GAAAAywcClQdAAAAAAZ8HAAAAygcCvgcAAAC-BwLGBxAAAAABzAcAAADMBwPOBwEAAAABzwcgAAAAAdAHAQAAAAHRBwEAAAAB0gcBAAAAAdMHAQAAAAHUBwEAAAAB1QdAAAAAAdYHQAAAAAECAAAAcAAgZQAA3w0AIAMAAABwACBlAADfDQAgZgAAyw0AIAFeAADKGQAwIAcAAJEMACASAACJDAAgIwAAuQwAICQAAIkMACAlAACJDAAgJwAAqgwAILEGAAC1DAAwsgYAAG4AELMGAAC1DAAwwQYBAAAAAegGQAD-CgAh6QZAAP4KACHtBgEApAsAIfYGAQCkCwAh_QYAALcMywcilQdAAK4LACGfBwAAtgzKByK-BwAAywu-ByLGBxAAsQwAIcwHAAC4DMwHI80HAQCkCwAhzgcBAPYKACHPByAA9AoAIdAHAQD9CgAh0QcBAP0KACHSBwEAAAAB0wcBAKQLACHUBwEApAsAIdUHQACuCwAh1gdAAK4LACGOCAAAswwAII8IAAC0DAAgAgAAAHAAIF4AAMsNACACAAAAxg0AIF4AAMcNACAYsQYAAMUNADCyBgAAxg0AELMGAADFDQAwwQYBAMILACHoBkAA_goAIekGQAD-CgAh7QYBAKQLACH2BgEApAsAIf0GAAC3DMsHIpUHQACuCwAhnwcAALYMygcivgcAAMsLvgcixgcQALEMACHMBwAAuAzMByPNBwEApAsAIc4HAQD2CgAhzwcgAPQKACHQBwEA_QoAIdEHAQD9CgAh0gcBAP0KACHTBwEApAsAIdQHAQCkCwAh1QdAAK4LACHWB0AArgsAIRixBgAAxQ0AMLIGAADGDQAQswYAAMUNADDBBgEAwgsAIegGQAD-CgAh6QZAAP4KACHtBgEApAsAIfYGAQCkCwAh_QYAALcMywcilQdAAK4LACGfBwAAtgzKByK-BwAAywu-ByLGBxAAsQwAIcwHAAC4DMwHI80HAQCkCwAhzgcBAPYKACHPByAA9AoAIdAHAQD9CgAh0QcBAP0KACHSBwEA_QoAIdMHAQCkCwAh1AcBAKQLACHVB0AArgsAIdYHQACuCwAhFMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIe0GAQCIDQAh9gYBAIgNACH9BgAAyA3LByKVB0AAlQ0AIZ8HAAC3DcoHIr4HAADJDb4HIsYHEAC4DQAhzAcAAMoNzAcjzgcBAO4MACHPByAAuQ0AIdAHAQCIDQAh0QcBAIgNACHSBwEAiA0AIdMHAQCIDQAh1AcBAIgNACHVB0AAlQ0AIdYHQACVDQAhAZwIAAAAywcCAZwIAAAAvgcCAZwIAAAAzAcDGQcAAMwNACASAADNDQAgJAAAzg0AICUAAM8NACAnAADQDQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh7QYBAIgNACH2BgEAiA0AIf0GAADIDcsHIpUHQACVDQAhnwcAALcNygcivgcAAMkNvgcixgcQALgNACHMBwAAyg3MByPOBwEA7gwAIc8HIAC5DQAh0AcBAIgNACHRBwEAiA0AIdIHAQCIDQAh0wcBAIgNACHUBwEAiA0AIdUHQACVDQAh1gdAAJUNACEHZQAAthkAIGYAAMgZACCZCAAAtxkAIJoIAADHGQAgnQgAABsAIJ4IAAAbACCfCAAAHQAgB2UAALQZACBmAADFGQAgmQgAALUZACCaCAAAxBkAIJ0IAAAvACCeCAAALwAgnwgAAJIBACAHZQAAshkAIGYAAMIZACCZCAAAsxkAIJoIAADBGQAgnQgAAC8AIJ4IAAAvACCfCAAAkgEAIAdlAACwGQAgZgAAvxkAIJkIAACxGQAgmggAAL4ZACCdCAAALwAgnggAAC8AIJ8IAACSAQAgC2UAANENADBmAADWDQAwmQgAANINADCaCAAA0w0AMJsIAADUDQAgnAgAANUNADCdCAAA1Q0AMJ4IAADVDQAwnwgAANUNADCgCAAA1w0AMKEIAADYDQAwBxgAAN4NACDBBgEAAAAB6AZAAAAAAfUGAQAAAAHGBxAAAAABxwcBAAAAAcgHAQAAAAECAAAAeQAgZQAA3Q0AIAMAAAB5ACBlAADdDQAgZgAA2w0AIAFeAAC9GQAwDBgAAIkMACAmAACyDAAgsQYAALAMADCyBgAAdwAQswYAALAMADDBBgEAAAAB6AZAAP4KACH1BgEApAsAIcUHAQDCCwAhxgcQALEMACHHBwEA_QoAIcgHAQD9CgAhAgAAAHkAIF4AANsNACACAAAA2Q0AIF4AANoNACAKsQYAANgNADCyBgAA2Q0AELMGAADYDQAwwQYBAMILACHoBkAA_goAIfUGAQCkCwAhxQcBAMILACHGBxAAsQwAIccHAQD9CgAhyAcBAP0KACEKsQYAANgNADCyBgAA2Q0AELMGAADYDQAwwQYBAMILACHoBkAA_goAIfUGAQCkCwAhxQcBAMILACHGBxAAsQwAIccHAQD9CgAhyAcBAP0KACEGwQYBAO4MACHoBkAA_QwAIfUGAQCIDQAhxgcQALgNACHHBwEAiA0AIcgHAQCIDQAhBxgAANwNACDBBgEA7gwAIegGQAD9DAAh9QYBAIgNACHGBxAAuA0AIccHAQCIDQAhyAcBAIgNACEHZQAAuBkAIGYAALsZACCZCAAAuRkAIJoIAAC6GQAgnQgAAC8AIJ4IAAAvACCfCAAAkgEAIAcYAADeDQAgwQYBAAAAAegGQAAAAAH1BgEAAAABxgcQAAAAAccHAQAAAAHIBwEAAAABA2UAALgZACCZCAAAuRkAIJ8IAACSAQAgGQcAAOANACASAADhDQAgJAAA4g0AICUAAOMNACAnAADkDQAgwQYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAfYGAQAAAAH9BgAAAMsHApUHQAAAAAGfBwAAAMoHAr4HAAAAvgcCxgcQAAAAAcwHAAAAzAcDzgcBAAAAAc8HIAAAAAHQBwEAAAAB0QcBAAAAAdIHAQAAAAHTBwEAAAAB1AcBAAAAAdUHQAAAAAHWB0AAAAABA2UAALYZACCZCAAAtxkAIJ8IAAAdACADZQAAtBkAIJkIAAC1GQAgnwgAAJIBACADZQAAshkAIJkIAACzGQAgnwgAAJIBACADZQAAsBkAIJkIAACxGQAgnwgAAJIBACAEZQAA0Q0AMJkIAADSDQAwmwgAANQNACCfCAAA1Q0AMA0YAADnDQAgGQAA5g0AICgAAOgNACDBBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAfcGAQAAAAGKBwEAAAABnwcAAADKBwLGBxAAAAABzgcBAAAAAQNlAACuGQAgmQgAAK8ZACCfCAAAlgEAIANlAACsGQAgmQgAAK0ZACCfCAAAkgEAIARlAAC-DQAwmQgAAL8NADCbCAAAwQ0AIJ8IAADCDQAwAwYAAI8NACBNAACQDQAgtQYBAAAAAQIAAAAPACBlAAD0DQAgAwAAAA8AIGUAAPQNACBmAADzDQAgAV4AAKsZADAJBQAAhgwAIAYAAOUMACBNAACLCwAgsQYAAOQMADCyBgAADQAQswYAAOQMADC0BgEAwgsAIbUGAQDCCwAhlQgAAOMMACACAAAADwAgXgAA8w0AIAIAAADxDQAgXgAA8g0AIAWxBgAA8A0AMLIGAADxDQAQswYAAPANADC0BgEAwgsAIbUGAQDCCwAhBbEGAADwDQAwsgYAAPENABCzBgAA8A0AMLQGAQDCCwAhtQYBAMILACEBtQYBAO4MACEDBgAA8AwAIE0AAPEMACC1BgEA7gwAIQMGAACPDQAgTQAAkA0AILUGAQAAAAEDZQAAqRkAIJkIAACqGQAgnwgAAOYJACADZQAApxkAIJkIAACoGQAgnwgAAAEAIARlAADpDQAwmQgAAOoNADCbCAAA7A0AIJ8IAADtDQAwBGUAAK0NADCZCAAArg0AMJsIAACwDQAgnwgAALENADAEZQAAmw0AMJkIAACcDQAwmwgAAJ4NACCfCAAAnw0AMAAAAAVlAACbGQAgZgAApRkAIJkIAACcGQAgmggAAKQZACCfCAAA5gkAIAtlAACLDgAwZgAAjw4AMJkIAACMDgAwmggAAI0OADCbCAAAjg4AIJwIAADtDQAwnQgAAO0NADCeCAAA7Q0AMJ8IAADtDQAwoAgAAJAOADChCAAA8A0AMAtlAACADgAwZgAAhA4AMJkIAACBDgAwmggAAIIOADCbCAAAgw4AIJwIAACfDQAwnQgAAJ8NADCeCAAAnw0AMJ8IAACfDQAwoAgAAIUOADChCAAAog0AMAkDAACrDQAgBQAAig4AIBIAAKoNACC0BgEAAAABwQYBAAAAAcIGAQAAAAHoBkAAAAAB6QZAAAAAAfYGAQAAAAECAAAA8gEAIGUAAIkOACADAAAA8gEAIGUAAIkOACBmAACHDgAgAV4AAKMZADACAAAA8gEAIF4AAIcOACACAAAAow0AIF4AAIYOACAGtAYBAO4MACHBBgEA7gwAIcIGAQDuDAAh6AZAAP0MACHpBkAA_QwAIfYGAQDuDAAhCQMAAKcNACAFAACIDgAgEgAApg0AILQGAQDuDAAhwQYBAO4MACHCBgEA7gwAIegGQAD9DAAh6QZAAP0MACH2BgEA7gwAIQVlAACeGQAgZgAAoRkAIJkIAACfGQAgmggAAKAZACCfCAAABQAgCQMAAKsNACAFAACKDgAgEgAAqg0AILQGAQAAAAHBBgEAAAABwgYBAAAAAegGQAAAAAHpBkAAAAAB9gYBAAAAAQNlAACeGQAgmQgAAJ8ZACCfCAAABQAgAwUAAI4NACBNAACQDQAgtAYBAAAAAQIAAAAPACBlAACTDgAgAwAAAA8AIGUAAJMOACBmAACSDgAgAV4AAJ0ZADACAAAADwAgXgAAkg4AIAIAAADxDQAgXgAAkQ4AIAG0BgEA7gwAIQMFAADvDAAgTQAA8QwAILQGAQDuDAAhAwUAAI4NACBNAACQDQAgtAYBAAAAAQNlAACbGQAgmQgAAJwZACCfCAAA5gkAIARlAACLDgAwmQgAAIwOADCbCAAAjg4AIJ8IAADtDQAwBGUAAIAOADCZCAAAgQ4AMJsIAACDDgAgnwgAAJ8NADAAAAAAAAVlAACWGQAgZgAAmRkAIJkIAACXGQAgmggAAJgZACCfCAAA5gkAIANlAACWGQAgmQgAAJcZACCfCAAA5gkAIBEEAADkEAAgFwAA6BAAIEcAAOsQACBNAADwEAAgTwAA7xAAIFAAAOUQACBRAADmEAAgUgAA5xAAIFMAAOkQACBUAADqEAAgVQAA7BAAIFYAAO0QACBXAADuEAAgygYAAJENACDbBgAAkQ0AINwGAACRDQAg3wYAAJENACAAAAAAAAdlAADSEAAgZgAA1RAAIJkIAADTEAAgmggAANQQACCdCAAABwAgnggAAAcAIJ8IAAD-CQAgC2UAAMYQADBmAADLEAAwmQgAAMcQADCaCAAAyBAAMJsIAADJEAAgnAgAAMoQADCdCAAAyhAAMJ4IAADKEAAwnwgAAMoQADCgCAAAzBAAMKEIAADNEAAwC2UAALoQADBmAAC_EAAwmQgAALsQADCaCAAAvBAAMJsIAAC9EAAgnAgAAL4QADCdCAAAvhAAMJ4IAAC-EAAwnwgAAL4QADCgCAAAwBAAMKEIAADBEAAwC2UAAMIPADBmAADHDwAwmQgAAMMPADCaCAAAxA8AMJsIAADFDwAgnAgAAMYPADCdCAAAxg8AMJ4IAADGDwAwnwgAAMYPADCgCAAAyA8AMKEIAADJDwAwC2UAALQPADBmAAC5DwAwmQgAALUPADCaCAAAtg8AMJsIAAC3DwAgnAgAALgPADCdCAAAuA8AMJ4IAAC4DwAwnwgAALgPADCgCAAAug8AMKEIAAC7DwAwC2UAAKYPADBmAACrDwAwmQgAAKcPADCaCAAAqA8AMJsIAACpDwAgnAgAAKoPADCdCAAAqg8AMJ4IAACqDwAwnwgAAKoPADCgCAAArA8AMKEIAACtDwAwC2UAAIMPADBmAACIDwAwmQgAAIQPADCaCAAAhQ8AMJsIAACGDwAgnAgAAIcPADCdCAAAhw8AMJ4IAACHDwAwnwgAAIcPADCgCAAAiQ8AMKEIAACKDwAwC2UAAPMOADBmAAD4DgAwmQgAAPQOADCaCAAA9Q4AMJsIAAD2DgAgnAgAAPcOADCdCAAA9w4AMJ4IAAD3DgAwnwgAAPcOADCgCAAA-Q4AMKEIAAD6DgAwC2UAAOUOADBmAADqDgAwmQgAAOYOADCaCAAA5w4AMJsIAADoDgAgnAgAAOkOADCdCAAA6Q4AMJ4IAADpDgAwnwgAAOkOADCgCAAA6w4AMKEIAADsDgAwC2UAANcOADBmAADcDgAwmQgAANgOADCaCAAA2Q4AMJsIAADaDgAgnAgAANsOADCdCAAA2w4AMJ4IAADbDgAwnwgAANsOADCgCAAA3Q4AMKEIAADeDgAwC2UAAMUOADBmAADKDgAwmQgAAMYOADCaCAAAxw4AMJsIAADIDgAgnAgAAMkOADCdCAAAyQ4AMJ4IAADJDgAwnwgAAMkOADCgCAAAyw4AMKEIAADMDgAwC2UAALwOADBmAADADgAwmQgAAL0OADCaCAAAvg4AMJsIAAC_DgAgnAgAAJ8NADCdCAAAnw0AMJ4IAACfDQAwnwgAAJ8NADCgCAAAwQ4AMKEIAACiDQAwC2UAALEOADBmAAC1DgAwmQgAALIOADCaCAAAsw4AMJsIAAC0DgAgnAgAAPYMADCdCAAA9gwAMJ4IAAD2DAAwnwgAAPYMADCgCAAAtg4AMKEIAAD5DAAwCgcAAIsNACBKAAC7DgAgTAAAjQ0AILQGAQAAAAG1BgEAAAABwQYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAf0GAAAA8gcCAgAAABMAIGUAALoOACADAAAAEwAgZQAAug4AIGYAALgOACABXgAAlRkAMAIAAAATACBeAAC4DgAgAgAAAPoMACBeAAC3DgAgB7QGAQDuDAAhtQYBAO4MACHBBgEA7gwAIegGQAD9DAAh6QZAAP0MACHtBgEA7gwAIf0GAAD8DPIHIgoHAAD_DAAgSgAAuQ4AIEwAAIENACC0BgEA7gwAIbUGAQDuDAAhwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh7QYBAO4MACH9BgAA_AzyByIFZQAAkBkAIGYAAJMZACCZCAAAkRkAIJoIAACSGQAgnwgAAA8AIAoHAACLDQAgSgAAuw4AIEwAAI0NACC0BgEAAAABtQYBAAAAAcEGAQAAAAHoBkAAAAAB6QZAAAAAAe0GAQAAAAH9BgAAAPIHAgNlAACQGQAgmQgAAJEZACCfCAAADwAgCQUAAIoOACASAACqDQAgLQAArA0AILQGAQAAAAHBBgEAAAAB6AZAAAAAAekGQAAAAAH2BgEAAAABiggBAAAAAQIAAADyAQAgZQAAxA4AIAMAAADyAQAgZQAAxA4AIGYAAMMOACABXgAAjxkAMAIAAADyAQAgXgAAww4AIAIAAACjDQAgXgAAwg4AIAa0BgEA7gwAIcEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIfYGAQDuDAAhiggBAIgNACEJBQAAiA4AIBIAAKYNACAtAACoDQAgtAYBAO4MACHBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH2BgEA7gwAIYoIAQCIDQAhCQUAAIoOACASAACqDQAgLQAArA0AILQGAQAAAAHBBgEAAAAB6AZAAAAAAekGQAAAAAH2BgEAAAABiggBAAAAAQwSAADVDgAgGQAA1g4AIMEGAQAAAAHoBkAAAAAB6QZAAAAAAfYGAQAAAAH3BgEAAAAB-AYBAAAAAfkGAgAAAAH6BgEAAAAB-waAAAAAAf0GAAAA_QYCAgAAAGEAIGUAANQOACADAAAAYQAgZQAA1A4AIGYAANEOACABXgAAjhkAMBEDAACSDAAgEgAAiQwAIBkAALwMACCxBgAAvQwAMLIGAABfABCzBgAAvQwAMMEGAQAAAAHCBgEApAsAIegGQAD-CgAh6QZAAP4KACH2BgEApAsAIfcGAQCkCwAh-AYBAP0KACH5BgIAvgwAIfoGAQD9CgAh-wYAAKULACD9BgAAvwz9BiICAAAAYQAgXgAA0Q4AIAIAAADNDgAgXgAAzg4AIA6xBgAAzA4AMLIGAADNDgAQswYAAMwOADDBBgEAwgsAIcIGAQCkCwAh6AZAAP4KACHpBkAA_goAIfYGAQCkCwAh9wYBAKQLACH4BgEA_QoAIfkGAgC-DAAh-gYBAP0KACH7BgAApQsAIP0GAAC_DP0GIg6xBgAAzA4AMLIGAADNDgAQswYAAMwOADDBBgEAwgsAIcIGAQCkCwAh6AZAAP4KACHpBkAA_goAIfYGAQCkCwAh9wYBAKQLACH4BgEA_QoAIfkGAgC-DAAh-gYBAP0KACH7BgAApQsAIP0GAAC_DP0GIgrBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH2BgEAiA0AIfcGAQCIDQAh-AYBAIgNACH5BgIAzw4AIfoGAQCIDQAh-waAAAAAAf0GAADQDv0GIgWcCAIAAAABoggCAAAAAaMIAgAAAAGkCAIAAAABpQgCAAAAAQGcCAAAAP0GAgwSAADSDgAgGQAA0w4AIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIfYGAQCIDQAh9wYBAIgNACH4BgEAiA0AIfkGAgDPDgAh-gYBAIgNACH7BoAAAAAB_QYAANAO_QYiB2UAAIYZACBmAACMGQAgmQgAAIcZACCaCAAAixkAIJ0IAAAvACCeCAAALwAgnwgAAJIBACAHZQAAhBkAIGYAAIkZACCZCAAAhRkAIJoIAACIGQAgnQgAAGQAIJ4IAABkACCfCAAAlgEAIAwSAADVDgAgGQAA1g4AIMEGAQAAAAHoBkAAAAAB6QZAAAAAAfYGAQAAAAH3BgEAAAAB-AYBAAAAAfkGAgAAAAH6BgEAAAAB-waAAAAAAf0GAAAA_QYCA2UAAIYZACCZCAAAhxkAIJ8IAACSAQAgA2UAAIQZACCZCAAAhRkAIJ8IAACWAQAgCBgAAOQOACDBBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAYQHAQAAAAGFBwEAAAABAgAAAKUBACBlAADjDgAgAwAAAKUBACBlAADjDgAgZgAA4Q4AIAFeAACDGQAwDQMAAJIMACAYAACJDAAgsQYAAJQMADCyBgAAowEAELMGAACUDAAwwQYBAAAAAcIGAQCkCwAh2gYgAPQKACHoBkAA_goAIekGQAD-CgAh9QYBAKQLACGEBwEA9goAIYUHAQD2CgAhAgAAAKUBACBeAADhDgAgAgAAAN8OACBeAADgDgAgC7EGAADeDgAwsgYAAN8OABCzBgAA3g4AMMEGAQDCCwAhwgYBAKQLACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIYQHAQD2CgAhhQcBAPYKACELsQYAAN4OADCyBgAA3w4AELMGAADeDgAwwQYBAMILACHCBgEApAsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAhhAcBAPYKACGFBwEA9goAIQfBBgEA7gwAIdoGIAC5DQAh6AZAAP0MACHpBkAA_QwAIfUGAQCIDQAhhAcBAO4MACGFBwEA7gwAIQgYAADiDgAgwQYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIYQHAQDuDAAhhQcBAO4MACEHZQAA_hgAIGYAAIEZACCZCAAA_xgAIJoIAACAGQAgnQgAAC8AIJ4IAAAvACCfCAAAkgEAIAgYAADkDgAgwQYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAfUGAQAAAAGEBwEAAAABhQcBAAAAAQNlAAD-GAAgmQgAAP8YACCfCAAAkgEAIAkYAADyDgAgwQYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAe4GAQAAAAHvBgEAAAAB9QYBAAAAAYQHAQAAAAECAAAAqwEAIGUAAPEOACADAAAAqwEAIGUAAPEOACBmAADvDgAgAV4AAP0YADAOAwAAkgwAIBgAAIkMACCxBgAAkwwAMLIGAACpAQAQswYAAJMMADDBBgEAAAABwgYBAKQLACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACHuBgEA9goAIe8GAQD9CgAh9QYBAKQLACGEBwEA_QoAIQIAAACrAQAgXgAA7w4AIAIAAADtDgAgXgAA7g4AIAyxBgAA7A4AMLIGAADtDgAQswYAAOwOADDBBgEAwgsAIcIGAQCkCwAh2gYgAPQKACHoBkAA_goAIekGQAD-CgAh7gYBAPYKACHvBgEA_QoAIfUGAQCkCwAhhAcBAP0KACEMsQYAAOwOADCyBgAA7Q4AELMGAADsDgAwwQYBAMILACHCBgEApAsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIe4GAQD2CgAh7wYBAP0KACH1BgEApAsAIYQHAQD9CgAhCMEGAQDuDAAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh7gYBAO4MACHvBgEAiA0AIfUGAQCIDQAhhAcBAIgNACEJGAAA8A4AIMEGAQDuDAAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh7gYBAO4MACHvBgEAiA0AIfUGAQCIDQAhhAcBAIgNACEHZQAA-BgAIGYAAPsYACCZCAAA-RgAIJoIAAD6GAAgnQgAAC8AIJ4IAAAvACCfCAAAkgEAIAkYAADyDgAgwQYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAe4GAQAAAAHvBgEAAAAB9QYBAAAAAYQHAQAAAAEDZQAA-BgAIJkIAAD5GAAgnwgAAJIBACARBwAAgQ8AIBgAAIIPACDBBgEAAAABygYBAAAAAcsGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB7gYBAAAAAe8GAQAAAAHwBgEAAAAB8QYBAAAAAfIGAQAAAAHzBgEAAAAB9AYCAAAAAfUGAQAAAAECAAAAsQEAIGUAAIAPACADAAAAsQEAIGUAAIAPACBmAAD9DgAgAV4AAPcYADAWAwAAkgwAIAcAAJEMACAYAACJDAAgsQYAAJAMADCyBgAArwEAELMGAACQDAAwwQYBAAAAAcIGAQCkCwAhygYBAP0KACHLBgEA_QoAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIe0GAQCkCwAh7gYBAP0KACHvBgEA_QoAIfAGAQD9CgAh8QYBAP0KACHyBgEA_QoAIfMGAQD9CgAh9AYCAPUKACH1BgEApAsAIQIAAACxAQAgXgAA_Q4AIAIAAAD7DgAgXgAA_A4AIBOxBgAA-g4AMLIGAAD7DgAQswYAAPoOADDBBgEAwgsAIcIGAQCkCwAhygYBAP0KACHLBgEA_QoAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIe0GAQCkCwAh7gYBAP0KACHvBgEA_QoAIfAGAQD9CgAh8QYBAP0KACHyBgEA_QoAIfMGAQD9CgAh9AYCAPUKACH1BgEApAsAIROxBgAA-g4AMLIGAAD7DgAQswYAAPoOADDBBgEAwgsAIcIGAQCkCwAhygYBAP0KACHLBgEA_QoAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIe0GAQCkCwAh7gYBAP0KACHvBgEA_QoAIfAGAQD9CgAh8QYBAP0KACHyBgEA_QoAIfMGAQD9CgAh9AYCAPUKACH1BgEApAsAIQ_BBgEA7gwAIcoGAQCIDQAhywYBAIgNACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACHtBgEAiA0AIe4GAQCIDQAh7wYBAIgNACHwBgEAiA0AIfEGAQCIDQAh8gYBAIgNACHzBgEAiA0AIfQGAgCHDQAh9QYBAIgNACERBwAA_g4AIBgAAP8OACDBBgEA7gwAIcoGAQCIDQAhywYBAIgNACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACHtBgEAiA0AIe4GAQCIDQAh7wYBAIgNACHwBgEAiA0AIfEGAQCIDQAh8gYBAIgNACHzBgEAiA0AIfQGAgCHDQAh9QYBAIgNACEHZQAA7xgAIGYAAPUYACCZCAAA8BgAIJoIAAD0GAAgnQgAABsAIJ4IAAAbACCfCAAAHQAgB2UAAO0YACBmAADyGAAgmQgAAO4YACCaCAAA8RgAIJ0IAAAvACCeCAAALwAgnwgAAJIBACARBwAAgQ8AIBgAAIIPACDBBgEAAAABygYBAAAAAcsGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB7gYBAAAAAe8GAQAAAAHwBgEAAAAB8QYBAAAAAfIGAQAAAAHzBgEAAAAB9AYCAAAAAfUGAQAAAAEDZQAA7xgAIJkIAADwGAAgnwgAAB0AIANlAADtGAAgmQgAAO4YACCfCAAAkgEAIAgYAACkDwAgPwAApQ8AIMEGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAH1BgEAAAABigcBAAAAAQIAAAC4AQAgZQAAow8AIAMAAAC4AQAgZQAAow8AIGYAAI0PACABXgAA7BgAMA4DAAD3CgAgGAAAiQwAID8AAIoMACCxBgAAjwwAMLIGAAC2AQAQswYAAI8MADDBBgEAAAABwgYBAMILACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIYoHAQD2CgAhiwgAAI4MACACAAAAuAEAIF4AAI0PACACAAAAiw8AIF4AAIwPACAKsQYAAIoPADCyBgAAiw8AELMGAACKDwAwwQYBAMILACHCBgEAwgsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAhigcBAPYKACEKsQYAAIoPADCyBgAAiw8AELMGAACKDwAwwQYBAMILACHCBgEAwgsAIdoGIAD0CgAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAhigcBAPYKACEGwQYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIYoHAQDuDAAhCBgAAI4PACA_AACPDwAgwQYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIYoHAQDuDAAhB2UAANcYACBmAADqGAAgmQgAANgYACCaCAAA6RgAIJ0IAAAvACCeCAAALwAgnwgAAJIBACALZQAAkA8AMGYAAJUPADCZCAAAkQ8AMJoIAACSDwAwmwgAAJMPACCcCAAAlA8AMJ0IAACUDwAwnggAAJQPADCfCAAAlA8AMKAIAACWDwAwoQgAAJcPADALBwAAoA8AIBgAAKIPACBAAAChDwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAfUGAQAAAAGGBwEAAAABiAcBAAAAAYkHEAAAAAECAAAAvQEAIGUAAJ8PACADAAAAvQEAIGUAAJ8PACBmAACbDwAgAV4AAOgYADAQBwAA8QsAIBgAAIkMACA-AACMDAAgQAAAjQwAILEGAACLDAAwsgYAALsBABCzBgAAiwwAMMEGAQAAAAHoBkAA_goAIekGQAD-CgAh7QYBAAAAAfUGAQCkCwAhhgcBAP0KACGHBwEApAsAIYgHAQCkCwAhiQcQAK8LACECAAAAvQEAIF4AAJsPACACAAAAmA8AIF4AAJkPACAMsQYAAJcPADCyBgAAmA8AELMGAACXDwAwwQYBAMILACHoBkAA_goAIekGQAD-CgAh7QYBAMILACH1BgEApAsAIYYHAQD9CgAhhwcBAKQLACGIBwEApAsAIYkHEACvCwAhDLEGAACXDwAwsgYAAJgPABCzBgAAlw8AMMEGAQDCCwAh6AZAAP4KACHpBkAA_goAIe0GAQDCCwAh9QYBAKQLACGGBwEA_QoAIYcHAQCkCwAhiAcBAKQLACGJBxAArwsAIQjBBgEA7gwAIegGQAD9DAAh6QZAAP0MACHtBgEA7gwAIfUGAQCIDQAhhgcBAIgNACGIBwEAiA0AIYkHEACaDwAhBZwIEAAAAAGiCBAAAAABowgQAAAAAaQIEAAAAAGlCBAAAAABCwcAAJwPACAYAACeDwAgQAAAnQ8AIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIe0GAQDuDAAh9QYBAIgNACGGBwEAiA0AIYgHAQCIDQAhiQcQAJoPACEFZQAA3RgAIGYAAOYYACCZCAAA3hgAIJoIAADlGAAgnwgAAB0AIAdlAADbGAAgZgAA4xgAIJkIAADcGAAgmggAAOIYACCdCAAAwAEAIJ4IAADAAQAgnwgAAMgBACAHZQAA2RgAIGYAAOAYACCZCAAA2hgAIJoIAADfGAAgnQgAAC8AIJ4IAAAvACCfCAAAkgEAIAsHAACgDwAgGAAAog8AIEAAAKEPACDBBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB9QYBAAAAAYYHAQAAAAGIBwEAAAABiQcQAAAAAQNlAADdGAAgmQgAAN4YACCfCAAAHQAgA2UAANsYACCZCAAA3BgAIJ8IAADIAQAgA2UAANkYACCZCAAA2hgAIJ8IAACSAQAgCBgAAKQPACA_AAClDwAgwQYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAfUGAQAAAAGKBwEAAAABA2UAANcYACCZCAAA2BgAIJ8IAACSAQAgBGUAAJAPADCZCAAAkQ8AMJsIAACTDwAgnwgAAJQPADAEEgAAsw8AIOgGQAAAAAHpBkAAAAAB9gYBAAAAAQIAAAD6AQAgZQAAsg8AIAMAAAD6AQAgZQAAsg8AIGYAALAPACABXgAA1hgAMAkDAAD3CgAgEgAAsAsAILEGAACEDAAwsgYAAIkBABCzBgAAhAwAMMIGAQDCCwAh6AZAAP4KACHpBkAA_goAIfYGAQAAAAECAAAA-gEAIF4AALAPACACAAAArg8AIF4AAK8PACAHsQYAAK0PADCyBgAArg8AELMGAACtDwAwwgYBAMILACHoBkAA_goAIekGQAD-CgAh9gYBAMILACEHsQYAAK0PADCyBgAArg8AELMGAACtDwAwwgYBAMILACHoBkAA_goAIekGQAD-CgAh9gYBAMILACED6AZAAP0MACHpBkAA_QwAIfYGAQDuDAAhBBIAALEPACDoBkAA_QwAIekGQAD9DAAh9gYBAO4MACEFZQAA0RgAIGYAANQYACCZCAAA0hgAIJoIAADTGAAgnwgAAJIBACAEEgAAsw8AIOgGQAAAAAHpBkAAAAAB9gYBAAAAAQNlAADRGAAgmQgAANIYACCfCAAAkgEAIAISAADBDwAg9gYBAAAAAQIAAABBACBlAADADwAgAwAAAEEAIGUAAMAPACBmAAC-DwAgAV4AANAYADAIAwAA9woAIBIAALALACCxBgAAzQwAMLIGAAA_ABCzBgAAzQwAMMIGAQDCCwAh9gYBAMILACGSCAAAzAwAIAIAAABBACBeAAC-DwAgAgAAALwPACBeAAC9DwAgBbEGAAC7DwAwsgYAALwPABCzBgAAuw8AMMIGAQDCCwAh9gYBAMILACEFsQYAALsPADCyBgAAvA8AELMGAAC7DwAwwgYBAMILACH2BgEAwgsAIQH2BgEA7gwAIQISAAC_DwAg9gYBAO4MACEFZQAAyxgAIGYAAM4YACCZCAAAzBgAIJoIAADNGAAgnwgAAJIBACACEgAAwQ8AIPYGAQAAAAEDZQAAyxgAIJkIAADMGAAgnwgAAJIBACAQGAAAtRAAICAAALYQACAhAAC3EAAgIgAAuBAAICkAALkQACDBBgEAAAAB6AZAAAAAAekGQAAAAAH1BgEAAAABhAcBAAAAAbcHAQAAAAG4B0AAAAABuQcBAAAAAeIHAQAAAAHjBwEAAAAB5AcgAAAAAQIAAACWAQAgZQAAtBAAIAMAAACWAQAgZQAAtBAAIGYAAMwPACABXgAAyhgAMBUDAACSDAAgGAAAiQwAICAAAJcMACAhAACYDAAgIgAAiQsAICkAAJkMACCxBgAAlgwAMLIGAABkABCzBgAAlgwAMMEGAQAAAAHCBgEApAsAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIYQHAQD2CgAhtwcBAAAAAbgHQACuCwAhuQcBAP0KACHiBwEAAAAB4wcBAP0KACHkByAA9AoAIQIAAACWAQAgXgAAzA8AIAIAAADKDwAgXgAAyw8AIA-xBgAAyQ8AMLIGAADKDwAQswYAAMkPADDBBgEAwgsAIcIGAQCkCwAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAhhAcBAPYKACG3BwEA_QoAIbgHQACuCwAhuQcBAP0KACHiBwEA9goAIeMHAQD9CgAh5AcgAPQKACEPsQYAAMkPADCyBgAAyg8AELMGAADJDwAwwQYBAMILACHCBgEApAsAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIYQHAQD2CgAhtwcBAP0KACG4B0AArgsAIbkHAQD9CgAh4gcBAPYKACHjBwEA_QoAIeQHIAD0CgAhC8EGAQDuDAAh6AZAAP0MACHpBkAA_QwAIfUGAQCIDQAhhAcBAO4MACG3BwEAiA0AIbgHQACVDQAhuQcBAIgNACHiBwEA7gwAIeMHAQCIDQAh5AcgALkNACEQGAAAzQ8AICAAAM4PACAhAADPDwAgIgAA0A8AICkAANEPACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIYQHAQDuDAAhtwcBAIgNACG4B0AAlQ0AIbkHAQCIDQAh4gcBAO4MACHjBwEAiA0AIeQHIAC5DQAhB2UAAJsYACBmAADIGAAgmQgAAJwYACCaCAAAxxgAIJ0IAAAvACCeCAAALwAgnwgAAJIBACALZQAA-A8AMGYAAP0PADCZCAAA-Q8AMJoIAAD6DwAwmwgAAPsPACCcCAAA_A8AMJ0IAAD8DwAwnggAAPwPADCfCAAA_A8AMKAIAAD-DwAwoQgAAP8PADALZQAA6A8AMGYAAO0PADCZCAAA6Q8AMJoIAADqDwAwmwgAAOsPACCcCAAA7A8AMJ0IAADsDwAwnggAAOwPADCfCAAA7A8AMKAIAADuDwAwoQgAAO8PADALZQAA3Q8AMGYAAOEPADCZCAAA3g8AMJoIAADfDwAwmwgAAOAPACCcCAAAyQ4AMJ0IAADJDgAwnggAAMkOADCfCAAAyQ4AMKAIAADiDwAwoQgAAMwOADALZQAA0g8AMGYAANYPADCZCAAA0w8AMJoIAADUDwAwmwgAANUPACCcCAAAsQ0AMJ0IAACxDQAwnggAALENADCfCAAAsQ0AMKAIAADXDwAwoQgAALQNADANBQAA3A8AIBgAAOcNACAoAADoDQAgtAYBAAAAAcEGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAH1BgEAAAABigcBAAAAAZ8HAAAAygcCxgcQAAAAAc4HAQAAAAECAAAAaQAgZQAA2w8AIAMAAABpACBlAADbDwAgZgAA2Q8AIAFeAADGGAAwAgAAAGkAIF4AANkPACACAAAAtQ0AIF4AANgPACAKtAYBAIgNACHBBgEA7gwAIdoGIAC5DQAh6AZAAP0MACHpBkAA_QwAIfUGAQCIDQAhigcBAO4MACGfBwAAtw3KByLGBxAAuA0AIc4HAQDuDAAhDQUAANoPACAYAAC8DQAgKAAAvQ0AILQGAQCIDQAhwQYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIYoHAQDuDAAhnwcAALcNygcixgcQALgNACHOBwEA7gwAIQdlAADBGAAgZgAAxBgAIJkIAADCGAAgmggAAMMYACCdCAAAAwAgnggAAAMAIJ8IAAAFACANBQAA3A8AIBgAAOcNACAoAADoDQAgtAYBAAAAAcEGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAH1BgEAAAABigcBAAAAAZ8HAAAAygcCxgcQAAAAAc4HAQAAAAEDZQAAwRgAIJkIAADCGAAgnwgAAAUAIAwDAADnDwAgEgAA1Q4AIMEGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAH2BgEAAAAB-AYBAAAAAfkGAgAAAAH6BgEAAAAB-waAAAAAAf0GAAAA_QYCAgAAAGEAIGUAAOYPACADAAAAYQAgZQAA5g8AIGYAAOQPACABXgAAwBgAMAIAAABhACBeAADkDwAgAgAAAM0OACBeAADjDwAgCsEGAQDuDAAhwgYBAIgNACHoBkAA_QwAIekGQAD9DAAh9gYBAIgNACH4BgEAiA0AIfkGAgDPDgAh-gYBAIgNACH7BoAAAAAB_QYAANAO_QYiDAMAAOUPACASAADSDgAgwQYBAO4MACHCBgEAiA0AIegGQAD9DAAh6QZAAP0MACH2BgEAiA0AIfgGAQCIDQAh-QYCAM8OACH6BgEAiA0AIfsGgAAAAAH9BgAA0A79BiIHZQAAuxgAIGYAAL4YACCZCAAAvBgAIJoIAAC9GAAgnQgAAEcAIJ4IAABHACCfCAAA5gkAIAwDAADnDwAgEgAA1Q4AIMEGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAH2BgEAAAAB-AYBAAAAAfkGAgAAAAH6BgEAAAAB-waAAAAAAf0GAAAA_QYCA2UAALsYACCZCAAAvBgAIJ8IAADmCQAgBRIAAPYPACAqAAD3DwAg9gYBAAAAAd0HAQAAAAHeB0AAAAABAgAAAEUAIGUAAPUPACADAAAARQAgZQAA9Q8AIGYAAPIPACABXgAAuhgAMAsSAACwCwAgGQAAyAwAICoAAIkMACCxBgAAywwAMLIGAABDABCzBgAAywwAMPYGAQDCCwAh9wYBAMILACHdBwEApAsAId4HQAD-CgAhkQgAAMoMACACAAAARQAgXgAA8g8AIAIAAADwDwAgXgAA8Q8AIAexBgAA7w8AMLIGAADwDwAQswYAAO8PADD2BgEAwgsAIfcGAQDCCwAh3QcBAKQLACHeB0AA_goAIQexBgAA7w8AMLIGAADwDwAQswYAAO8PADD2BgEAwgsAIfcGAQDCCwAh3QcBAKQLACHeB0AA_goAIQP2BgEA7gwAId0HAQCIDQAh3gdAAP0MACEFEgAA8w8AICoAAPQPACD2BgEA7gwAId0HAQCIDQAh3gdAAP0MACEFZQAAshgAIGYAALgYACCZCAAAsxgAIJoIAAC3GAAgnwgAAJIBACAHZQAAsBgAIGYAALUYACCZCAAAsRgAIJoIAAC0GAAgnQgAAC8AIJ4IAAAvACCfCAAAkgEAIAUSAAD2DwAgKgAA9w8AIPYGAQAAAAHdBwEAAAAB3gdAAAAAAQNlAACyGAAgmQgAALMYACCfCAAAkgEAIANlAACwGAAgmQgAALEYACCfCAAAkgEAIAYfAACzEAAgwQYBAAAAAfQGAgAAAAGEBwEAAAABtwcBAAAAAeEHAgAAAAECAAAATAAgZQAAshAAIAMAAABMACBlAACyEAAgZgAAghAAIAFeAACvGAAwCxkAAMgMACAfAADJDAAgsQYAAMcMADCyBgAASgAQswYAAMcMADDBBgEAAAAB9AYCAPUKACH3BgEAwgsAIYQHAQD2CgAhtwcBAP0KACHhBwIA9QoAIQIAAABMACBeAACCEAAgAgAAAIAQACBeAACBEAAgCbEGAAD_DwAwsgYAAIAQABCzBgAA_w8AMMEGAQDCCwAh9AYCAPUKACH3BgEAwgsAIYQHAQD2CgAhtwcBAP0KACHhBwIA9QoAIQmxBgAA_w8AMLIGAACAEAAQswYAAP8PADDBBgEAwgsAIfQGAgD1CgAh9wYBAMILACGEBwEA9goAIbcHAQD9CgAh4QcCAPUKACEFwQYBAO4MACH0BgIAhw0AIYQHAQDuDAAhtwcBAIgNACHhBwIAhw0AIQYfAACDEAAgwQYBAO4MACH0BgIAhw0AIYQHAQDuDAAhtwcBAIgNACHhBwIAhw0AIQtlAACEEAAwZgAAiRAAMJkIAACFEAAwmggAAIYQADCbCAAAhxAAIJwIAACIEAAwnQgAAIgQADCeCAAAiBAAMJ8IAACIEAAwoAgAAIoQADChCAAAixAAMAgdAACwEAAgHgAAsRAAIMEGAQAAAAH0BgIAAAABhAcBAAAAAYUHAQAAAAG3BwEAAAAB4AcCAAAAAQIAAABQACBlAACvEAAgAwAAAFAAIGUAAK8QACBmAACOEAAgAV4AAK4YADANGgAAxgwAIB0AAKIMACAeAACjDAAgsQYAAMUMADCyBgAATgAQswYAAMUMADDBBgEAAAAB9AYCAPUKACGEBwEA9goAIYUHAQD2CgAhtwcBAP0KACHfBwEAwgsAIeAHAgC-DAAhAgAAAFAAIF4AAI4QACACAAAAjBAAIF4AAI0QACAKsQYAAIsQADCyBgAAjBAAELMGAACLEAAwwQYBAMILACH0BgIA9QoAIYQHAQD2CgAhhQcBAPYKACG3BwEA_QoAId8HAQDCCwAh4AcCAL4MACEKsQYAAIsQADCyBgAAjBAAELMGAACLEAAwwQYBAMILACH0BgIA9QoAIYQHAQD2CgAhhQcBAPYKACG3BwEA_QoAId8HAQDCCwAh4AcCAL4MACEGwQYBAO4MACH0BgIAhw0AIYQHAQDuDAAhhQcBAO4MACG3BwEAiA0AIeAHAgDPDgAhCB0AAI8QACAeAACQEAAgwQYBAO4MACH0BgIAhw0AIYQHAQDuDAAhhQcBAO4MACG3BwEAiA0AIeAHAgDPDgAhC2UAAJ8QADBmAACkEAAwmQgAAKAQADCaCAAAoRAAMJsIAACiEAAgnAgAAKMQADCdCAAAoxAAMJ4IAACjEAAwnwgAAKMQADCgCAAApRAAMKEIAACmEAAwC2UAAJEQADBmAACWEAAwmQgAAJIQADCaCAAAkxAAMJsIAACUEAAgnAgAAJUQADCdCAAAlRAAMJ4IAACVEAAwnwgAAJUQADCgCAAAlxAAMKEIAACYEAAwBhIAAJ4QACDpBkAAAAAB9gYBAAAAAdgHAgAAAAHZBwIAAAAB2gcgAAAAAQIAAABZACBlAACdEAAgAwAAAFkAIGUAAJ0QACBmAACbEAAgAV4AAK0YADAMEgAAsAsAIBsAAMIMACCxBgAAwQwAMLIGAABXABCzBgAAwQwAMOkGQAD-CgAh9gYBAMILACHXBwEAwgsAIdgHAgD1CgAh2QcCAPUKACHaByAA9AoAIZAIAADADAAgAgAAAFkAIF4AAJsQACACAAAAmRAAIF4AAJoQACAJsQYAAJgQADCyBgAAmRAAELMGAACYEAAw6QZAAP4KACH2BgEAwgsAIdcHAQDCCwAh2AcCAPUKACHZBwIA9QoAIdoHIAD0CgAhCbEGAACYEAAwsgYAAJkQABCzBgAAmBAAMOkGQAD-CgAh9gYBAMILACHXBwEAwgsAIdgHAgD1CgAh2QcCAPUKACHaByAA9AoAIQXpBkAA_QwAIfYGAQDuDAAh2AcCAIcNACHZBwIAhw0AIdoHIAC5DQAhBhIAAJwQACDpBkAA_QwAIfYGAQDuDAAh2AcCAIcNACHZBwIAhw0AIdoHIAC5DQAhBWUAAKgYACBmAACrGAAgmQgAAKkYACCaCAAAqhgAIJ8IAACSAQAgBhIAAJ4QACDpBkAAAAAB9gYBAAAAAdgHAgAAAAHZBwIAAAAB2gcgAAAAAQNlAACoGAAgmQgAAKkYACCfCAAAkgEAIAUSAACtEAAgHAAArhAAIPYGAQAAAAHbBwEAAAAB3AdAAAAAAQIAAABUACBlAACsEAAgAwAAAFQAIGUAAKwQACBmAACpEAAgAV4AAKcYADALEgAAsAsAIBsAAMIMACAcAACJDAAgsQYAAMQMADCyBgAAUgAQswYAAMQMADD2BgEAwgsAIdcHAQDCCwAh2wcBAKQLACHcB0AA_goAIZAIAADDDAAgAgAAAFQAIF4AAKkQACACAAAApxAAIF4AAKgQACAHsQYAAKYQADCyBgAApxAAELMGAACmEAAw9gYBAMILACHXBwEAwgsAIdsHAQCkCwAh3AdAAP4KACEHsQYAAKYQADCyBgAApxAAELMGAACmEAAw9gYBAMILACHXBwEAwgsAIdsHAQCkCwAh3AdAAP4KACED9gYBAO4MACHbBwEAiA0AIdwHQAD9DAAhBRIAAKoQACAcAACrEAAg9gYBAO4MACHbBwEAiA0AIdwHQAD9DAAhBWUAAJ8YACBmAAClGAAgmQgAAKAYACCaCAAApBgAIJ8IAACSAQAgB2UAAJ0YACBmAACiGAAgmQgAAJ4YACCaCAAAoRgAIJ0IAAAvACCeCAAALwAgnwgAAJIBACAFEgAArRAAIBwAAK4QACD2BgEAAAAB2wcBAAAAAdwHQAAAAAEDZQAAnxgAIJkIAACgGAAgnwgAAJIBACADZQAAnRgAIJkIAACeGAAgnwgAAJIBACAIHQAAsBAAIB4AALEQACDBBgEAAAAB9AYCAAAAAYQHAQAAAAGFBwEAAAABtwcBAAAAAeAHAgAAAAEEZQAAnxAAMJkIAACgEAAwmwgAAKIQACCfCAAAoxAAMARlAACREAAwmQgAAJIQADCbCAAAlBAAIJ8IAACVEAAwBh8AALMQACDBBgEAAAAB9AYCAAAAAYQHAQAAAAG3BwEAAAAB4QcCAAAAAQRlAACEEAAwmQgAAIUQADCbCAAAhxAAIJ8IAACIEAAwEBgAALUQACAgAAC2EAAgIQAAtxAAICIAALgQACApAAC5EAAgwQYBAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAYQHAQAAAAG3BwEAAAABuAdAAAAAAbkHAQAAAAHiBwEAAAAB4wcBAAAAAeQHIAAAAAEDZQAAmxgAIJkIAACcGAAgnwgAAJIBACAEZQAA-A8AMJkIAAD5DwAwmwgAAPsPACCfCAAA_A8AMARlAADoDwAwmQgAAOkPADCbCAAA6w8AIJ8IAADsDwAwBGUAAN0PADCZCAAA3g8AMJsIAADgDwAgnwgAAMkOADAEZQAA0g8AMJkIAADTDwAwmwgAANUPACCfCAAAsQ0AMA8pAAD4DQAgLQEAAAABTwAA-Q0AIFAAAPcNACBYAAD2DQAgwQYBAAAAAcMGAQAAAAHEBgEAAAABxQZAAAAAAcYGQAAAAAHHBkAAAAAByAZAAAAAAckGAQAAAAHKBgEAAAABywYBAAAAAQIAAAAFACBlAADFEAAgAwAAAAUAIGUAAMUQACBmAADEEAAgAV4AAJoYADAUAwAA9woAICkAAJkMACAtAQD9CgAhTwAAigsAIFAAAOgMACBYAADqDAAgsQYAAOkMADCyBgAAAwAQswYAAOkMADDBBgEAAAABwgYBAMILACHDBgEA9goAIcQGAQAAAAHFBkAArgsAIcYGQACuCwAhxwZAAK4LACHIBkAArgsAIckGAQCkCwAhygYBAP0KACHLBgEA_QoAIQIAAAAFACBeAADEEAAgAgAAAMIQACBeAADDEAAgDy0BAP0KACGxBgAAwRAAMLIGAADCEAAQswYAAMEQADDBBgEAwgsAIcIGAQDCCwAhwwYBAPYKACHEBgEA9goAIcUGQACuCwAhxgZAAK4LACHHBkAArgsAIcgGQACuCwAhyQYBAKQLACHKBgEA_QoAIcsGAQD9CgAhDy0BAP0KACGxBgAAwRAAMLIGAADCEAAQswYAAMEQADDBBgEAwgsAIcIGAQDCCwAhwwYBAPYKACHEBgEA9goAIcUGQACuCwAhxgZAAK4LACHHBkAArgsAIcgGQACuCwAhyQYBAKQLACHKBgEA_QoAIcsGAQD9CgAhCy0BAIgNACHBBgEA7gwAIcMGAQDuDAAhxAYBAO4MACHFBkAAlQ0AIcYGQACVDQAhxwZAAJUNACHIBkAAlQ0AIckGAQCIDQAhygYBAIgNACHLBgEAiA0AIQ8pAACZDQAgLQEAiA0AIU8AAJoNACBQAACYDQAgWAAAlw0AIMEGAQDuDAAhwwYBAO4MACHEBgEA7gwAIcUGQACVDQAhxgZAAJUNACHHBkAAlQ0AIcgGQACVDQAhyQYBAIgNACHKBgEAiA0AIcsGAQCIDQAhDykAAPgNACAtAQAAAAFPAAD5DQAgUAAA9w0AIFgAAPYNACDBBgEAAAABwwYBAAAAAcQGAQAAAAHFBkAAAAABxgZAAAAAAccGQAAAAAHIBkAAAAAByQYBAAAAAcoGAQAAAAHLBgEAAAABBk4AAJUOACBPAACWDgAgwQYBAAAAAcwGAQAAAAHNBgEAAAABzgYBAAAAAQIAAAALACBlAADREAAgAwAAAAsAIGUAANEQACBmAADQEAAgAV4AAJkYADAMAwAA9woAIE4AAOgMACBPAACKCwAgsQYAAOcMADCyBgAACQAQswYAAOcMADDBBgEAAAABwgYBAMILACHMBgEA9goAIc0GAQD2CgAhzgYBAPYKACGWCAAA5gwAIAIAAAALACBeAADQEAAgAgAAAM4QACBeAADPEAAgCLEGAADNEAAwsgYAAM4QABCzBgAAzRAAMMEGAQDCCwAhwgYBAMILACHMBgEA9goAIc0GAQD2CgAhzgYBAPYKACEIsQYAAM0QADCyBgAAzhAAELMGAADNEAAwwQYBAMILACHCBgEAwgsAIcwGAQD2CgAhzQYBAPYKACHOBgEA9goAIQTBBgEA7gwAIcwGAQDuDAAhzQYBAO4MACHOBgEA7gwAIQZOAAD-DQAgTwAA_w0AIMEGAQDuDAAhzAYBAO4MACHNBgEA7gwAIc4GAQDuDAAhBk4AAJUOACBPAACWDgAgwQYBAAAAAcwGAQAAAAHNBgEAAAABzgYBAAAAAQzBBgEAAAABzwYgAAAAAdAGAgAAAAHRBgIAAAAB0gYBAAAAAdMGAQAAAAHUBgIAAAAB1QYBAAAAAdYGAQAAAAHXBgIAAAAB2AYBAAAAAdkGAQAAAAECAAAA_gkAIGUAANIQACADAAAABwAgZQAA0hAAIGYAANYQACAOAAAABwAgXgAA1hAAIMEGAQDuDAAhzwYgALkNACHQBgIAhw0AIdEGAgCHDQAh0gYBAO4MACHTBgEA7gwAIdQGAgCHDQAh1QYBAO4MACHWBgEA7gwAIdcGAgCHDQAh2AYBAO4MACHZBgEA7gwAIQzBBgEA7gwAIc8GIAC5DQAh0AYCAIcNACHRBgIAhw0AIdIGAQDuDAAh0wYBAO4MACHUBgIAhw0AIdUGAQDuDAAh1gYBAO4MACHXBgIAhw0AIdgGAQDuDAAh2QYBAO4MACEDZQAA0hAAIJkIAADTEAAgnwgAAP4JACAEZQAAxhAAMJkIAADHEAAwmwgAAMkQACCfCAAAyhAAMARlAAC6EAAwmQgAALsQADCbCAAAvRAAIJ8IAAC-EAAwBGUAAMIPADCZCAAAww8AMJsIAADFDwAgnwgAAMYPADAEZQAAtA8AMJkIAAC1DwAwmwgAALcPACCfCAAAuA8AMARlAACmDwAwmQgAAKcPADCbCAAAqQ8AIJ8IAACqDwAwBGUAAIMPADCZCAAAhA8AMJsIAACGDwAgnwgAAIcPADAEZQAA8w4AMJkIAAD0DgAwmwgAAPYOACCfCAAA9w4AMARlAADlDgAwmQgAAOYOADCbCAAA6A4AIJ8IAADpDgAwBGUAANcOADCZCAAA2A4AMJsIAADaDgAgnwgAANsOADAEZQAAxQ4AMJkIAADGDgAwmwgAAMgOACCfCAAAyQ4AMARlAAC8DgAwmQgAAL0OADCbCAAAvw4AIJ8IAACfDQAwBGUAALEOADCZCAAAsg4AMJsIAAC0DgAgnwgAAPYMADABAwAAng4AIAAAAAAAAAAAAAAAAAAAAAAAB2UAAJQYACBmAACXGAAgmQgAAJUYACCaCAAAlhgAIJ0IAABHACCeCAAARwAgnwgAAOYJACADZQAAlBgAIJkIAACVGAAgnwgAAOYJACAAAAAAAAAAAAdlAACPGAAgZgAAkhgAIJkIAACQGAAgmggAAJEYACCdCAAARwAgnggAAEcAIJ8IAADmCQAgA2UAAI8YACCZCAAAkBgAIJ8IAADmCQAgAAAAB2UAAIoYACBmAACNGAAgmQgAAIsYACCaCAAAjBgAIJ0IAABHACCeCAAARwAgnwgAAOYJACADZQAAihgAIJkIAACLGAAgnwgAAOYJACAAAAAAAAdlAACFGAAgZgAAiBgAIJkIAACGGAAgmggAAIcYACCdCAAAtgEAIJ4IAAC2AQAgnwgAALgBACADZQAAhRgAIJkIAACGGAAgnwgAALgBACAAAAAHZQAA_xcAIGYAAIMYACCZCAAAgBgAIJoIAACCGAAgnQgAAC8AIJ4IAAAvACCfCAAAkgEAIAtlAACTEQAwZgAAlxEAMJkIAACUEQAwmggAAJURADCbCAAAlhEAIJwIAACUDwAwnQgAAJQPADCeCAAAlA8AMJ8IAACUDwAwoAgAAJgRADChCAAAlw8AMAsHAACgDwAgGAAAog8AID4AAI0RACDBBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB9QYBAAAAAYYHAQAAAAGHBwEAAAABiQcQAAAAAQIAAAC9AQAgZQAAmxEAIAMAAAC9AQAgZQAAmxEAIGYAAJoRACABXgAAgRgAMAIAAAC9AQAgXgAAmhEAIAIAAACYDwAgXgAAmREAIAjBBgEA7gwAIegGQAD9DAAh6QZAAP0MACHtBgEA7gwAIfUGAQCIDQAhhgcBAIgNACGHBwEAiA0AIYkHEACaDwAhCwcAAJwPACAYAACeDwAgPgAAjBEAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIe0GAQDuDAAh9QYBAIgNACGGBwEAiA0AIYcHAQCIDQAhiQcQAJoPACELBwAAoA8AIBgAAKIPACA-AACNEQAgwQYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAfUGAQAAAAGGBwEAAAABhwcBAAAAAYkHEAAAAAEDZQAA_xcAIJkIAACAGAAgnwgAAJIBACAEZQAAkxEAMJkIAACUEQAwmwgAAJYRACCfCAAAlA8AMAAAAAVlAAD6FwAgZgAA_RcAIJkIAAD7FwAgmggAAPwXACCfCAAA5gkAIANlAAD6FwAgmQgAAPsXACCfCAAA5gkAIAAAAAAABZwIBAAAAAGiCAQAAAABowgEAAAAAaQIBAAAAAGlCAQAAAABAAAAAZwIAAAAkwcCBWUAAPUXACBmAAD4FwAgmQgAAPYXACCaCAAA9xcAIJ8IAACSAQAgA2UAAPUXACCZCAAA9hcAIJ8IAACSAQAgAAAABWUAAPAXACBmAADzFwAgmQgAAPEXACCaCAAA8hcAIJ8IAACSAQAgA2UAAPAXACCZCAAA8RcAIJ8IAACSAQAgAAAAAAAFZQAA6xcAIGYAAO4XACCZCAAA7BcAIJoIAADtFwAgnwgAAJIBACADZQAA6xcAIJkIAADsFwAgnwgAAJIBACAvEwAAshYAIBQAALMWACAVAAC0FgAgFgAAtRYAIBcAAOgQACAdAAC2FgAgHgAAtxYAICEAALAWACAiAADuEAAgKwAAuBYAICwAALkWACAuAAC6FgAgLwAAuxYAIDAAALsRACAxAAC8FgAgMgAAvRYAIDMAAOcQACA0AACwFgAgNQAAthYAIDYAALEWACA3AAC7FgAgOAAAuxYAIDkAAL4WACA6AAC_FgAgOwAA7RAAIDwAAOwQACA9AADrEAAgQQAA6hAAIEIAAMAWACBDAACsFgAgigcAAJENACClBwAAkQ0AIKYHAACRDQAgpwcAAJENACCoBwAAkQ0AIKoHAACRDQAgqwcAAJENACCsBwAAkQ0AILAHAACRDQAgsQcAAJENACCyBwAAkQ0AILMHAACRDQAgtAcAAJENACC1BwAAkQ0AILYHAACRDQAgtwcAAJENACC4BwAAkQ0AIAAAAAGcCAAAAJ8HAgVlAADmFwAgZgAA6RcAIJkIAADnFwAgmggAAOgXACCfCAAAkgEAIANlAADmFwAgmQgAAOcXACCfCAAAkgEAIAAAAAGcCAAAAKoHAwGcCAAAAK4HAgGcCAAAALAHAgtlAADbEwAwZgAAoBQAMJkIAADcEwAwmggAAJ8UADCbCAAA3RMAIJwIAADeEwAwnQgAAN4TADCeCAAA3hMAMJ8IAADeEwAwoAgAAKEUADChCAAAohQAMAdlAADZEwAgZgAAnRQAIJkIAADaEwAgmggAAJwUACCdCAAANQAgnggAADUAIJ8IAADRBwAgC2UAANQTADBmAACWFAAwmQgAANUTADCaCAAAlRQAMJsIAADWEwAgnAgAANcTADCdCAAA1xMAMJ4IAADXEwAwnwgAANcTADCgCAAAlxQAMKEIAACYFAAwC2UAAM8TADBmAACPFAAwmQgAANATADCaCAAAjhQAMJsIAADREwAgnAgAANITADCdCAAA0hMAMJ4IAADSEwAwnwgAANITADCgCAAAkBQAMKEIAACRFAAwC2UAAMoTADBmAACJFAAwmQgAAMsTADCaCAAAiBQAMJsIAADMEwAgnAgAALgPADCdCAAAuA8AMJ4IAAC4DwAwnwgAALgPADCgCAAAihQAMKEIAAC7DwAwC2UAAMYTADBmAACEFAAwmQgAAMcTADCaCAAAgxQAMJsIAADIEwAgnAgAAOwPADCdCAAA7A8AMJ4IAADsDwAwnwgAAOwPADCgCAAAhRQAMKEIAADvDwAwC2UAAMITADBmAAD_EwAwmQgAAMMTADCaCAAA_hMAMJsIAADEEwAgnAgAAKMQADCdCAAAoxAAMJ4IAACjEAAwnwgAAKMQADCgCAAAgBQAMKEIAACmEAAwC2UAAL0TADBmAAD5EwAwmQgAAL4TADCaCAAA-BMAMJsIAAC_EwAgnAgAAJUQADCdCAAAlRAAMJ4IAACVEAAwnwgAAJUQADCgCAAA-hMAMKEIAACYEAAwC2UAALgTADBmAADyEwAwmQgAALkTADCaCAAA8RMAMJsIAAC6EwAgnAgAALsTADCdCAAAuxMAMJ4IAAC7EwAwnwgAALsTADCgCAAA8xMAMKEIAAD0EwAwB2UAALUTACBmAADuEwAgmQgAALYTACCaCAAA7RMAIJ0IAACJAQAgnggAAIkBACCfCAAA-gEAIAdlAACzEwAgZgAA6xMAIJkIAAC0EwAgmggAAOoTACCdCAAAiwEAIJ4IAACLAQAgnwgAAPIBACALZQAArxMAMGYAAOYTADCZCAAAsBMAMJoIAADlEwAwmwgAALETACCcCAAAwg0AMJ0IAADCDQAwnggAAMINADCfCAAAwg0AMKAIAADnEwAwoQgAAMUNADALZQAAqxMAMGYAAOETADCZCAAArBMAMJoIAADgEwAwmwgAAK0TACCcCAAAyQ4AMJ0IAADJDgAwnggAAMkOADCfCAAAyQ4AMKAIAADiEwAwoQgAAMwOADAHZQAAmhcAIGYAAOQXACCZCAAAmxcAIJoIAADjFwAgnQgAAC8AIJ4IAAAvACCfCAAAkgEAIAtlAACCEwAwZgAAhxMAMJkIAACDEwAwmggAAIQTADCbCAAAhRMAIJwIAACGEwAwnQgAAIYTADCeCAAAhhMAMJ8IAACGEwAwoAgAAIgTADChCAAAiRMAMAtlAAD0EgAwZgAA-RIAMJkIAAD1EgAwmggAAPYSADCbCAAA9xIAIJwIAAD4EgAwnQgAAPgSADCeCAAA-BIAMJ8IAAD4EgAwoAgAAPoSADChCAAA-xIAMAtlAADpEgAwZgAA7RIAMJkIAADqEgAwmggAAOsSADCbCAAA7BIAIJwIAADGDwAwnQgAAMYPADCeCAAAxg8AMJ8IAADGDwAwoAgAAO4SADChCAAAyQ8AMAtlAADeEgAwZgAA4hIAMJkIAADfEgAwmggAAOASADCbCAAA4RIAIJwIAADsDwAwnQgAAOwPADCeCAAA7A8AMJ8IAADsDwAwoAgAAOMSADChCAAA7w8AMAtlAADTEgAwZgAA1xIAMJkIAADUEgAwmggAANUSADCbCAAA1hIAIJwIAACjEAAwnQgAAKMQADCeCAAAoxAAMJ8IAACjEAAwoAgAANgSADChCAAAphAAMAtlAADKEgAwZgAAzhIAMJkIAADLEgAwmggAAMwSADCbCAAAzRIAIJwIAACxDQAwnQgAALENADCeCAAAsQ0AMJ8IAACxDQAwoAgAAM8SADChCAAAtA0AMAtlAADBEgAwZgAAxRIAMJkIAADCEgAwmggAAMMSADCbCAAAxBIAIJwIAADCDQAwnQgAAMINADCeCAAAwg0AMJ8IAADCDQAwoAgAAMYSADChCAAAxQ0AMAtlAAC2EgAwZgAAuhIAMJkIAAC3EgAwmggAALgSADCbCAAAuRIAIJwIAADCDQAwnQgAAMINADCeCAAAwg0AMJ8IAADCDQAwoAgAALsSADChCAAAxQ0AMAtlAACrEgAwZgAArxIAMJkIAACsEgAwmggAAK0SADCbCAAArhIAIJwIAADVDQAwnQgAANUNADCeCAAA1Q0AMJ8IAADVDQAwoAgAALASADChCAAA2A0AMAtlAACfEgAwZgAApBIAMJkIAACgEgAwmggAAKESADCbCAAAohIAIJwIAACjEgAwnQgAAKMSADCeCAAAoxIAMJ8IAACjEgAwoAgAAKUSADChCAAAphIAMAtlAACWEgAwZgAAmhIAMJkIAACXEgAwmggAAJgSADCbCAAAmRIAIJwIAADbDgAwnQgAANsOADCeCAAA2w4AMJ8IAADbDgAwoAgAAJsSADChCAAA3g4AMAtlAACNEgAwZgAAkRIAMJkIAACOEgAwmggAAI8SADCbCAAAkBIAIJwIAADpDgAwnQgAAOkOADCeCAAA6Q4AMJ8IAADpDgAwoAgAAJISADChCAAA7A4AMAtlAACEEgAwZgAAiBIAMJkIAACFEgAwmggAAIYSADCbCAAAhxIAIJwIAAD3DgAwnQgAAPcOADCeCAAA9w4AMJ8IAAD3DgAwoAgAAIkSADChCAAA-g4AMAtlAAD7EQAwZgAA_xEAMJkIAAD8EQAwmggAAP0RADCbCAAA_hEAIJwIAACHDwAwnQgAAIcPADCeCAAAhw8AMJ8IAACHDwAwoAgAAIASADChCAAAig8AMAtlAADvEQAwZgAA9BEAMJkIAADwEQAwmggAAPERADCbCAAA8hEAIJwIAADzEQAwnQgAAPMRADCeCAAA8xEAMJ8IAADzEQAwoAgAAPURADChCAAA9hEAMAtlAADmEQAwZgAA6hEAMJkIAADnEQAwmggAAOgRADCbCAAA6REAIJwIAACUDwAwnQgAAJQPADCeCAAAlA8AMJ8IAACUDwAwoAgAAOsRADChCAAAlw8AMAsHAACgDwAgPgAAjREAIEAAAKEPACDBBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAABhgcBAAAAAYcHAQAAAAGIBwEAAAABiQcQAAAAAQIAAAC9AQAgZQAA7hEAIAMAAAC9AQAgZQAA7hEAIGYAAO0RACABXgAA4hcAMAIAAAC9AQAgXgAA7REAIAIAAACYDwAgXgAA7BEAIAjBBgEA7gwAIegGQAD9DAAh6QZAAP0MACHtBgEA7gwAIYYHAQCIDQAhhwcBAIgNACGIBwEAiA0AIYkHEACaDwAhCwcAAJwPACA-AACMEQAgQAAAnQ8AIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIe0GAQDuDAAhhgcBAIgNACGHBwEAiA0AIYgHAQCIDQAhiQcQAJoPACELBwAAoA8AID4AAI0RACBAAAChDwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAYYHAQAAAAGHBwEAAAABiAcBAAAAAYkHEAAAAAEHDQEAAAABPwAAnREAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAYoHAQAAAAGLBwEAAAABAgAAAMgBACBlAAD6EQAgAwAAAMgBACBlAAD6EQAgZgAA-REAIAFeAADhFwAwDA0BAPYKACEYAACJDAAgPwAAigwAILEGAACIDAAwsgYAAMABABCzBgAAiAwAMMEGAQAAAAHoBkAA_goAIekGQAD-CgAh9QYBAKQLACGKBwEA9goAIYsHAQD9CgAhAgAAAMgBACBeAAD5EQAgAgAAAPcRACBeAAD4EQAgCg0BAPYKACGxBgAA9hEAMLIGAAD3EQAQswYAAPYRADDBBgEAwgsAIegGQAD-CgAh6QZAAP4KACH1BgEApAsAIYoHAQD2CgAhiwcBAP0KACEKDQEA9goAIbEGAAD2EQAwsgYAAPcRABCzBgAA9hEAMMEGAQDCCwAh6AZAAP4KACHpBkAA_goAIfUGAQCkCwAhigcBAPYKACGLBwEA_QoAIQYNAQDuDAAhwQYBAO4MACHoBkAA_QwAIekGQAD9DAAhigcBAO4MACGLBwEAiA0AIQcNAQDuDAAhPwAAkhEAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIYoHAQDuDAAhiwcBAIgNACEHDQEAAAABPwAAnREAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAYoHAQAAAAGLBwEAAAABCAMAAKIRACA_AAClDwAgwQYBAAAAAcIGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAGKBwEAAAABAgAAALgBACBlAACDEgAgAwAAALgBACBlAACDEgAgZgAAghIAIAFeAADgFwAwAgAAALgBACBeAACCEgAgAgAAAIsPACBeAACBEgAgBsEGAQDuDAAhwgYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACGKBwEA7gwAIQgDAAChEQAgPwAAjw8AIMEGAQDuDAAhwgYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACGKBwEA7gwAIQgDAACiEQAgPwAApQ8AIMEGAQAAAAHCBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAABigcBAAAAAREDAAD3EAAgBwAAgQ8AIMEGAQAAAAHCBgEAAAABygYBAAAAAcsGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB7gYBAAAAAe8GAQAAAAHwBgEAAAAB8QYBAAAAAfIGAQAAAAHzBgEAAAAB9AYCAAAAAQIAAACxAQAgZQAAjBIAIAMAAACxAQAgZQAAjBIAIGYAAIsSACABXgAA3xcAMAIAAACxAQAgXgAAixIAIAIAAAD7DgAgXgAAihIAIA_BBgEA7gwAIcIGAQCIDQAhygYBAIgNACHLBgEAiA0AIdoGIAC5DQAh6AZAAP0MACHpBkAA_QwAIe0GAQCIDQAh7gYBAIgNACHvBgEAiA0AIfAGAQCIDQAh8QYBAIgNACHyBgEAiA0AIfMGAQCIDQAh9AYCAIcNACERAwAA9hAAIAcAAP4OACDBBgEA7gwAIcIGAQCIDQAhygYBAIgNACHLBgEAiA0AIdoGIAC5DQAh6AZAAP0MACHpBkAA_QwAIe0GAQCIDQAh7gYBAIgNACHvBgEAiA0AIfAGAQCIDQAh8QYBAIgNACHyBgEAiA0AIfMGAQCIDQAh9AYCAIcNACERAwAA9xAAIAcAAIEPACDBBgEAAAABwgYBAAAAAcoGAQAAAAHLBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAe4GAQAAAAHvBgEAAAAB8AYBAAAAAfEGAQAAAAHyBgEAAAAB8wYBAAAAAfQGAgAAAAEJAwAAgREAIMEGAQAAAAHCBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB7gYBAAAAAe8GAQAAAAGEBwEAAAABAgAAAKsBACBlAACVEgAgAwAAAKsBACBlAACVEgAgZgAAlBIAIAFeAADeFwAwAgAAAKsBACBeAACUEgAgAgAAAO0OACBeAACTEgAgCMEGAQDuDAAhwgYBAIgNACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACHuBgEA7gwAIe8GAQCIDQAhhAcBAIgNACEJAwAAgBEAIMEGAQDuDAAhwgYBAIgNACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACHuBgEA7gwAIe8GAQCIDQAhhAcBAIgNACEJAwAAgREAIMEGAQAAAAHCBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB7gYBAAAAAe8GAQAAAAGEBwEAAAABCAMAAIYRACDBBgEAAAABwgYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAYQHAQAAAAGFBwEAAAABAgAAAKUBACBlAACeEgAgAwAAAKUBACBlAACeEgAgZgAAnRIAIAFeAADdFwAwAgAAAKUBACBeAACdEgAgAgAAAN8OACBeAACcEgAgB8EGAQDuDAAhwgYBAIgNACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACGEBwEA7gwAIYUHAQDuDAAhCAMAAIURACDBBgEA7gwAIcIGAQCIDQAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAhhAcBAO4MACGFBwEA7gwAIQgDAACGEQAgwQYBAAAAAcIGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAGEBwEAAAABhQcBAAAAAQnBBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB7gYBAAAAAe8GAQAAAAGEBwEAAAABuQcBAAAAAboHQAAAAAECAAAAoAEAIGUAAKoSACADAAAAoAEAIGUAAKoSACBmAACpEgAgAV4AANwXADAOGAAAiQwAILEGAACVDAAwsgYAAJ4BABCzBgAAlQwAMMEGAQAAAAHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACHuBgEA_QoAIe8GAQD9CgAh9QYBAKQLACGEBwEA9goAIbkHAQD9CgAhugdAAK4LACECAAAAoAEAIF4AAKkSACACAAAApxIAIF4AAKgSACANsQYAAKYSADCyBgAApxIAELMGAACmEgAwwQYBAMILACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACHuBgEA_QoAIe8GAQD9CgAh9QYBAKQLACGEBwEA9goAIbkHAQD9CgAhugdAAK4LACENsQYAAKYSADCyBgAApxIAELMGAACmEgAwwQYBAMILACHaBiAA9AoAIegGQAD-CgAh6QZAAP4KACHuBgEA_QoAIe8GAQD9CgAh9QYBAKQLACGEBwEA9goAIbkHAQD9CgAhugdAAK4LACEJwQYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACHuBgEAiA0AIe8GAQCIDQAhhAcBAO4MACG5BwEAiA0AIboHQACVDQAhCcEGAQDuDAAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh7gYBAIgNACHvBgEAiA0AIYQHAQDuDAAhuQcBAIgNACG6B0AAlQ0AIQnBBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB7gYBAAAAAe8GAQAAAAGEBwEAAAABuQcBAAAAAboHQAAAAAEHJgAAtRIAIMEGAQAAAAHoBkAAAAABxQcBAAAAAcYHEAAAAAHHBwEAAAAByAcBAAAAAQIAAAB5ACBlAAC0EgAgAwAAAHkAIGUAALQSACBmAACyEgAgAV4AANsXADACAAAAeQAgXgAAshIAIAIAAADZDQAgXgAAsRIAIAbBBgEA7gwAIegGQAD9DAAhxQcBAO4MACHGBxAAuA0AIccHAQCIDQAhyAcBAIgNACEHJgAAsxIAIMEGAQDuDAAh6AZAAP0MACHFBwEA7gwAIcYHEAC4DQAhxwcBAIgNACHIBwEAiA0AIQVlAADWFwAgZgAA2RcAIJkIAADXFwAgmggAANgXACCfCAAAcAAgByYAALUSACDBBgEAAAAB6AZAAAAAAcUHAQAAAAHGBxAAAAABxwcBAAAAAcgHAQAAAAEDZQAA1hcAIJkIAADXFwAgnwgAAHAAIBkHAADgDQAgEgAA4Q0AICMAAMASACAkAADiDQAgJwAA5A0AIMEGAQAAAAHoBkAAAAAB6QZAAAAAAe0GAQAAAAH2BgEAAAAB_QYAAADLBwKVB0AAAAABnwcAAADKBwK-BwAAAL4HAsYHEAAAAAHMBwAAAMwHA80HAQAAAAHOBwEAAAABzwcgAAAAAdAHAQAAAAHRBwEAAAAB0gcBAAAAAdMHAQAAAAHVB0AAAAAB1gdAAAAAAQIAAABwACBlAAC_EgAgAwAAAHAAIGUAAL8SACBmAAC9EgAgAV4AANUXADACAAAAcAAgXgAAvRIAIAIAAADGDQAgXgAAvBIAIBTBBgEA7gwAIegGQAD9DAAh6QZAAP0MACHtBgEAiA0AIfYGAQCIDQAh_QYAAMgNywcilQdAAJUNACGfBwAAtw3KByK-BwAAyQ2-ByLGBxAAuA0AIcwHAADKDcwHI80HAQCIDQAhzgcBAO4MACHPByAAuQ0AIdAHAQCIDQAh0QcBAIgNACHSBwEAiA0AIdMHAQCIDQAh1QdAAJUNACHWB0AAlQ0AIRkHAADMDQAgEgAAzQ0AICMAAL4SACAkAADODQAgJwAA0A0AIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIe0GAQCIDQAh9gYBAIgNACH9BgAAyA3LByKVB0AAlQ0AIZ8HAAC3DcoHIr4HAADJDb4HIsYHEAC4DQAhzAcAAMoNzAcjzQcBAIgNACHOBwEA7gwAIc8HIAC5DQAh0AcBAIgNACHRBwEAiA0AIdIHAQCIDQAh0wcBAIgNACHVB0AAlQ0AIdYHQACVDQAhB2UAANAXACBmAADTFwAgmQgAANEXACCaCAAA0hcAIJ0IAABnACCeCAAAZwAgnwgAAGkAIBkHAADgDQAgEgAA4Q0AICMAAMASACAkAADiDQAgJwAA5A0AIMEGAQAAAAHoBkAAAAAB6QZAAAAAAe0GAQAAAAH2BgEAAAAB_QYAAADLBwKVB0AAAAABnwcAAADKBwK-BwAAAL4HAsYHEAAAAAHMBwAAAMwHA80HAQAAAAHOBwEAAAABzwcgAAAAAdAHAQAAAAHRBwEAAAAB0gcBAAAAAdMHAQAAAAHVB0AAAAAB1gdAAAAAAQNlAADQFwAgmQgAANEXACCfCAAAaQAgGQcAAOANACASAADhDQAgIwAAwBIAICUAAOMNACAnAADkDQAgwQYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAfYGAQAAAAH9BgAAAMsHApUHQAAAAAGfBwAAAMoHAr4HAAAAvgcCxgcQAAAAAcwHAAAAzAcDzQcBAAAAAc4HAQAAAAHPByAAAAAB0AcBAAAAAdEHAQAAAAHSBwEAAAAB1AcBAAAAAdUHQAAAAAHWB0AAAAABAgAAAHAAIGUAAMkSACADAAAAcAAgZQAAyRIAIGYAAMgSACABXgAAzxcAMAIAAABwACBeAADIEgAgAgAAAMYNACBeAADHEgAgFMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIe0GAQCIDQAh9gYBAIgNACH9BgAAyA3LByKVB0AAlQ0AIZ8HAAC3DcoHIr4HAADJDb4HIsYHEAC4DQAhzAcAAMoNzAcjzQcBAIgNACHOBwEA7gwAIc8HIAC5DQAh0AcBAIgNACHRBwEAiA0AIdIHAQCIDQAh1AcBAIgNACHVB0AAlQ0AIdYHQACVDQAhGQcAAMwNACASAADNDQAgIwAAvhIAICUAAM8NACAnAADQDQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh7QYBAIgNACH2BgEAiA0AIf0GAADIDcsHIpUHQACVDQAhnwcAALcNygcivgcAAMkNvgcixgcQALgNACHMBwAAyg3MByPNBwEAiA0AIc4HAQDuDAAhzwcgALkNACHQBwEAiA0AIdEHAQCIDQAh0gcBAIgNACHUBwEAiA0AIdUHQACVDQAh1gdAAJUNACEZBwAA4A0AIBIAAOENACAjAADAEgAgJQAA4w0AICcAAOQNACDBBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB9gYBAAAAAf0GAAAAywcClQdAAAAAAZ8HAAAAygcCvgcAAAC-BwLGBxAAAAABzAcAAADMBwPNBwEAAAABzgcBAAAAAc8HIAAAAAHQBwEAAAAB0QcBAAAAAdIHAQAAAAHUBwEAAAAB1QdAAAAAAdYHQAAAAAENBQAA3A8AIBkAAOYNACAoAADoDQAgtAYBAAAAAcEGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAH3BgEAAAABigcBAAAAAZ8HAAAAygcCxgcQAAAAAc4HAQAAAAECAAAAaQAgZQAA0hIAIAMAAABpACBlAADSEgAgZgAA0RIAIAFeAADOFwAwAgAAAGkAIF4AANESACACAAAAtQ0AIF4AANASACAKtAYBAIgNACHBBgEA7gwAIdoGIAC5DQAh6AZAAP0MACHpBkAA_QwAIfcGAQCIDQAhigcBAO4MACGfBwAAtw3KByLGBxAAuA0AIc4HAQDuDAAhDQUAANoPACAZAAC7DQAgKAAAvQ0AILQGAQCIDQAhwQYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACH3BgEAiA0AIYoHAQDuDAAhnwcAALcNygcixgcQALgNACHOBwEA7gwAIQ0FAADcDwAgGQAA5g0AICgAAOgNACC0BgEAAAABwQYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAfcGAQAAAAGKBwEAAAABnwcAAADKBwLGBxAAAAABzgcBAAAAAQUSAACtEAAgGwAA3RIAIPYGAQAAAAHXBwEAAAAB3AdAAAAAAQIAAABUACBlAADcEgAgAwAAAFQAIGUAANwSACBmAADaEgAgAV4AAM0XADACAAAAVAAgXgAA2hIAIAIAAACnEAAgXgAA2RIAIAP2BgEA7gwAIdcHAQDuDAAh3AdAAP0MACEFEgAAqhAAIBsAANsSACD2BgEA7gwAIdcHAQDuDAAh3AdAAP0MACEFZQAAyBcAIGYAAMsXACCZCAAAyRcAIJoIAADKFwAgnwgAAFAAIAUSAACtEAAgGwAA3RIAIPYGAQAAAAHXBwEAAAAB3AdAAAAAAQNlAADIFwAgmQgAAMkXACCfCAAAUAAgBRIAAPYPACAZAADoEgAg9gYBAAAAAfcGAQAAAAHeB0AAAAABAgAAAEUAIGUAAOcSACADAAAARQAgZQAA5xIAIGYAAOUSACABXgAAxxcAMAIAAABFACBeAADlEgAgAgAAAPAPACBeAADkEgAgA_YGAQDuDAAh9wYBAO4MACHeB0AA_QwAIQUSAADzDwAgGQAA5hIAIPYGAQDuDAAh9wYBAO4MACHeB0AA_QwAIQVlAADCFwAgZgAAxRcAIJkIAADDFwAgmggAAMQXACCfCAAAlgEAIAUSAAD2DwAgGQAA6BIAIPYGAQAAAAH3BgEAAAAB3gdAAAAAAQNlAADCFwAgmQgAAMMXACCfCAAAlgEAIBADAADzEgAgIAAAthAAICEAALcQACAiAAC4EAAgKQAAuRAAIMEGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAGEBwEAAAABtwcBAAAAAbgHQAAAAAG5BwEAAAAB4gcBAAAAAeMHAQAAAAHkByAAAAABAgAAAJYBACBlAADyEgAgAwAAAJYBACBlAADyEgAgZgAA8BIAIAFeAADBFwAwAgAAAJYBACBeAADwEgAgAgAAAMoPACBeAADvEgAgC8EGAQDuDAAhwgYBAIgNACHoBkAA_QwAIekGQAD9DAAhhAcBAO4MACG3BwEAiA0AIbgHQACVDQAhuQcBAIgNACHiBwEA7gwAIeMHAQCIDQAh5AcgALkNACEQAwAA8RIAICAAAM4PACAhAADPDwAgIgAA0A8AICkAANEPACDBBgEA7gwAIcIGAQCIDQAh6AZAAP0MACHpBkAA_QwAIYQHAQDuDAAhtwcBAIgNACG4B0AAlQ0AIbkHAQCIDQAh4gcBAO4MACHjBwEAiA0AIeQHIAC5DQAhB2UAALwXACBmAAC_FwAgmQgAAL0XACCaCAAAvhcAIJ0IAABHACCeCAAARwAgnwgAAOYJACAQAwAA8xIAICAAALYQACAhAAC3EAAgIgAAuBAAICkAALkQACDBBgEAAAABwgYBAAAAAegGQAAAAAHpBkAAAAABhAcBAAAAAbcHAQAAAAG4B0AAAAABuQcBAAAAAeIHAQAAAAHjBwEAAAAB5AcgAAAAAQNlAAC8FwAgmQgAAL0XACCfCAAA5gkAIAUHAACBEwAgwQYBAAAAAegGQAAAAAHtBgEAAAAB5QcBAAAAAQIAAAAtACBlAACAEwAgAwAAAC0AIGUAAIATACBmAAD-EgAgAV4AALsXADAKBwAA8QsAIEQAAIkMACCxBgAA1AwAMLIGAAArABCzBgAA1AwAMMEGAQAAAAHoBkAA_goAIe0GAQDCCwAh5QcBAPYKACHmBwEApAsAIQIAAAAtACBeAAD-EgAgAgAAAPwSACBeAAD9EgAgCLEGAAD7EgAwsgYAAPwSABCzBgAA-xIAMMEGAQDCCwAh6AZAAP4KACHtBgEAwgsAIeUHAQD2CgAh5gcBAKQLACEIsQYAAPsSADCyBgAA_BIAELMGAAD7EgAwwQYBAMILACHoBkAA_goAIe0GAQDCCwAh5QcBAPYKACHmBwEApAsAIQTBBgEA7gwAIegGQAD9DAAh7QYBAO4MACHlBwEA7gwAIQUHAAD_EgAgwQYBAO4MACHoBkAA_QwAIe0GAQDuDAAh5QcBAO4MACEFZQAAthcAIGYAALkXACCZCAAAtxcAIJoIAAC4FwAgnwgAAB0AIAUHAACBEwAgwQYBAAAAAegGQAAAAAHtBgEAAAAB5QcBAAAAAQNlAAC2FwAgmQgAALcXACCfCAAAHQAgMxMAAI4TACAUAACPEwAgFQAAkBMAIBYAAJETACAXAACSEwAgHQAAlBMAIB4AAJUTACAhAACTEwAgIgAAmhMAICsAAJYTACAsAACXEwAgLgAAmBMAIC8AAJkTACAxAACbEwAgMgAAnBMAIDMAAJ0TACA0AACeEwAgNQAAnxMAIDYAAKATACA3AAChEwAgOAAAohMAIDkAAKMTACA6AACkEwAgOwAApRMAIDwAAKYTACA9AACnEwAgQQAAqBMAIEIAAKkTACBDAACqEwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAACwBwKKBwEAAAABpAcBAAAAAaUHAQAAAAGmBwEAAAABpwcBAAAAAagHQAAAAAGqBwAAAKoHA6sHAQAAAAGsBwEAAAABrgcAAACuBwKwBwEAAAABsQcBAAAAAbIHQAAAAAGzB0AAAAABtQdAAAAAAbYHAQAAAAG3BwEAAAABuAdAAAAAAQIAAACSAQAgZQAAjRMAIAMAAACSAQAgZQAAjRMAIGYAAIwTACABXgAAtRcAMDgTAACeDAAgFAAAnwwAIBUAAKAMACAWAAChDAAgFwAAgwsAIB0AAKIMACAeAACjDAAgIQAAmAwAICIAAIkLACArAACkDAAgLAAApQwAIC4AAKYMACAvAACnDAAgMAAAiQwAIDEAAKgMACAyAACpDAAgMwAAggsAIDQAAJgMACA1AACiDAAgNgAAmQwAIDcAAKcMACA4AACnDAAgOQAAqgwAIDoAAKsMACA7AACICwAgPAAAhwsAID0AAIYLACBBAACFCwAgQgAArAwAIEMAAIoMACCxBgAAmgwAMLIGAAAvABCzBgAAmgwAMMEGAQAAAAHoBkAA_goAIekGQAD-CgAh_QYAAJ0MsAciigcBAP0KACGkBwEAAAABpQcBAP0KACGmBwEA_QoAIacHAQD9CgAhqAdAAK4LACGqBwAAmwyqByOrBwEA_QoAIawHAQD9CgAhrgcAAJwMrgcisAcBAP0KACGxBwEAAAABsgdAAK4LACGzB0AArgsAIbQHAQCkCwAhtQdAAK4LACG2BwEA_QoAIbcHAQAAAAG4B0AArgsAIQIAAACSAQAgXgAAjBMAIAIAAACKEwAgXgAAixMAIBqxBgAAiRMAMLIGAACKEwAQswYAAIkTADDBBgEAwgsAIegGQAD-CgAh6QZAAP4KACH9BgAAnQywByKKBwEA_QoAIaQHAQD2CgAhpQcBAP0KACGmBwEA_QoAIacHAQD9CgAhqAdAAK4LACGqBwAAmwyqByOrBwEA_QoAIawHAQD9CgAhrgcAAJwMrgcisAcBAP0KACGxBwEA_QoAIbIHQACuCwAhswdAAK4LACG0BwEApAsAIbUHQACuCwAhtgcBAP0KACG3BwEA_QoAIbgHQACuCwAhGrEGAACJEwAwsgYAAIoTABCzBgAAiRMAMMEGAQDCCwAh6AZAAP4KACHpBkAA_goAIf0GAACdDLAHIooHAQD9CgAhpAcBAPYKACGlBwEA_QoAIaYHAQD9CgAhpwcBAP0KACGoB0AArgsAIaoHAACbDKoHI6sHAQD9CgAhrAcBAP0KACGuBwAAnAyuByKwBwEA_QoAIbEHAQD9CgAhsgdAAK4LACGzB0AArgsAIbQHAQCkCwAhtQdAAK4LACG2BwEA_QoAIbcHAQD9CgAhuAdAAK4LACEWwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACEzEwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AITMTAACOEwAgFAAAjxMAIBUAAJATACAWAACREwAgFwAAkhMAIB0AAJQTACAeAACVEwAgIQAAkxMAICIAAJoTACArAACWEwAgLAAAlxMAIC4AAJgTACAvAACZEwAgMQAAmxMAIDIAAJwTACAzAACdEwAgNAAAnhMAIDUAAJ8TACA2AACgEwAgNwAAoRMAIDgAAKITACA5AACjEwAgOgAApBMAIDsAAKUTACA8AACmEwAgPQAApxMAIEEAAKgTACBCAACpEwAgQwAAqhMAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAAsAcCigcBAAAAAaQHAQAAAAGlBwEAAAABpgcBAAAAAacHAQAAAAGoB0AAAAABqgcAAACqBwOrBwEAAAABrAcBAAAAAa4HAAAArgcCsAcBAAAAAbEHAQAAAAGyB0AAAAABswdAAAAAAbUHQAAAAAG2BwEAAAABtwcBAAAAAbgHQAAAAAEEZQAA2xMAMJkIAADcEwAwmwgAAN0TACCfCAAA3hMAMANlAADZEwAgmQgAANoTACCfCAAA0QcAIARlAADUEwAwmQgAANUTADCbCAAA1hMAIJ8IAADXEwAwBGUAAM8TADCZCAAA0BMAMJsIAADREwAgnwgAANITADAEZQAAyhMAMJkIAADLEwAwmwgAAMwTACCfCAAAuA8AMARlAADGEwAwmQgAAMcTADCbCAAAyBMAIJ8IAADsDwAwBGUAAMITADCZCAAAwxMAMJsIAADEEwAgnwgAAKMQADAEZQAAvRMAMJkIAAC-EwAwmwgAAL8TACCfCAAAlRAAMARlAAC4EwAwmQgAALkTADCbCAAAuhMAIJ8IAAC7EwAwA2UAALUTACCZCAAAthMAIJ8IAAD6AQAgA2UAALMTACCZCAAAtBMAIJ8IAADyAQAgBGUAAK8TADCZCAAAsBMAMJsIAACxEwAgnwgAAMINADAEZQAAqxMAMJkIAACsEwAwmwgAAK0TACCfCAAAyQ4AMARlAACCEwAwmQgAAIMTADCbCAAAhRMAIJ8IAACGEwAwBGUAAPQSADCZCAAA9RIAMJsIAAD3EgAgnwgAAPgSADAEZQAA6RIAMJkIAADqEgAwmwgAAOwSACCfCAAAxg8AMARlAADeEgAwmQgAAN8SADCbCAAA4RIAIJ8IAADsDwAwBGUAANMSADCZCAAA1BIAMJsIAADWEgAgnwgAAKMQADAEZQAAyhIAMJkIAADLEgAwmwgAAM0SACCfCAAAsQ0AMARlAADBEgAwmQgAAMISADCbCAAAxBIAIJ8IAADCDQAwBGUAALYSADCZCAAAtxIAMJsIAAC5EgAgnwgAAMINADAEZQAAqxIAMJkIAACsEgAwmwgAAK4SACCfCAAA1Q0AMARlAACfEgAwmQgAAKASADCbCAAAohIAIJ8IAACjEgAwBGUAAJYSADCZCAAAlxIAMJsIAACZEgAgnwgAANsOADAEZQAAjRIAMJkIAACOEgAwmwgAAJASACCfCAAA6Q4AMARlAACEEgAwmQgAAIUSADCbCAAAhxIAIJ8IAAD3DgAwBGUAAPsRADCZCAAA_BEAMJsIAAD-EQAgnwgAAIcPADAEZQAA7xEAMJkIAADwEQAwmwgAAPIRACCfCAAA8xEAMARlAADmEQAwmQgAAOcRADCbCAAA6REAIJ8IAACUDwAwDAMAAOcPACAZAADWDgAgwQYBAAAAAcIGAQAAAAHoBkAAAAAB6QZAAAAAAfcGAQAAAAH4BgEAAAAB-QYCAAAAAfoGAQAAAAH7BoAAAAAB_QYAAAD9BgICAAAAYQAgZQAArhMAIAFeAAC0FwAwDAMAAOcPACAZAADWDgAgwQYBAAAAAcIGAQAAAAHoBkAAAAAB6QZAAAAAAfcGAQAAAAH4BgEAAAAB-QYCAAAAAfoGAQAAAAH7BoAAAAAB_QYAAAD9BgIZBwAA4A0AICMAAMASACAkAADiDQAgJQAA4w0AICcAAOQNACDBBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB_QYAAADLBwKVB0AAAAABnwcAAADKBwK-BwAAAL4HAsYHEAAAAAHMBwAAAMwHA80HAQAAAAHOBwEAAAABzwcgAAAAAdAHAQAAAAHRBwEAAAAB0gcBAAAAAdMHAQAAAAHUBwEAAAAB1QdAAAAAAdYHQAAAAAECAAAAcAAgZQAAshMAIAFeAACzFwAwGQcAAOANACAjAADAEgAgJAAA4g0AICUAAOMNACAnAADkDQAgwQYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAf0GAAAAywcClQdAAAAAAZ8HAAAAygcCvgcAAAC-BwLGBxAAAAABzAcAAADMBwPNBwEAAAABzgcBAAAAAc8HIAAAAAHQBwEAAAAB0QcBAAAAAdIHAQAAAAHTBwEAAAAB1AcBAAAAAdUHQAAAAAHWB0AAAAABCQMAAKsNACAFAACKDgAgLQAArA0AILQGAQAAAAHBBgEAAAABwgYBAAAAAegGQAAAAAHpBkAAAAABiggBAAAAAQIAAADyAQAgZQAAsxMAIAQDAAC3EwAgwgYBAAAAAegGQAAAAAHpBkAAAAABAgAAAPoBACBlAAC1EwAgA2UAAKYXACCZCAAApxcAIJ8IAADmCQAgA-gGQAAAAAG-BwAAAL4HAsQHAQAAAAECAAAAhwEAIGUAALwTACABXgAAshcAMAoSAACwCwAgsQYAAK8MADCyBgAAhQEAELMGAACvDAAw6AZAAP4KACH2BgEAwgsAIb4HAADLC74HIsQHAQD2CgAhjAgAAK0MACCNCAAArgwAIAPoBkAAAAABvgcAAAC-BwLEBwEAAAABBhsAAMETACDpBkAAAAAB1wcBAAAAAdgHAgAAAAHZBwIAAAAB2gcgAAAAAQIAAABZACBlAADAEwAgAV4AALEXADAGGwAAwRMAIOkGQAAAAAHXBwEAAAAB2AcCAAAAAdkHAgAAAAHaByAAAAABA2UAAKEXACCZCAAAohcAIJ8IAABQACAFGwAA3RIAIBwAAK4QACDXBwEAAAAB2wcBAAAAAdwHQAAAAAECAAAAVAAgZQAAxRMAIAFeAACwFwAwBRsAAN0SACAcAACuEAAg1wcBAAAAAdsHAQAAAAHcB0AAAAABBRkAAOgSACAqAAD3DwAg9wYBAAAAAd0HAQAAAAHeB0AAAAABAgAAAEUAIGUAAMkTACABXgAArxcAMAUZAADoEgAgKgAA9w8AIPcGAQAAAAHdBwEAAAAB3gdAAAAAAQIDAADOEwAgwgYBAAAAAQIAAABBACBlAADNEwAgAV4AAK4XADACAwAAzhMAIMIGAQAAAAEDZQAAnBcAIJkIAACdFwAgnwgAAOYJACAFwQYBAAAAAZMHAAAAkwcClAcBAAAAAZUHQAAAAAGWB0AAAAABAgAAAD0AIGUAANMTACABXgAArRcAMAoSAACwCwAgsQYAAM4MADCyBgAAOwAQswYAAM4MADDBBgEAAAAB9gYBAMILACGTBwAAzwyTByKUBwEAAAABlQdAAP4KACGWB0AArgsAIQXBBgEAAAABkwcAAACTBwKUBwEAAAABlQdAAAAAAZYHQAAAAAEIwQYBAAAAAegGQAAAAAGUBwEAAAABlQdAAAAAAZcHAQAAAAGYB0AAAAABmQcBAAAAAZoHAQAAAAECAAAAOQAgZQAA2BMAIAFeAACsFwAwDRIAALALACCxBgAA0AwAMLIGAAA3ABCzBgAA0AwAMMEGAQAAAAHoBkAA_goAIfYGAQDCCwAhlAcBAAAAAZUHQAD-CgAhlwcBAMILACGYB0AArgsAIZkHAQD9CgAhmgcBAP0KACEIwQYBAAAAAegGQAAAAAGUBwEAAAABlQdAAAAAAZcHAQAAAAGYB0AAAAABmQcBAAAAAZoHAQAAAAEFPgEAAAABiQcQAAAAAZsHAQAAAAGcB0AAAAABnQdAAAAAAQIAAADRBwAgZQAA2RMAIAcNAQAAAAHBBgEAAAABnwcAAACfBwKgBwEAAAABoQcBAAAAAaIHAQAAAAGjBwEAAAABAgAAADMAIGUAAN8TACABXgAAqxcAMA0NAQD9CgAhEgAAsAsAILEGAADSDAAwsgYAADEAELMGAADSDAAwwQYBAAAAAfYGAQDCCwAhnwcAANMMnwcioAcBAP0KACGhBwEA_QoAIaIHAQD9CgAhowcBAP0KACGTCAAA0QwAIAcNAQAAAAHBBgEAAAABnwcAAACfBwKgBwEAAAABoQcBAAAAAaIHAQAAAAGjBwEAAAABAwAAAGEAIGUAAK4TACBmAADkEwAgAgAAAGEAIF4AAOQTACACAAAAzQ4AIF4AAOMTACAKwQYBAO4MACHCBgEAiA0AIegGQAD9DAAh6QZAAP0MACH3BgEAiA0AIfgGAQCIDQAh-QYCAM8OACH6BgEAiA0AIfsGgAAAAAH9BgAA0A79BiIMAwAA5Q8AIBkAANMOACDBBgEA7gwAIcIGAQCIDQAh6AZAAP0MACHpBkAA_QwAIfcGAQCIDQAh-AYBAIgNACH5BgIAzw4AIfoGAQCIDQAh-waAAAAAAf0GAADQDv0GIgMAAABwACBlAACyEwAgZgAA6RMAIAIAAABwACBeAADpEwAgAgAAAMYNACBeAADoEwAgFMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIe0GAQCIDQAh_QYAAMgNywcilQdAAJUNACGfBwAAtw3KByK-BwAAyQ2-ByLGBxAAuA0AIcwHAADKDcwHI80HAQCIDQAhzgcBAO4MACHPByAAuQ0AIdAHAQCIDQAh0QcBAIgNACHSBwEAiA0AIdMHAQCIDQAh1AcBAIgNACHVB0AAlQ0AIdYHQACVDQAhGQcAAMwNACAjAAC-EgAgJAAAzg0AICUAAM8NACAnAADQDQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh7QYBAIgNACH9BgAAyA3LByKVB0AAlQ0AIZ8HAAC3DcoHIr4HAADJDb4HIsYHEAC4DQAhzAcAAMoNzAcjzQcBAIgNACHOBwEA7gwAIc8HIAC5DQAh0AcBAIgNACHRBwEAiA0AIdIHAQCIDQAh0wcBAIgNACHUBwEAiA0AIdUHQACVDQAh1gdAAJUNACEDAAAAiwEAIGUAALMTACBmAADsEwAgCwAAAIsBACADAACnDQAgBQAAiA4AIC0AAKgNACBeAADsEwAgtAYBAO4MACHBBgEA7gwAIcIGAQDuDAAh6AZAAP0MACHpBkAA_QwAIYoIAQCIDQAhCQMAAKcNACAFAACIDgAgLQAAqA0AILQGAQDuDAAhwQYBAO4MACHCBgEA7gwAIegGQAD9DAAh6QZAAP0MACGKCAEAiA0AIQMAAACJAQAgZQAAtRMAIGYAAO8TACAGAAAAiQEAIAMAAPATACBeAADvEwAgwgYBAO4MACHoBkAA_QwAIekGQAD9DAAhBAMAAPATACDCBgEA7gwAIegGQAD9DAAh6QZAAP0MACEFZQAAphcAIGYAAKkXACCZCAAApxcAIJoIAACoFwAgnwgAAOYJACADAAAAhwEAIGUAALwTACBmAAD3EwAgAgAAAIcBACBeAAD3EwAgAgAAAPUTACBeAAD2EwAgB7EGAAD0EwAwsgYAAPUTABCzBgAA9BMAMOgGQAD-CgAh9gYBAMILACG-BwAAywu-ByLEBwEA9goAIQexBgAA9BMAMLIGAAD1EwAQswYAAPQTADDoBkAA_goAIfYGAQDCCwAhvgcAAMsLvgcixAcBAPYKACED6AZAAP0MACG-BwAAyQ2-ByLEBwEA7gwAIQPoBkAA_QwAIb4HAADJDb4HIsQHAQDuDAAhAwAAAFkAIGUAAMATACBmAAD8EwAgAgAAAFkAIF4AAPwTACACAAAAmRAAIF4AAPsTACAF6QZAAP0MACHXBwEA7gwAIdgHAgCHDQAh2QcCAIcNACHaByAAuQ0AIQYbAAD9EwAg6QZAAP0MACHXBwEA7gwAIdgHAgCHDQAh2QcCAIcNACHaByAAuQ0AIQVlAAChFwAgZgAApBcAIJkIAACiFwAgmggAAKMXACCfCAAAUAAgAwAAAFQAIGUAAMUTACBmAACCFAAgAgAAAFQAIF4AAIIUACACAAAApxAAIF4AAIEUACAD1wcBAO4MACHbBwEAiA0AIdwHQAD9DAAhBRsAANsSACAcAACrEAAg1wcBAO4MACHbBwEAiA0AIdwHQAD9DAAhAwAAAEUAIGUAAMkTACBmAACHFAAgAgAAAEUAIF4AAIcUACACAAAA8A8AIF4AAIYUACAD9wYBAO4MACHdBwEAiA0AId4HQAD9DAAhBRkAAOYSACAqAAD0DwAg9wYBAO4MACHdBwEAiA0AId4HQAD9DAAhAwAAAEEAIGUAAM0TACBmAACMFAAgAgAAAEEAIF4AAIwUACACAAAAvA8AIF4AAIsUACABwgYBAO4MACECAwAAjRQAIMIGAQDuDAAhBWUAAJwXACBmAACfFwAgmQgAAJ0XACCaCAAAnhcAIJ8IAADmCQAgAwAAAD0AIGUAANMTACBmAACUFAAgAgAAAD0AIF4AAJQUACACAAAAkhQAIF4AAJMUACAJsQYAAJEUADCyBgAAkhQAELMGAACRFAAwwQYBAMILACH2BgEAwgsAIZMHAADPDJMHIpQHAQD2CgAhlQdAAP4KACGWB0AArgsAIQmxBgAAkRQAMLIGAACSFAAQswYAAJEUADDBBgEAwgsAIfYGAQDCCwAhkwcAAM8MkwcilAcBAPYKACGVB0AA_goAIZYHQACuCwAhBcEGAQDuDAAhkwcAAKwRkwcilAcBAO4MACGVB0AA_QwAIZYHQACVDQAhBcEGAQDuDAAhkwcAAKwRkwcilAcBAO4MACGVB0AA_QwAIZYHQACVDQAhAwAAADkAIGUAANgTACBmAACbFAAgAgAAADkAIF4AAJsUACACAAAAmRQAIF4AAJoUACAMsQYAAJgUADCyBgAAmRQAELMGAACYFAAwwQYBAMILACHoBkAA_goAIfYGAQDCCwAhlAcBAPYKACGVB0AA_goAIZcHAQDCCwAhmAdAAK4LACGZBwEA_QoAIZoHAQD9CgAhDLEGAACYFAAwsgYAAJkUABCzBgAAmBQAMMEGAQDCCwAh6AZAAP4KACH2BgEAwgsAIZQHAQD2CgAhlQdAAP4KACGXBwEAwgsAIZgHQACuCwAhmQcBAP0KACGaBwEA_QoAIQjBBgEA7gwAIegGQAD9DAAhlAcBAO4MACGVB0AA_QwAIZcHAQDuDAAhmAdAAJUNACGZBwEAiA0AIZoHAQCIDQAhCMEGAQDuDAAh6AZAAP0MACGUBwEA7gwAIZUHQAD9DAAhlwcBAO4MACGYB0AAlQ0AIZkHAQCIDQAhmgcBAIgNACEDAAAANQAgZQAA2RMAIGYAAJ4UACAHAAAANQAgPgEAiA0AIV4AAJ4UACCJBxAAmg8AIZsHAQCIDQAhnAdAAJUNACGdB0AAlQ0AIQU-AQCIDQAhiQcQAJoPACGbBwEAiA0AIZwHQACVDQAhnQdAAJUNACEDAAAAMwAgZQAA3xMAIGYAAKUUACACAAAAMwAgXgAApRQAIAIAAACjFAAgXgAApBQAIAsNAQD9CgAhsQYAAKIUADCyBgAAoxQAELMGAACiFAAwwQYBAMILACH2BgEAwgsAIZ8HAADTDJ8HIqAHAQD9CgAhoQcBAP0KACGiBwEA_QoAIaMHAQD9CgAhCw0BAP0KACGxBgAAohQAMLIGAACjFAAQswYAAKIUADDBBgEAwgsAIfYGAQDCCwAhnwcAANMMnwcioAcBAP0KACGhBwEA_QoAIaIHAQD9CgAhowcBAP0KACEHDQEAiA0AIcEGAQDuDAAhnwcAAL8RnwcioAcBAIgNACGhBwEAiA0AIaIHAQCIDQAhowcBAIgNACEHDQEAiA0AIcEGAQDuDAAhnwcAAL8RnwcioAcBAIgNACGhBwEAiA0AIaIHAQCIDQAhowcBAIgNACEDZQAAmhcAIJkIAACbFwAgnwgAAJIBACAAAAAHZQAAlRcAIGYAAJgXACCZCAAAlhcAIJoIAACXFwAgnQgAAC8AIJ4IAAAvACCfCAAAkgEAIANlAACVFwAgmQgAAJYXACCfCAAAkgEAIAAAAAAAAAAAAAAAAAVlAACQFwAgZgAAkxcAIJkIAACRFwAgmggAAJIXACCfCAAAkgEAIANlAACQFwAgmQgAAJEXACCfCAAAkgEAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFZQAAixcAIGYAAI4XACCZCAAAjBcAIJoIAACNFwAgnwgAAEwAIANlAACLFwAgmQgAAIwXACCfCAAATAAgAAAAAAAFZQAAhhcAIGYAAIkXACCZCAAAhxcAIJoIAACIFwAgnwgAAJYBACADZQAAhhcAIJkIAACHFwAgnwgAAJYBACAAAAAAAAAHZQAAgRcAIGYAAIQXACCZCAAAghcAIJoIAACDFwAgnQgAAC8AIJ4IAAAvACCfCAAAkgEAIANlAACBFwAgmQgAAIIXACCfCAAAkgEAIAAAAAAABWUAAPwWACBmAAD_FgAgmQgAAP0WACCaCAAA_hYAIJ8IAAATACADZQAA_BYAIJkIAAD9FgAgnwgAABMAIAQDAACeDgAgBwAA_BQAIEoAAM0WACBMAADOFgAgAAAAAAAAAAAFZQAA9xYAIGYAAPoWACCZCAAA-BYAIJoIAAD5FgAgnwgAAB0AIANlAAD3FgAgmQgAAPgWACCfCAAAHQAgEQgAAMgWACAOAADJFgAgDwAAyhYAIBAAAMsWACARAADwEAAgKAAAuxYAIEUAAL0WACBGAADMFgAgRwAA6xAAIEgAAMcWACBJAADHFgAguAcAAJENACCDCAAAkQ0AIIQIAACRDQAghwgAAJENACCICAAAkQ0AIIkIAACRDQAgAAAAAAAFZQAA8hYAIGYAAPUWACCZCAAA8xYAIJoIAAD0FgAgnwgAAB0AIANlAADyFgAgmQgAAPMWACCfCAAAHQAgAAAABWUAAOoWACBmAADwFgAgmQgAAOsWACCaCAAA7xYAIJ8IAAAdACAHZQAA6BYAIGYAAO0WACCZCAAA6RYAIJoIAADsFgAgnQgAABkAIJ4IAAAZACCfCAAAjAMAIANlAADqFgAgmQgAAOsWACCfCAAAHQAgA2UAAOgWACCZCAAA6RYAIJ8IAACMAwAgAAAABWUAAOMWACBmAADmFgAgmQgAAOQWACCaCAAA5RYAIJ8IAAAdACADZQAA4xYAIJkIAADkFgAgnwgAAB0AIAAAAAtlAACAFgAwZgAAhBYAMJkIAACBFgAwmggAAIIWADCbCAAAgxYAIJwIAACmFQAwnQgAAKYVADCeCAAAphUAMJ8IAACmFQAwoAgAAIUWADChCAAAqRUAMAtlAACiFQAwZgAApxUAMJkIAACjFQAwmggAAKQVADCbCAAApRUAIJwIAACmFQAwnQgAAKYVADCeCAAAphUAMJ8IAACmFQAwoAgAAKgVADChCAAAqRUAMAtlAACWFQAwZgAAmxUAMJkIAACXFQAwmggAAJgVADCbCAAAmRUAIJwIAACaFQAwnQgAAJoVADCeCAAAmhUAMJ8IAACaFQAwoAgAAJwVADChCAAAnRUAMAYHAACJFQAgwQYBAAAAAe0GAQAAAAGKBwEAAAABpwcBAAAAAfcHAQAAAAECAAAAIQAgZQAAoRUAIAMAAAAhACBlAAChFQAgZgAAoBUAIAFeAADiFgAwCwcAAPELACANAADWDAAgsQYAANUMADCyBgAAFwAQswYAANUMADDBBgEAAAAB7QYBAAAAAYoHAQD2CgAhpwcBAPYKACH3BwEA9goAIfgHAQCkCwAhAgAAACEAIF4AAKAVACACAAAAnhUAIF4AAJ8VACAJsQYAAJ0VADCyBgAAnhUAELMGAACdFQAwwQYBAMILACHtBgEAwgsAIYoHAQD2CgAhpwcBAPYKACH3BwEA9goAIfgHAQCkCwAhCbEGAACdFQAwsgYAAJ4VABCzBgAAnRUAMMEGAQDCCwAh7QYBAMILACGKBwEA9goAIacHAQD2CgAh9wcBAPYKACH4BwEApAsAIQXBBgEA7gwAIe0GAQDuDAAhigcBAO4MACGnBwEA7gwAIfcHAQDuDAAhBgcAAIcVACDBBgEA7gwAIe0GAQDuDAAhigcBAO4MACGnBwEA7gwAIfcHAQDuDAAhBgcAAIkVACDBBgEAAAAB7QYBAAAAAYoHAQAAAAGnBwEAAAAB9wcBAAAAARkIAAD2FQAgDgAA9xUAIA8AAPgVACAQAAD5FQAgEQAA-hUAICgAAPwVACBFAAD7FQAgRgAA_RUAIEcAAP4VACBIAAD_FQAgwQYBAAAAAegGQAAAAAHpBkAAAAABigcBAAAAAacHAQAAAAGqBwAAAKoHAqwHAQAAAAG4B0AAAAABgggBAAAAAYMIAQAAAAGECAEAAAABhQhAAAAAAYYIIAAAAAGHCAEAAAABiAgBAAAAAQIAAAAdACBlAAD1FQAgAwAAAB0AIGUAAPUVACBmAACtFQAgAV4AAOEWADAeCAAA2QwAIA4AANoMACAPAADbDAAgEAAA3AwAIBEAAIsLACAoAACnDAAgRQAAqQwAIEYAAN0MACBHAACGCwAgSAAA1gwAIEkAANYMACCxBgAA1wwAMLIGAAAbABCzBgAA1wwAMMEGAQAAAAHoBkAA_goAIekGQAD-CgAhigcBAPYKACGnBwEA9goAIaoHAADYDKoHIqwHAQAAAAG4B0AArgsAIYIIAQAAAAGDCAEAAAABhAgBAP0KACGFCEAA_goAIYYIIAD0CgAhhwgBAP0KACGICAEApAsAIYkIAQCkCwAhAgAAAB0AIF4AAK0VACACAAAAqhUAIF4AAKsVACATsQYAAKkVADCyBgAAqhUAELMGAACpFQAwwQYBAMILACHoBkAA_goAIekGQAD-CgAhigcBAPYKACGnBwEA9goAIaoHAADYDKoHIqwHAQD2CgAhuAdAAK4LACGCCAEA9goAIYMIAQD9CgAhhAgBAP0KACGFCEAA_goAIYYIIAD0CgAhhwgBAP0KACGICAEApAsAIYkIAQCkCwAhE7EGAACpFQAwsgYAAKoVABCzBgAAqRUAMMEGAQDCCwAh6AZAAP4KACHpBkAA_goAIYoHAQD2CgAhpwcBAPYKACGqBwAA2AyqByKsBwEA9goAIbgHQACuCwAhgggBAPYKACGDCAEA_QoAIYQIAQD9CgAhhQhAAP4KACGGCCAA9AoAIYcIAQD9CgAhiAgBAKQLACGJCAEApAsAIQ_BBgEA7gwAIegGQAD9DAAh6QZAAP0MACGKBwEA7gwAIacHAQDuDAAhqgcAAKwVqgcirAcBAO4MACG4B0AAlQ0AIYIIAQDuDAAhgwgBAIgNACGECAEAiA0AIYUIQAD9DAAhhgggALkNACGHCAEAiA0AIYgIAQCIDQAhAZwIAAAAqgcCGQgAAK4VACAOAACvFQAgDwAAsBUAIBAAALEVACARAACyFQAgKAAAtBUAIEUAALMVACBGAAC1FQAgRwAAthUAIEgAALcVACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACGKBwEA7gwAIacHAQDuDAAhqgcAAKwVqgcirAcBAO4MACG4B0AAlQ0AIYIIAQDuDAAhgwgBAIgNACGECAEAiA0AIYUIQAD9DAAhhgggALkNACGHCAEAiA0AIYgIAQCIDQAhB2UAAPAVACBmAADzFQAgmQgAAPEVACCaCAAA8hUAIJ0IAAAVACCeCAAAFQAgnwgAAKQDACAHZQAA6xUAIGYAAO4VACCZCAAA7BUAIJoIAADtFQAgnQgAABcAIJ4IAAAXACCfCAAAIQAgB2UAAOYVACBmAADpFQAgmQgAAOcVACCaCAAA6BUAIJ0IAAAmACCeCAAAJgAgnwgAANQDACAHZQAA4RUAIGYAAOQVACCZCAAA4hUAIJoIAADjFQAgnQgAACgAIJ4IAAAoACCfCAAA7AMAIAtlAADYFQAwZgAA3BUAMJkIAADZFQAwmggAANoVADCbCAAA2xUAIJwIAAD2DAAwnQgAAPYMADCeCAAA9gwAMJ8IAAD2DAAwoAgAAN0VADChCAAA-QwAMAtlAADPFQAwZgAA0xUAMJkIAADQFQAwmggAANEVADCbCAAA0hUAIJwIAAD4EgAwnQgAAPgSADCeCAAA-BIAMJ8IAAD4EgAwoAgAANQVADChCAAA-xIAMAtlAADGFQAwZgAAyhUAMJkIAADHFQAwmggAAMgVADCbCAAAyRUAIJwIAADCDQAwnQgAAMINADCeCAAAwg0AMJ8IAADCDQAwoAgAAMsVADChCAAAxQ0AMAdlAADBFQAgZgAAxBUAIJkIAADCFQAgmggAAMMVACCdCAAAuwEAIJ4IAAC7AQAgnwgAAL0BACALZQAAuBUAMGYAALwVADCZCAAAuRUAMJoIAAC6FQAwmwgAALsVACCcCAAA9w4AMJ0IAAD3DgAwnggAAPcOADCfCAAA9w4AMKAIAAC9FQAwoQgAAPoOADAHZQAA2BYAIGYAAN8WACCZCAAA2RYAIJoIAADeFgAgnQgAABkAIJ4IAAAZACCfCAAAjAMAIBEDAAD3EAAgGAAAgg8AIMEGAQAAAAHCBgEAAAABygYBAAAAAcsGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAHuBgEAAAAB7wYBAAAAAfAGAQAAAAHxBgEAAAAB8gYBAAAAAfMGAQAAAAH0BgIAAAAB9QYBAAAAAQIAAACxAQAgZQAAwBUAIAMAAACxAQAgZQAAwBUAIGYAAL8VACABXgAA3RYAMAIAAACxAQAgXgAAvxUAIAIAAAD7DgAgXgAAvhUAIA_BBgEA7gwAIcIGAQCIDQAhygYBAIgNACHLBgEAiA0AIdoGIAC5DQAh6AZAAP0MACHpBkAA_QwAIe4GAQCIDQAh7wYBAIgNACHwBgEAiA0AIfEGAQCIDQAh8gYBAIgNACHzBgEAiA0AIfQGAgCHDQAh9QYBAIgNACERAwAA9hAAIBgAAP8OACDBBgEA7gwAIcIGAQCIDQAhygYBAIgNACHLBgEAiA0AIdoGIAC5DQAh6AZAAP0MACHpBkAA_QwAIe4GAQCIDQAh7wYBAIgNACHwBgEAiA0AIfEGAQCIDQAh8gYBAIgNACHzBgEAiA0AIfQGAgCHDQAh9QYBAIgNACERAwAA9xAAIBgAAIIPACDBBgEAAAABwgYBAAAAAcoGAQAAAAHLBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB7gYBAAAAAe8GAQAAAAHwBgEAAAAB8QYBAAAAAfIGAQAAAAHzBgEAAAAB9AYCAAAAAfUGAQAAAAELGAAAog8AID4AAI0RACBAAAChDwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAYYHAQAAAAGHBwEAAAABiAcBAAAAAYkHEAAAAAECAAAAvQEAIGUAAMEVACADAAAAuwEAIGUAAMEVACBmAADFFQAgDQAAALsBACAYAACeDwAgPgAAjBEAIEAAAJ0PACBeAADFFQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh9QYBAIgNACGGBwEAiA0AIYcHAQCIDQAhiAcBAIgNACGJBxAAmg8AIQsYAACeDwAgPgAAjBEAIEAAAJ0PACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIYYHAQCIDQAhhwcBAIgNACGIBwEAiA0AIYkHEACaDwAhGRIAAOENACAjAADAEgAgJAAA4g0AICUAAOMNACAnAADkDQAgwQYBAAAAAegGQAAAAAHpBkAAAAAB9gYBAAAAAf0GAAAAywcClQdAAAAAAZ8HAAAAygcCvgcAAAC-BwLGBxAAAAABzAcAAADMBwPNBwEAAAABzgcBAAAAAc8HIAAAAAHQBwEAAAAB0QcBAAAAAdIHAQAAAAHTBwEAAAAB1AcBAAAAAdUHQAAAAAHWB0AAAAABAgAAAHAAIGUAAM4VACADAAAAcAAgZQAAzhUAIGYAAM0VACABXgAA3BYAMAIAAABwACBeAADNFQAgAgAAAMYNACBeAADMFQAgFMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIfYGAQCIDQAh_QYAAMgNywcilQdAAJUNACGfBwAAtw3KByK-BwAAyQ2-ByLGBxAAuA0AIcwHAADKDcwHI80HAQCIDQAhzgcBAO4MACHPByAAuQ0AIdAHAQCIDQAh0QcBAIgNACHSBwEAiA0AIdMHAQCIDQAh1AcBAIgNACHVB0AAlQ0AIdYHQACVDQAhGRIAAM0NACAjAAC-EgAgJAAAzg0AICUAAM8NACAnAADQDQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh9gYBAIgNACH9BgAAyA3LByKVB0AAlQ0AIZ8HAAC3DcoHIr4HAADJDb4HIsYHEAC4DQAhzAcAAMoNzAcjzQcBAIgNACHOBwEA7gwAIc8HIAC5DQAh0AcBAIgNACHRBwEAiA0AIdIHAQCIDQAh0wcBAIgNACHUBwEAiA0AIdUHQACVDQAh1gdAAJUNACEZEgAA4Q0AICMAAMASACAkAADiDQAgJQAA4w0AICcAAOQNACDBBgEAAAAB6AZAAAAAAekGQAAAAAH2BgEAAAAB_QYAAADLBwKVB0AAAAABnwcAAADKBwK-BwAAAL4HAsYHEAAAAAHMBwAAAMwHA80HAQAAAAHOBwEAAAABzwcgAAAAAdAHAQAAAAHRBwEAAAAB0gcBAAAAAdMHAQAAAAHUBwEAAAAB1QdAAAAAAdYHQAAAAAEFRAAA6RQAIMEGAQAAAAHoBkAAAAAB5QcBAAAAAeYHAQAAAAECAAAALQAgZQAA1xUAIAMAAAAtACBlAADXFQAgZgAA1hUAIAFeAADbFgAwAgAAAC0AIF4AANYVACACAAAA_BIAIF4AANUVACAEwQYBAO4MACHoBkAA_QwAIeUHAQDuDAAh5gcBAIgNACEFRAAA6BQAIMEGAQDuDAAh6AZAAP0MACHlBwEA7gwAIeYHAQCIDQAhBUQAAOkUACDBBgEAAAAB6AZAAAAAAeUHAQAAAAHmBwEAAAABCgMAAIwNACBKAAC7DgAgTAAAjQ0AILQGAQAAAAG1BgEAAAABwQYBAAAAAcIGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAA8gcCAgAAABMAIGUAAOAVACADAAAAEwAgZQAA4BUAIGYAAN8VACABXgAA2hYAMAIAAAATACBeAADfFQAgAgAAAPoMACBeAADeFQAgB7QGAQDuDAAhtQYBAO4MACHBBgEA7gwAIcIGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAAD8DPIHIgoDAACADQAgSgAAuQ4AIEwAAIENACC0BgEA7gwAIbUGAQDuDAAhwQYBAO4MACHCBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAA_AzyByIKAwAAjA0AIEoAALsOACBMAACNDQAgtAYBAAAAAbUGAQAAAAHBBgEAAAABwgYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAADyBwIFTAEAAAABwQYBAAAAAfIHAQAAAAHzBwIAAAAB9AcBAAAAAQIAAADsAwAgZQAA4RUAIAMAAAAoACBlAADhFQAgZgAA5RUAIAcAAAAoACBMAQDuDAAhXgAA5RUAIMEGAQDuDAAh8gcBAO4MACHzBwIAhw0AIfQHAQDuDAAhBUwBAO4MACHBBgEA7gwAIfIHAQDuDAAh8wcCAIcNACH0BwEA7gwAIQPBBgEAAAAB9QcCAAAAAfYHAgAAAAECAAAA1AMAIGUAAOYVACADAAAAJgAgZQAA5hUAIGYAAOoVACAFAAAAJgAgXgAA6hUAIMEGAQDuDAAh9QcCAIcNACH2BwIAhw0AIQPBBgEA7gwAIfUHAgCHDQAh9gcCAIcNACEGDQAAihUAIMEGAQAAAAGKBwEAAAABpwcBAAAAAfcHAQAAAAH4BwEAAAABAgAAACEAIGUAAOsVACADAAAAFwAgZQAA6xUAIGYAAO8VACAIAAAAFwAgDQAAiBUAIF4AAO8VACDBBgEA7gwAIYoHAQDuDAAhpwcBAO4MACH3BwEA7gwAIfgHAQCIDQAhBg0AAIgVACDBBgEA7gwAIYoHAQDuDAAhpwcBAO4MACH3BwEA7gwAIfgHAQCIDQAhB8EGAQAAAAH5BwEAAAAB-gcBAAAAAfsHAQAAAAH8BwEAAAAB_QcBAAAAAf4HAQAAAAECAAAApAMAIGUAAPAVACADAAAAFQAgZQAA8BUAIGYAAPQVACAJAAAAFQAgXgAA9BUAIMEGAQDuDAAh-QcBAO4MACH6BwEAiA0AIfsHAQCIDQAh_AcBAO4MACH9BwEAiA0AIf4HAQCIDQAhB8EGAQDuDAAh-QcBAO4MACH6BwEAiA0AIfsHAQCIDQAh_AcBAO4MACH9BwEAiA0AIf4HAQCIDQAhGQgAAPYVACAOAAD3FQAgDwAA-BUAIBAAAPkVACARAAD6FQAgKAAA_BUAIEUAAPsVACBGAAD9FQAgRwAA_hUAIEgAAP8VACDBBgEAAAAB6AZAAAAAAekGQAAAAAGKBwEAAAABpwcBAAAAAaoHAAAAqgcCrAcBAAAAAbgHQAAAAAGCCAEAAAABgwgBAAAAAYQIAQAAAAGFCEAAAAABhgggAAAAAYcIAQAAAAGICAEAAAABA2UAAPAVACCZCAAA8RUAIJ8IAACkAwAgA2UAAOsVACCZCAAA7BUAIJ8IAAAhACADZQAA5hUAIJkIAADnFQAgnwgAANQDACADZQAA4RUAIJkIAADiFQAgnwgAAOwDACAEZQAA2BUAMJkIAADZFQAwmwgAANsVACCfCAAA9gwAMARlAADPFQAwmQgAANAVADCbCAAA0hUAIJ8IAAD4EgAwBGUAAMYVADCZCAAAxxUAMJsIAADJFQAgnwgAAMINADADZQAAwRUAIJkIAADCFQAgnwgAAL0BACAEZQAAuBUAMJkIAAC5FQAwmwgAALsVACCfCAAA9w4AMANlAADYFgAgmQgAANkWACCfCAAAjAMAIBkIAAD2FQAgDgAA9xUAIA8AAPgVACAQAAD5FQAgEQAA-hUAICgAAPwVACBFAAD7FQAgRgAA_RUAIEcAAP4VACBJAACKFgAgwQYBAAAAAegGQAAAAAHpBkAAAAABigcBAAAAAacHAQAAAAGqBwAAAKoHAqwHAQAAAAG4B0AAAAABgggBAAAAAYMIAQAAAAGECAEAAAABhQhAAAAAAYYIIAAAAAGHCAEAAAABiQgBAAAAAQIAAAAdACBlAACJFgAgAwAAAB0AIGUAAIkWACBmAACHFgAgAV4AANcWADACAAAAHQAgXgAAhxYAIAIAAACqFQAgXgAAhhYAIA_BBgEA7gwAIegGQAD9DAAh6QZAAP0MACGKBwEA7gwAIacHAQDuDAAhqgcAAKwVqgcirAcBAO4MACG4B0AAlQ0AIYIIAQDuDAAhgwgBAIgNACGECAEAiA0AIYUIQAD9DAAhhgggALkNACGHCAEAiA0AIYkIAQCIDQAhGQgAAK4VACAOAACvFQAgDwAAsBUAIBAAALEVACARAACyFQAgKAAAtBUAIEUAALMVACBGAAC1FQAgRwAAthUAIEkAAIgWACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACGKBwEA7gwAIacHAQDuDAAhqgcAAKwVqgcirAcBAO4MACG4B0AAlQ0AIYIIAQDuDAAhgwgBAIgNACGECAEAiA0AIYUIQAD9DAAhhgggALkNACGHCAEAiA0AIYkIAQCIDQAhB2UAANIWACBmAADVFgAgmQgAANMWACCaCAAA1BYAIJ0IAAAZACCeCAAAGQAgnwgAAIwDACAZCAAA9hUAIA4AAPcVACAPAAD4FQAgEAAA-RUAIBEAAPoVACAoAAD8FQAgRQAA-xUAIEYAAP0VACBHAAD-FQAgSQAAihYAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAYoHAQAAAAGnBwEAAAABqgcAAACqBwKsBwEAAAABuAdAAAAAAYIIAQAAAAGDCAEAAAABhAgBAAAAAYUIQAAAAAGGCCAAAAABhwgBAAAAAYkIAQAAAAEDZQAA0hYAIJkIAADTFgAgnwgAAIwDACAEZQAAgBYAMJkIAACBFgAwmwgAAIMWACCfCAAAphUAMARlAACiFQAwmQgAAKMVADCbCAAApRUAIJ8IAACmFQAwBGUAAJYVADCZCAAAlxUAMJsIAACZFQAgnwgAAJoVADAAAAAAAAAAAAAAAAAAAAAAAAtlAACgFgAwZgAApBYAMJkIAAChFgAwmggAAKIWADCbCAAAoxYAIJwIAAC-EAAwnQgAAL4QADCeCAAAvhAAMJ8IAAC-EAAwoAgAAKUWADChCAAAwRAAMA8DAAD1DQAgKQAA-A0AIC0BAAAAAU8AAPkNACBQAAD3DQAgwQYBAAAAAcIGAQAAAAHDBgEAAAABxAYBAAAAAcUGQAAAAAHGBkAAAAABxwZAAAAAAcgGQAAAAAHKBgEAAAABywYBAAAAAQIAAAAFACBlAACoFgAgAwAAAAUAIGUAAKgWACBmAACnFgAgAV4AANEWADACAAAABQAgXgAApxYAIAIAAADCEAAgXgAAphYAIAstAQCIDQAhwQYBAO4MACHCBgEA7gwAIcMGAQDuDAAhxAYBAO4MACHFBkAAlQ0AIcYGQACVDQAhxwZAAJUNACHIBkAAlQ0AIcoGAQCIDQAhywYBAIgNACEPAwAAlg0AICkAAJkNACAtAQCIDQAhTwAAmg0AIFAAAJgNACDBBgEA7gwAIcIGAQDuDAAhwwYBAO4MACHEBgEA7gwAIcUGQACVDQAhxgZAAJUNACHHBkAAlQ0AIcgGQACVDQAhygYBAIgNACHLBgEAiA0AIQ8DAAD1DQAgKQAA-A0AIC0BAAAAAU8AAPkNACBQAAD3DQAgwQYBAAAAAcIGAQAAAAHDBgEAAAABxAYBAAAAAcUGQAAAAAHGBkAAAAABxwZAAAAAAcgGQAAAAAHKBgEAAAABywYBAAAAAQRlAACgFgAwmQgAAKEWADCbCAAAoxYAIJ8IAAC-EAAwDQMAAJ4OACApAACxFgAgLQAAkQ0AIE8AAO8QACBQAADPFgAgWAAA0BYAIMUGAACRDQAgxgYAAJENACDHBgAAkQ0AIMgGAACRDQAgyQYAAJENACDKBgAAkQ0AIMsGAACRDQAgAwMAAJ4OACBOAADPFgAgTwAA7xAAIAAEAwAAng4AIBgAALsRACA_AACsFgAg9QYAAJENACAEGAAAuxEAID8AAKwWACD1BgAAkQ0AIIsHAACRDQAgAAAAAAYSAAC7EQAgPgAAkQ0AIIkHAACRDQAgmwcAAJENACCcBwAAkQ0AIJ0HAACRDQAgAAAAAAACAwAAng4AIBIAALsRACAFAwAAng4AIAUAAKoWACASAAC7EQAgLQAAqxYAIIoIAACRDQAgAAAAAAAAEgcAAPwUACASAAC7EQAgIwAAwhYAICQAALsRACAlAAC7EQAgJwAAvhYAIO0GAACRDQAg9gYAAJENACCVBwAAkQ0AIMwHAACRDQAgzQcAAJENACDQBwAAkQ0AINEHAACRDQAg0gcAAJENACDTBwAAkQ0AINQHAACRDQAg1QcAAJENACDWBwAAkQ0AIAcFAACqFgAgGAAAuxEAIBkAAMMWACAoAAC7FgAgtAYAAJENACD1BgAAkQ0AIPcGAACRDQAgDAMAAJ4OACAYAAC7EQAgIAAArxYAICEAALAWACAiAADuEAAgKQAAsRYAIMIGAACRDQAg9QYAAJENACC3BwAAkQ0AILgHAACRDQAguQcAAJENACDjBwAAkQ0AIAUaAADFFgAgHQAAthYAIB4AALcWACC3BwAAkQ0AIOAHAACRDQAgAxkAAMMWACAfAADGFgAgtwcAAJENACAABQkAAI4WACAKAACOFgAgCwAAjxYAIIAIAACRDQAggQgAAJENACAFBwAA_BQAIPoHAACRDQAg-wcAAJENACD9BwAAkQ0AIP4HAACRDQAgAwcAAPwUACANAADHFgAg-AcAAJENACABBwAA_BQAIAEHAAD8FAAgCQcAAPwUACAYAAC7EQAgPgAArRYAIEAAAK4WACD1BgAAkQ0AIIYHAACRDQAghwcAAJENACCIBwAAkQ0AIIkHAACRDQAgAwUAAKoWACAGAACrFgAgTQAA8BAAIANLAADxFAAg7gcAAJENACDvBwAAkQ0AIAABUQAA5hAAIAstAQAAAAHBBgEAAAABwgYBAAAAAcMGAQAAAAHEBgEAAAABxQZAAAAAAcYGQAAAAAHHBkAAAAAByAZAAAAAAcoGAQAAAAHLBgEAAAABCwkAAIsWACALAACNFgAgwQYBAAAAAegGQAAAAAHpBkAAAAABoAcBAAAAAaEHAQAAAAGiBwEAAAAB_wcBAAAAAYAIAQAAAAGBCAEAAAABAgAAAIwDACBlAADSFgAgAwAAABkAIGUAANIWACBmAADWFgAgDQAAABkAIAkAAJMVACALAACVFQAgXgAA1hYAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIaAHAQDuDAAhoQcBAO4MACGiBwEA7gwAIf8HAQDuDAAhgAgBAIgNACGBCAEAiA0AIQsJAACTFQAgCwAAlRUAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIaAHAQDuDAAhoQcBAO4MACGiBwEA7gwAIf8HAQDuDAAhgAgBAIgNACGBCAEAiA0AIQ_BBgEAAAAB6AZAAAAAAekGQAAAAAGKBwEAAAABpwcBAAAAAaoHAAAAqgcCrAcBAAAAAbgHQAAAAAGCCAEAAAABgwgBAAAAAYQIAQAAAAGFCEAAAAABhgggAAAAAYcIAQAAAAGJCAEAAAABCwoAAIwWACALAACNFgAgwQYBAAAAAegGQAAAAAHpBkAAAAABoAcBAAAAAaEHAQAAAAGiBwEAAAAB_wcBAAAAAYAIAQAAAAGBCAEAAAABAgAAAIwDACBlAADYFgAgB7QGAQAAAAG1BgEAAAABwQYBAAAAAcIGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAA8gcCBMEGAQAAAAHoBkAAAAAB5QcBAAAAAeYHAQAAAAEUwQYBAAAAAegGQAAAAAHpBkAAAAAB9gYBAAAAAf0GAAAAywcClQdAAAAAAZ8HAAAAygcCvgcAAAC-BwLGBxAAAAABzAcAAADMBwPNBwEAAAABzgcBAAAAAc8HIAAAAAHQBwEAAAAB0QcBAAAAAdIHAQAAAAHTBwEAAAAB1AcBAAAAAdUHQAAAAAHWB0AAAAABD8EGAQAAAAHCBgEAAAABygYBAAAAAcsGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAHuBgEAAAAB7wYBAAAAAfAGAQAAAAHxBgEAAAAB8gYBAAAAAfMGAQAAAAH0BgIAAAAB9QYBAAAAAQMAAAAZACBlAADYFgAgZgAA4BYAIA0AAAAZACAKAACUFQAgCwAAlRUAIF4AAOAWACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACGgBwEA7gwAIaEHAQDuDAAhogcBAO4MACH_BwEA7gwAIYAIAQCIDQAhgQgBAIgNACELCgAAlBUAIAsAAJUVACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACGgBwEA7gwAIaEHAQDuDAAhogcBAO4MACH_BwEA7gwAIYAIAQCIDQAhgQgBAIgNACEPwQYBAAAAAegGQAAAAAHpBkAAAAABigcBAAAAAacHAQAAAAGqBwAAAKoHAqwHAQAAAAG4B0AAAAABgggBAAAAAYMIAQAAAAGECAEAAAABhQhAAAAAAYYIIAAAAAGHCAEAAAABiAgBAAAAAQXBBgEAAAAB7QYBAAAAAYoHAQAAAAGnBwEAAAAB9wcBAAAAARoOAAD3FQAgDwAA-BUAIBAAAPkVACARAAD6FQAgKAAA_BUAIEUAAPsVACBGAAD9FQAgRwAA_hUAIEgAAP8VACBJAACKFgAgwQYBAAAAAegGQAAAAAHpBkAAAAABigcBAAAAAacHAQAAAAGqBwAAAKoHAqwHAQAAAAG4B0AAAAABgggBAAAAAYMIAQAAAAGECAEAAAABhQhAAAAAAYYIIAAAAAGHCAEAAAABiAgBAAAAAYkIAQAAAAECAAAAHQAgZQAA4xYAIAMAAAAbACBlAADjFgAgZgAA5xYAIBwAAAAbACAOAACvFQAgDwAAsBUAIBAAALEVACARAACyFQAgKAAAtBUAIEUAALMVACBGAAC1FQAgRwAAthUAIEgAALcVACBJAACIFgAgXgAA5xYAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIYoHAQDuDAAhpwcBAO4MACGqBwAArBWqByKsBwEA7gwAIbgHQACVDQAhgggBAO4MACGDCAEAiA0AIYQIAQCIDQAhhQhAAP0MACGGCCAAuQ0AIYcIAQCIDQAhiAgBAIgNACGJCAEAiA0AIRoOAACvFQAgDwAAsBUAIBAAALEVACARAACyFQAgKAAAtBUAIEUAALMVACBGAAC1FQAgRwAAthUAIEgAALcVACBJAACIFgAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAhigcBAO4MACGnBwEA7gwAIaoHAACsFaoHIqwHAQDuDAAhuAdAAJUNACGCCAEA7gwAIYMIAQCIDQAhhAgBAIgNACGFCEAA_QwAIYYIIAC5DQAhhwgBAIgNACGICAEAiA0AIYkIAQCIDQAhCwkAAIsWACAKAACMFgAgwQYBAAAAAegGQAAAAAHpBkAAAAABoAcBAAAAAaEHAQAAAAGiBwEAAAAB_wcBAAAAAYAIAQAAAAGBCAEAAAABAgAAAIwDACBlAADoFgAgGggAAPYVACAPAAD4FQAgEAAA-RUAIBEAAPoVACAoAAD8FQAgRQAA-xUAIEYAAP0VACBHAAD-FQAgSAAA_xUAIEkAAIoWACDBBgEAAAAB6AZAAAAAAekGQAAAAAGKBwEAAAABpwcBAAAAAaoHAAAAqgcCrAcBAAAAAbgHQAAAAAGCCAEAAAABgwgBAAAAAYQIAQAAAAGFCEAAAAABhgggAAAAAYcIAQAAAAGICAEAAAABiQgBAAAAAQIAAAAdACBlAADqFgAgAwAAABkAIGUAAOgWACBmAADuFgAgDQAAABkAIAkAAJMVACAKAACUFQAgXgAA7hYAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIaAHAQDuDAAhoQcBAO4MACGiBwEA7gwAIf8HAQDuDAAhgAgBAIgNACGBCAEAiA0AIQsJAACTFQAgCgAAlBUAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIaAHAQDuDAAhoQcBAO4MACGiBwEA7gwAIf8HAQDuDAAhgAgBAIgNACGBCAEAiA0AIQMAAAAbACBlAADqFgAgZgAA8RYAIBwAAAAbACAIAACuFQAgDwAAsBUAIBAAALEVACARAACyFQAgKAAAtBUAIEUAALMVACBGAAC1FQAgRwAAthUAIEgAALcVACBJAACIFgAgXgAA8RYAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIYoHAQDuDAAhpwcBAO4MACGqBwAArBWqByKsBwEA7gwAIbgHQACVDQAhgggBAO4MACGDCAEAiA0AIYQIAQCIDQAhhQhAAP0MACGGCCAAuQ0AIYcIAQCIDQAhiAgBAIgNACGJCAEAiA0AIRoIAACuFQAgDwAAsBUAIBAAALEVACARAACyFQAgKAAAtBUAIEUAALMVACBGAAC1FQAgRwAAthUAIEgAALcVACBJAACIFgAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAhigcBAO4MACGnBwEA7gwAIaoHAACsFaoHIqwHAQDuDAAhuAdAAJUNACGCCAEA7gwAIYMIAQCIDQAhhAgBAIgNACGFCEAA_QwAIYYIIAC5DQAhhwgBAIgNACGICAEAiA0AIYkIAQCIDQAhGggAAPYVACAOAAD3FQAgEAAA-RUAIBEAAPoVACAoAAD8FQAgRQAA-xUAIEYAAP0VACBHAAD-FQAgSAAA_xUAIEkAAIoWACDBBgEAAAAB6AZAAAAAAekGQAAAAAGKBwEAAAABpwcBAAAAAaoHAAAAqgcCrAcBAAAAAbgHQAAAAAGCCAEAAAABgwgBAAAAAYQIAQAAAAGFCEAAAAABhgggAAAAAYcIAQAAAAGICAEAAAABiQgBAAAAAQIAAAAdACBlAADyFgAgAwAAABsAIGUAAPIWACBmAAD2FgAgHAAAABsAIAgAAK4VACAOAACvFQAgEAAAsRUAIBEAALIVACAoAAC0FQAgRQAAsxUAIEYAALUVACBHAAC2FQAgSAAAtxUAIEkAAIgWACBeAAD2FgAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAhigcBAO4MACGnBwEA7gwAIaoHAACsFaoHIqwHAQDuDAAhuAdAAJUNACGCCAEA7gwAIYMIAQCIDQAhhAgBAIgNACGFCEAA_QwAIYYIIAC5DQAhhwgBAIgNACGICAEAiA0AIYkIAQCIDQAhGggAAK4VACAOAACvFQAgEAAAsRUAIBEAALIVACAoAAC0FQAgRQAAsxUAIEYAALUVACBHAAC2FQAgSAAAtxUAIEkAAIgWACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACGKBwEA7gwAIacHAQDuDAAhqgcAAKwVqgcirAcBAO4MACG4B0AAlQ0AIYIIAQDuDAAhgwgBAIgNACGECAEAiA0AIYUIQAD9DAAhhgggALkNACGHCAEAiA0AIYgIAQCIDQAhiQgBAIgNACEaCAAA9hUAIA4AAPcVACAPAAD4FQAgEQAA-hUAICgAAPwVACBFAAD7FQAgRgAA_RUAIEcAAP4VACBIAAD_FQAgSQAAihYAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAYoHAQAAAAGnBwEAAAABqgcAAACqBwKsBwEAAAABuAdAAAAAAYIIAQAAAAGDCAEAAAABhAgBAAAAAYUIQAAAAAGGCCAAAAABhwgBAAAAAYgIAQAAAAGJCAEAAAABAgAAAB0AIGUAAPcWACADAAAAGwAgZQAA9xYAIGYAAPsWACAcAAAAGwAgCAAArhUAIA4AAK8VACAPAACwFQAgEQAAshUAICgAALQVACBFAACzFQAgRgAAtRUAIEcAALYVACBIAAC3FQAgSQAAiBYAIF4AAPsWACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACGKBwEA7gwAIacHAQDuDAAhqgcAAKwVqgcirAcBAO4MACG4B0AAlQ0AIYIIAQDuDAAhgwgBAIgNACGECAEAiA0AIYUIQAD9DAAhhgggALkNACGHCAEAiA0AIYgIAQCIDQAhiQgBAIgNACEaCAAArhUAIA4AAK8VACAPAACwFQAgEQAAshUAICgAALQVACBFAACzFQAgRgAAtRUAIEcAALYVACBIAAC3FQAgSQAAiBYAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIYoHAQDuDAAhpwcBAO4MACGqBwAArBWqByKsBwEA7gwAIbgHQACVDQAhgggBAO4MACGDCAEAiA0AIYQIAQCIDQAhhQhAAP0MACGGCCAAuQ0AIYcIAQCIDQAhiAgBAIgNACGJCAEAiA0AIQsDAACMDQAgBwAAiw0AIEoAALsOACC0BgEAAAABtQYBAAAAAcEGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB_QYAAADyBwICAAAAEwAgZQAA_BYAIAMAAAARACBlAAD8FgAgZgAAgBcAIA0AAAARACADAACADQAgBwAA_wwAIEoAALkOACBeAACAFwAgtAYBAO4MACG1BgEA7gwAIcEGAQDuDAAhwgYBAO4MACHoBkAA_QwAIekGQAD9DAAh7QYBAO4MACH9BgAA_AzyByILAwAAgA0AIAcAAP8MACBKAAC5DgAgtAYBAO4MACG1BgEA7gwAIcEGAQDuDAAhwgYBAO4MACHoBkAA_QwAIekGQAD9DAAh7QYBAO4MACH9BgAA_AzyByI0EwAAjhMAIBQAAI8TACAVAACQEwAgFgAAkRMAIBcAAJITACAdAACUEwAgHgAAlRMAICEAAJMTACAiAACaEwAgKwAAlhMAICwAAJcTACAuAACYEwAgLwAAmRMAIDAAAKYUACAxAACbEwAgMwAAnRMAIDQAAJ4TACA1AACfEwAgNgAAoBMAIDcAAKETACA4AACiEwAgOQAAoxMAIDoAAKQTACA7AAClEwAgPAAAphMAID0AAKcTACBBAACoEwAgQgAAqRMAIEMAAKoTACDBBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAALAHAooHAQAAAAGkBwEAAAABpQcBAAAAAaYHAQAAAAGnBwEAAAABqAdAAAAAAaoHAAAAqgcDqwcBAAAAAawHAQAAAAGuBwAAAK4HArAHAQAAAAGxBwEAAAABsgdAAAAAAbMHQAAAAAG0BwEAAAABtQdAAAAAAbYHAQAAAAG3BwEAAAABuAdAAAAAAQIAAACSAQAgZQAAgRcAIAMAAAAvACBlAACBFwAgZgAAhRcAIDYAAAAvACATAADIEQAgFAAAyREAIBUAAMoRACAWAADLEQAgFwAAzBEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIF4AAIUXACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhNBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AIREDAADzEgAgGAAAtRAAICEAALcQACAiAAC4EAAgKQAAuRAAIMEGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAH1BgEAAAABhAcBAAAAAbcHAQAAAAG4B0AAAAABuQcBAAAAAeIHAQAAAAHjBwEAAAAB5AcgAAAAAQIAAACWAQAgZQAAhhcAIAMAAABkACBlAACGFwAgZgAAihcAIBMAAABkACADAADxEgAgGAAAzQ8AICEAAM8PACAiAADQDwAgKQAA0Q8AIF4AAIoXACDBBgEA7gwAIcIGAQCIDQAh6AZAAP0MACHpBkAA_QwAIfUGAQCIDQAhhAcBAO4MACG3BwEAiA0AIbgHQACVDQAhuQcBAIgNACHiBwEA7gwAIeMHAQCIDQAh5AcgALkNACERAwAA8RIAIBgAAM0PACAhAADPDwAgIgAA0A8AICkAANEPACDBBgEA7gwAIcIGAQCIDQAh6AZAAP0MACHpBkAA_QwAIfUGAQCIDQAhhAcBAO4MACG3BwEAiA0AIbgHQACVDQAhuQcBAIgNACHiBwEA7gwAIeMHAQCIDQAh5AcgALkNACEHGQAA4RQAIMEGAQAAAAH0BgIAAAAB9wYBAAAAAYQHAQAAAAG3BwEAAAAB4QcCAAAAAQIAAABMACBlAACLFwAgAwAAAEoAIGUAAIsXACBmAACPFwAgCQAAAEoAIBkAAOAUACBeAACPFwAgwQYBAO4MACH0BgIAhw0AIfcGAQDuDAAhhAcBAO4MACG3BwEAiA0AIeEHAgCHDQAhBxkAAOAUACDBBgEA7gwAIfQGAgCHDQAh9wYBAO4MACGEBwEA7gwAIbcHAQCIDQAh4QcCAIcNACE0EwAAjhMAIBQAAI8TACAVAACQEwAgFgAAkRMAIBcAAJITACAdAACUEwAgHgAAlRMAICEAAJMTACAiAACaEwAgLAAAlxMAIC4AAJgTACAvAACZEwAgMAAAphQAIDEAAJsTACAyAACcEwAgMwAAnRMAIDQAAJ4TACA1AACfEwAgNgAAoBMAIDcAAKETACA4AACiEwAgOQAAoxMAIDoAAKQTACA7AAClEwAgPAAAphMAID0AAKcTACBBAACoEwAgQgAAqRMAIEMAAKoTACDBBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAALAHAooHAQAAAAGkBwEAAAABpQcBAAAAAaYHAQAAAAGnBwEAAAABqAdAAAAAAaoHAAAAqgcDqwcBAAAAAawHAQAAAAGuBwAAAK4HArAHAQAAAAGxBwEAAAABsgdAAAAAAbMHQAAAAAG0BwEAAAABtQdAAAAAAbYHAQAAAAG3BwEAAAABuAdAAAAAAQIAAACSAQAgZQAAkBcAIAMAAAAvACBlAACQFwAgZgAAlBcAIDYAAAAvACATAADIEQAgFAAAyREAIBUAAMoRACAWAADLEQAgFwAAzBEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIF4AAJQXACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhNBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AITQTAACOEwAgFAAAjxMAIBUAAJATACAWAACREwAgFwAAkhMAIB0AAJQTACAeAACVEwAgIQAAkxMAICIAAJoTACArAACWEwAgLAAAlxMAIC4AAJgTACAvAACZEwAgMAAAphQAIDEAAJsTACAyAACcEwAgMwAAnRMAIDQAAJ4TACA1AACfEwAgNgAAoBMAIDcAAKETACA4AACiEwAgOQAAoxMAIDsAAKUTACA8AACmEwAgPQAApxMAIEEAAKgTACBCAACpEwAgQwAAqhMAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAAsAcCigcBAAAAAaQHAQAAAAGlBwEAAAABpgcBAAAAAacHAQAAAAGoB0AAAAABqgcAAACqBwOrBwEAAAABrAcBAAAAAa4HAAAArgcCsAcBAAAAAbEHAQAAAAGyB0AAAAABswdAAAAAAbQHAQAAAAG1B0AAAAABtgcBAAAAAbcHAQAAAAG4B0AAAAABAgAAAJIBACBlAACVFwAgAwAAAC8AIGUAAJUXACBmAACZFwAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAAmRcAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhNBMAAI4TACAUAACPEwAgFQAAkBMAIBYAAJETACAXAACSEwAgHQAAlBMAIB4AAJUTACAhAACTEwAgIgAAmhMAICsAAJYTACAsAACXEwAgLgAAmBMAIC8AAJkTACAwAACmFAAgMgAAnBMAIDMAAJ0TACA0AACeEwAgNQAAnxMAIDYAAKATACA3AAChEwAgOAAAohMAIDkAAKMTACA6AACkEwAgOwAApRMAIDwAAKYTACA9AACnEwAgQQAAqBMAIEIAAKkTACBDAACqEwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAACwBwKKBwEAAAABpAcBAAAAAaUHAQAAAAGmBwEAAAABpwcBAAAAAagHQAAAAAGqBwAAAKoHA6sHAQAAAAGsBwEAAAABrgcAAACuBwKwBwEAAAABsQcBAAAAAbIHQAAAAAGzB0AAAAABtAcBAAAAAbUHQAAAAAG2BwEAAAABtwcBAAAAAbgHQAAAAAECAAAAkgEAIGUAAJoXACAgBAAA1xAAIEcAAN4QACBNAADjEAAgTwAA4hAAIFAAANgQACBRAADZEAAgUgAA2hAAIFMAANwQACBUAADdEAAgVQAA3xAAIFYAAOAQACBXAADhEAAgwQYBAAAAAcoGAQAAAAHLBgEAAAABzAYBAAAAAdoGIAAAAAHbBgEAAAAB3AYBAAAAAd0GAQAAAAHeBgEAAAAB3wYBAAAAAeAGAgAAAAHhBgEAAAAB4gYBAAAAAeMGAQAAAAHkBgEAAAAB5QYBAAAAAeYGAQAAAAHnBgEAAAAB6AZAAAAAAekGQAAAAAECAAAA5gkAIGUAAJwXACADAAAARwAgZQAAnBcAIGYAAKAXACAiAAAARwAgBAAApA4AIEcAAKsOACBNAACwDgAgTwAArw4AIFAAAKUOACBRAACmDgAgUgAApw4AIFMAAKkOACBUAACqDgAgVQAArA4AIFYAAK0OACBXAACuDgAgXgAAoBcAIMEGAQDuDAAhygYBAIgNACHLBgEA7gwAIcwGAQDuDAAh2gYgALkNACHbBgEAiA0AIdwGAQCIDQAh3QYBAO4MACHeBgEA7gwAId8GAQCIDQAh4AYCAIcNACHhBgEA7gwAIeIGAQDuDAAh4wYBAO4MACHkBgEA7gwAIeUGAQDuDAAh5gYBAO4MACHnBgEA7gwAIegGQAD9DAAh6QZAAP0MACEgBAAApA4AIEcAAKsOACBNAACwDgAgTwAArw4AIFAAAKUOACBRAACmDgAgUgAApw4AIFMAAKkOACBUAACqDgAgVQAArA4AIFYAAK0OACBXAACuDgAgwQYBAO4MACHKBgEAiA0AIcsGAQDuDAAhzAYBAO4MACHaBiAAuQ0AIdsGAQCIDQAh3AYBAIgNACHdBgEA7gwAId4GAQDuDAAh3wYBAIgNACHgBgIAhw0AIeEGAQDuDAAh4gYBAO4MACHjBgEA7gwAIeQGAQDuDAAh5QYBAO4MACHmBgEA7gwAIecGAQDuDAAh6AZAAP0MACHpBkAA_QwAIQkaAADaFAAgHQAAsBAAIMEGAQAAAAH0BgIAAAABhAcBAAAAAYUHAQAAAAG3BwEAAAAB3wcBAAAAAeAHAgAAAAECAAAAUAAgZQAAoRcAIAMAAABOACBlAAChFwAgZgAApRcAIAsAAABOACAaAADZFAAgHQAAjxAAIF4AAKUXACDBBgEA7gwAIfQGAgCHDQAhhAcBAO4MACGFBwEA7gwAIbcHAQCIDQAh3wcBAO4MACHgBwIAzw4AIQkaAADZFAAgHQAAjxAAIMEGAQDuDAAh9AYCAIcNACGEBwEA7gwAIYUHAQDuDAAhtwcBAIgNACHfBwEA7gwAIeAHAgDPDgAhIAQAANcQACAXAADbEAAgRwAA3hAAIE0AAOMQACBPAADiEAAgUAAA2BAAIFEAANkQACBSAADaEAAgVAAA3RAAIFUAAN8QACBWAADgEAAgVwAA4RAAIMEGAQAAAAHKBgEAAAABywYBAAAAAcwGAQAAAAHaBiAAAAAB2wYBAAAAAdwGAQAAAAHdBgEAAAAB3gYBAAAAAd8GAQAAAAHgBgIAAAAB4QYBAAAAAeIGAQAAAAHjBgEAAAAB5AYBAAAAAeUGAQAAAAHmBgEAAAAB5wYBAAAAAegGQAAAAAHpBkAAAAABAgAAAOYJACBlAACmFwAgAwAAAEcAIGUAAKYXACBmAACqFwAgIgAAAEcAIAQAAKQOACAXAACoDgAgRwAAqw4AIE0AALAOACBPAACvDgAgUAAApQ4AIFEAAKYOACBSAACnDgAgVAAAqg4AIFUAAKwOACBWAACtDgAgVwAArg4AIF4AAKoXACDBBgEA7gwAIcoGAQCIDQAhywYBAO4MACHMBgEA7gwAIdoGIAC5DQAh2wYBAIgNACHcBgEAiA0AId0GAQDuDAAh3gYBAO4MACHfBgEAiA0AIeAGAgCHDQAh4QYBAO4MACHiBgEA7gwAIeMGAQDuDAAh5AYBAO4MACHlBgEA7gwAIeYGAQDuDAAh5wYBAO4MACHoBkAA_QwAIekGQAD9DAAhIAQAAKQOACAXAACoDgAgRwAAqw4AIE0AALAOACBPAACvDgAgUAAApQ4AIFEAAKYOACBSAACnDgAgVAAAqg4AIFUAAKwOACBWAACtDgAgVwAArg4AIMEGAQDuDAAhygYBAIgNACHLBgEA7gwAIcwGAQDuDAAh2gYgALkNACHbBgEAiA0AIdwGAQCIDQAh3QYBAO4MACHeBgEA7gwAId8GAQCIDQAh4AYCAIcNACHhBgEA7gwAIeIGAQDuDAAh4wYBAO4MACHkBgEA7gwAIeUGAQDuDAAh5gYBAO4MACHnBgEA7gwAIegGQAD9DAAh6QZAAP0MACEHDQEAAAABwQYBAAAAAZ8HAAAAnwcCoAcBAAAAAaEHAQAAAAGiBwEAAAABowcBAAAAAQjBBgEAAAAB6AZAAAAAAZQHAQAAAAGVB0AAAAABlwcBAAAAAZgHQAAAAAGZBwEAAAABmgcBAAAAAQXBBgEAAAABkwcAAACTBwKUBwEAAAABlQdAAAAAAZYHQAAAAAEBwgYBAAAAAQP3BgEAAAAB3QcBAAAAAd4HQAAAAAED1wcBAAAAAdsHAQAAAAHcB0AAAAABBekGQAAAAAHXBwEAAAAB2AcCAAAAAdkHAgAAAAHaByAAAAABA-gGQAAAAAG-BwAAAL4HAsQHAQAAAAEUwQYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAf0GAAAAywcClQdAAAAAAZ8HAAAAygcCvgcAAAC-BwLGBxAAAAABzAcAAADMBwPNBwEAAAABzgcBAAAAAc8HIAAAAAHQBwEAAAAB0QcBAAAAAdIHAQAAAAHTBwEAAAAB1AcBAAAAAdUHQAAAAAHWB0AAAAABCsEGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAH3BgEAAAAB-AYBAAAAAfkGAgAAAAH6BgEAAAAB-waAAAAAAf0GAAAA_QYCFsEGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAAsAcCigcBAAAAAaQHAQAAAAGlBwEAAAABpgcBAAAAAacHAQAAAAGoB0AAAAABqgcAAACqBwOrBwEAAAABrAcBAAAAAa4HAAAArgcCsAcBAAAAAbEHAQAAAAGyB0AAAAABswdAAAAAAbUHQAAAAAG2BwEAAAABtwcBAAAAAbgHQAAAAAEaCAAA9hUAIA4AAPcVACAPAAD4FQAgEAAA-RUAIBEAAPoVACAoAAD8FQAgRgAA_RUAIEcAAP4VACBIAAD_FQAgSQAAihYAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAYoHAQAAAAGnBwEAAAABqgcAAACqBwKsBwEAAAABuAdAAAAAAYIIAQAAAAGDCAEAAAABhAgBAAAAAYUIQAAAAAGGCCAAAAABhwgBAAAAAYgIAQAAAAGJCAEAAAABAgAAAB0AIGUAALYXACADAAAAGwAgZQAAthcAIGYAALoXACAcAAAAGwAgCAAArhUAIA4AAK8VACAPAACwFQAgEAAAsRUAIBEAALIVACAoAAC0FQAgRgAAtRUAIEcAALYVACBIAAC3FQAgSQAAiBYAIF4AALoXACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACGKBwEA7gwAIacHAQDuDAAhqgcAAKwVqgcirAcBAO4MACG4B0AAlQ0AIYIIAQDuDAAhgwgBAIgNACGECAEAiA0AIYUIQAD9DAAhhgggALkNACGHCAEAiA0AIYgIAQCIDQAhiQgBAIgNACEaCAAArhUAIA4AAK8VACAPAACwFQAgEAAAsRUAIBEAALIVACAoAAC0FQAgRgAAtRUAIEcAALYVACBIAAC3FQAgSQAAiBYAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIYoHAQDuDAAhpwcBAO4MACGqBwAArBWqByKsBwEA7gwAIbgHQACVDQAhgggBAO4MACGDCAEAiA0AIYQIAQCIDQAhhQhAAP0MACGGCCAAuQ0AIYcIAQCIDQAhiAgBAIgNACGJCAEAiA0AIQTBBgEAAAAB6AZAAAAAAe0GAQAAAAHlBwEAAAABIAQAANcQACAXAADbEAAgRwAA3hAAIE0AAOMQACBPAADiEAAgUAAA2BAAIFEAANkQACBTAADcEAAgVAAA3RAAIFUAAN8QACBWAADgEAAgVwAA4RAAIMEGAQAAAAHKBgEAAAABywYBAAAAAcwGAQAAAAHaBiAAAAAB2wYBAAAAAdwGAQAAAAHdBgEAAAAB3gYBAAAAAd8GAQAAAAHgBgIAAAAB4QYBAAAAAeIGAQAAAAHjBgEAAAAB5AYBAAAAAeUGAQAAAAHmBgEAAAAB5wYBAAAAAegGQAAAAAHpBkAAAAABAgAAAOYJACBlAAC8FwAgAwAAAEcAIGUAALwXACBmAADAFwAgIgAAAEcAIAQAAKQOACAXAACoDgAgRwAAqw4AIE0AALAOACBPAACvDgAgUAAApQ4AIFEAAKYOACBTAACpDgAgVAAAqg4AIFUAAKwOACBWAACtDgAgVwAArg4AIF4AAMAXACDBBgEA7gwAIcoGAQCIDQAhywYBAO4MACHMBgEA7gwAIdoGIAC5DQAh2wYBAIgNACHcBgEAiA0AId0GAQDuDAAh3gYBAO4MACHfBgEAiA0AIeAGAgCHDQAh4QYBAO4MACHiBgEA7gwAIeMGAQDuDAAh5AYBAO4MACHlBgEA7gwAIeYGAQDuDAAh5wYBAO4MACHoBkAA_QwAIekGQAD9DAAhIAQAAKQOACAXAACoDgAgRwAAqw4AIE0AALAOACBPAACvDgAgUAAApQ4AIFEAAKYOACBTAACpDgAgVAAAqg4AIFUAAKwOACBWAACtDgAgVwAArg4AIMEGAQDuDAAhygYBAIgNACHLBgEA7gwAIcwGAQDuDAAh2gYgALkNACHbBgEAiA0AIdwGAQCIDQAh3QYBAO4MACHeBgEA7gwAId8GAQCIDQAh4AYCAIcNACHhBgEA7gwAIeIGAQDuDAAh4wYBAO4MACHkBgEA7gwAIeUGAQDuDAAh5gYBAO4MACHnBgEA7gwAIegGQAD9DAAh6QZAAP0MACELwQYBAAAAAcIGAQAAAAHoBkAAAAAB6QZAAAAAAYQHAQAAAAG3BwEAAAABuAdAAAAAAbkHAQAAAAHiBwEAAAAB4wcBAAAAAeQHIAAAAAERAwAA8xIAIBgAALUQACAgAAC2EAAgIgAAuBAAICkAALkQACDBBgEAAAABwgYBAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAYQHAQAAAAG3BwEAAAABuAdAAAAAAbkHAQAAAAHiBwEAAAAB4wcBAAAAAeQHIAAAAAECAAAAlgEAIGUAAMIXACADAAAAZAAgZQAAwhcAIGYAAMYXACATAAAAZAAgAwAA8RIAIBgAAM0PACAgAADODwAgIgAA0A8AICkAANEPACBeAADGFwAgwQYBAO4MACHCBgEAiA0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIYQHAQDuDAAhtwcBAIgNACG4B0AAlQ0AIbkHAQCIDQAh4gcBAO4MACHjBwEAiA0AIeQHIAC5DQAhEQMAAPESACAYAADNDwAgIAAAzg8AICIAANAPACApAADRDwAgwQYBAO4MACHCBgEAiA0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIYQHAQDuDAAhtwcBAIgNACG4B0AAlQ0AIbkHAQCIDQAh4gcBAO4MACHjBwEAiA0AIeQHIAC5DQAhA_YGAQAAAAH3BgEAAAAB3gdAAAAAAQkaAADaFAAgHgAAsRAAIMEGAQAAAAH0BgIAAAABhAcBAAAAAYUHAQAAAAG3BwEAAAAB3wcBAAAAAeAHAgAAAAECAAAAUAAgZQAAyBcAIAMAAABOACBlAADIFwAgZgAAzBcAIAsAAABOACAaAADZFAAgHgAAkBAAIF4AAMwXACDBBgEA7gwAIfQGAgCHDQAhhAcBAO4MACGFBwEA7gwAIbcHAQCIDQAh3wcBAO4MACHgBwIAzw4AIQkaAADZFAAgHgAAkBAAIMEGAQDuDAAh9AYCAIcNACGEBwEA7gwAIYUHAQDuDAAhtwcBAIgNACHfBwEA7gwAIeAHAgDPDgAhA_YGAQAAAAHXBwEAAAAB3AdAAAAAAQq0BgEAAAABwQYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAfcGAQAAAAGKBwEAAAABnwcAAADKBwLGBxAAAAABzgcBAAAAARTBBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB9gYBAAAAAf0GAAAAywcClQdAAAAAAZ8HAAAAygcCvgcAAAC-BwLGBxAAAAABzAcAAADMBwPNBwEAAAABzgcBAAAAAc8HIAAAAAHQBwEAAAAB0QcBAAAAAdIHAQAAAAHUBwEAAAAB1QdAAAAAAdYHQAAAAAEOBQAA3A8AIBgAAOcNACAZAADmDQAgtAYBAAAAAcEGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAH1BgEAAAAB9wYBAAAAAYoHAQAAAAGfBwAAAMoHAsYHEAAAAAHOBwEAAAABAgAAAGkAIGUAANAXACADAAAAZwAgZQAA0BcAIGYAANQXACAQAAAAZwAgBQAA2g8AIBgAALwNACAZAAC7DQAgXgAA1BcAILQGAQCIDQAhwQYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIfcGAQCIDQAhigcBAO4MACGfBwAAtw3KByLGBxAAuA0AIc4HAQDuDAAhDgUAANoPACAYAAC8DQAgGQAAuw0AILQGAQCIDQAhwQYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIfcGAQCIDQAhigcBAO4MACGfBwAAtw3KByLGBxAAuA0AIc4HAQDuDAAhFMEGAQAAAAHoBkAAAAAB6QZAAAAAAe0GAQAAAAH2BgEAAAAB_QYAAADLBwKVB0AAAAABnwcAAADKBwK-BwAAAL4HAsYHEAAAAAHMBwAAAMwHA80HAQAAAAHOBwEAAAABzwcgAAAAAdAHAQAAAAHRBwEAAAAB0gcBAAAAAdMHAQAAAAHVB0AAAAAB1gdAAAAAARoHAADgDQAgEgAA4Q0AICMAAMASACAkAADiDQAgJQAA4w0AIMEGAQAAAAHoBkAAAAAB6QZAAAAAAe0GAQAAAAH2BgEAAAAB_QYAAADLBwKVB0AAAAABnwcAAADKBwK-BwAAAL4HAsYHEAAAAAHMBwAAAMwHA80HAQAAAAHOBwEAAAABzwcgAAAAAdAHAQAAAAHRBwEAAAAB0gcBAAAAAdMHAQAAAAHUBwEAAAAB1QdAAAAAAdYHQAAAAAECAAAAcAAgZQAA1hcAIAMAAABuACBlAADWFwAgZgAA2hcAIBwAAABuACAHAADMDQAgEgAAzQ0AICMAAL4SACAkAADODQAgJQAAzw0AIF4AANoXACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACHtBgEAiA0AIfYGAQCIDQAh_QYAAMgNywcilQdAAJUNACGfBwAAtw3KByK-BwAAyQ2-ByLGBxAAuA0AIcwHAADKDcwHI80HAQCIDQAhzgcBAO4MACHPByAAuQ0AIdAHAQCIDQAh0QcBAIgNACHSBwEAiA0AIdMHAQCIDQAh1AcBAIgNACHVB0AAlQ0AIdYHQACVDQAhGgcAAMwNACASAADNDQAgIwAAvhIAICQAAM4NACAlAADPDQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh7QYBAIgNACH2BgEAiA0AIf0GAADIDcsHIpUHQACVDQAhnwcAALcNygcivgcAAMkNvgcixgcQALgNACHMBwAAyg3MByPNBwEAiA0AIc4HAQDuDAAhzwcgALkNACHQBwEAiA0AIdEHAQCIDQAh0gcBAIgNACHTBwEAiA0AIdQHAQCIDQAh1QdAAJUNACHWB0AAlQ0AIQbBBgEAAAAB6AZAAAAAAcUHAQAAAAHGBxAAAAABxwcBAAAAAcgHAQAAAAEJwQYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAe4GAQAAAAHvBgEAAAABhAcBAAAAAbkHAQAAAAG6B0AAAAABB8EGAQAAAAHCBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAABhAcBAAAAAYUHAQAAAAEIwQYBAAAAAcIGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAHuBgEAAAAB7wYBAAAAAYQHAQAAAAEPwQYBAAAAAcIGAQAAAAHKBgEAAAABywYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAe0GAQAAAAHuBgEAAAAB7wYBAAAAAfAGAQAAAAHxBgEAAAAB8gYBAAAAAfMGAQAAAAH0BgIAAAABBsEGAQAAAAHCBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAABigcBAAAAAQYNAQAAAAHBBgEAAAAB6AZAAAAAAekGQAAAAAGKBwEAAAABiwcBAAAAAQjBBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAABhgcBAAAAAYcHAQAAAAGIBwEAAAABiQcQAAAAAQMAAAAvACBlAACaFwAgZgAA5RcAIDYAAAAvACATAADIEQAgFAAAyREAIBUAAMoRACAWAADLEQAgFwAAzBEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIF4AAOUXACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhNBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AITQUAACPEwAgFQAAkBMAIBYAAJETACAXAACSEwAgHQAAlBMAIB4AAJUTACAhAACTEwAgIgAAmhMAICsAAJYTACAsAACXEwAgLgAAmBMAIC8AAJkTACAwAACmFAAgMQAAmxMAIDIAAJwTACAzAACdEwAgNAAAnhMAIDUAAJ8TACA2AACgEwAgNwAAoRMAIDgAAKITACA5AACjEwAgOgAApBMAIDsAAKUTACA8AACmEwAgPQAApxMAIEEAAKgTACBCAACpEwAgQwAAqhMAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAAsAcCigcBAAAAAaQHAQAAAAGlBwEAAAABpgcBAAAAAacHAQAAAAGoB0AAAAABqgcAAACqBwOrBwEAAAABrAcBAAAAAa4HAAAArgcCsAcBAAAAAbEHAQAAAAGyB0AAAAABswdAAAAAAbQHAQAAAAG1B0AAAAABtgcBAAAAAbcHAQAAAAG4B0AAAAABAgAAAJIBACBlAADmFwAgAwAAAC8AIGUAAOYXACBmAADqFwAgNgAAAC8AIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAA6hcAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0FAAAyREAIBUAAMoRACAWAADLEQAgFwAAzBEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhNBMAAI4TACAVAACQEwAgFgAAkRMAIBcAAJITACAdAACUEwAgHgAAlRMAICEAAJMTACAiAACaEwAgKwAAlhMAICwAAJcTACAuAACYEwAgLwAAmRMAIDAAAKYUACAxAACbEwAgMgAAnBMAIDMAAJ0TACA0AACeEwAgNQAAnxMAIDYAAKATACA3AAChEwAgOAAAohMAIDkAAKMTACA6AACkEwAgOwAApRMAIDwAAKYTACA9AACnEwAgQQAAqBMAIEIAAKkTACBDAACqEwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAACwBwKKBwEAAAABpAcBAAAAAaUHAQAAAAGmBwEAAAABpwcBAAAAAagHQAAAAAGqBwAAAKoHA6sHAQAAAAGsBwEAAAABrgcAAACuBwKwBwEAAAABsQcBAAAAAbIHQAAAAAGzB0AAAAABtAcBAAAAAbUHQAAAAAG2BwEAAAABtwcBAAAAAbgHQAAAAAECAAAAkgEAIGUAAOsXACADAAAALwAgZQAA6xcAIGYAAO8XACA2AAAALwAgEwAAyBEAIBUAAMoRACAWAADLEQAgFwAAzBEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACBeAADvFwAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AITQTAADIEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAjhMAIBQAAI8TACAWAACREwAgFwAAkhMAIB0AAJQTACAeAACVEwAgIQAAkxMAICIAAJoTACArAACWEwAgLAAAlxMAIC4AAJgTACAvAACZEwAgMAAAphQAIDEAAJsTACAyAACcEwAgMwAAnRMAIDQAAJ4TACA1AACfEwAgNgAAoBMAIDcAAKETACA4AACiEwAgOQAAoxMAIDoAAKQTACA7AAClEwAgPAAAphMAID0AAKcTACBBAACoEwAgQgAAqRMAIEMAAKoTACDBBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAALAHAooHAQAAAAGkBwEAAAABpQcBAAAAAaYHAQAAAAGnBwEAAAABqAdAAAAAAaoHAAAAqgcDqwcBAAAAAawHAQAAAAGuBwAAAK4HArAHAQAAAAGxBwEAAAABsgdAAAAAAbMHQAAAAAG0BwEAAAABtQdAAAAAAbYHAQAAAAG3BwEAAAABuAdAAAAAAQIAAACSAQAgZQAA8BcAIAMAAAAvACBlAADwFwAgZgAA9BcAIDYAAAAvACATAADIEQAgFAAAyREAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIF4AAPQXACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhNBMAAMgRACAUAADJEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AITQTAACOEwAgFAAAjxMAIBUAAJATACAXAACSEwAgHQAAlBMAIB4AAJUTACAhAACTEwAgIgAAmhMAICsAAJYTACAsAACXEwAgLgAAmBMAIC8AAJkTACAwAACmFAAgMQAAmxMAIDIAAJwTACAzAACdEwAgNAAAnhMAIDUAAJ8TACA2AACgEwAgNwAAoRMAIDgAAKITACA5AACjEwAgOgAApBMAIDsAAKUTACA8AACmEwAgPQAApxMAIEEAAKgTACBCAACpEwAgQwAAqhMAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAAsAcCigcBAAAAAaQHAQAAAAGlBwEAAAABpgcBAAAAAacHAQAAAAGoB0AAAAABqgcAAACqBwOrBwEAAAABrAcBAAAAAa4HAAAArgcCsAcBAAAAAbEHAQAAAAGyB0AAAAABswdAAAAAAbQHAQAAAAG1B0AAAAABtgcBAAAAAbcHAQAAAAG4B0AAAAABAgAAAJIBACBlAAD1FwAgAwAAAC8AIGUAAPUXACBmAAD5FwAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAA-RcAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFwAAzBEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhIAQAANcQACAXAADbEAAgRwAA3hAAIE0AAOMQACBPAADiEAAgUAAA2BAAIFEAANkQACBSAADaEAAgUwAA3BAAIFUAAN8QACBWAADgEAAgVwAA4RAAIMEGAQAAAAHKBgEAAAABywYBAAAAAcwGAQAAAAHaBiAAAAAB2wYBAAAAAdwGAQAAAAHdBgEAAAAB3gYBAAAAAd8GAQAAAAHgBgIAAAAB4QYBAAAAAeIGAQAAAAHjBgEAAAAB5AYBAAAAAeUGAQAAAAHmBgEAAAAB5wYBAAAAAegGQAAAAAHpBkAAAAABAgAAAOYJACBlAAD6FwAgAwAAAEcAIGUAAPoXACBmAAD-FwAgIgAAAEcAIAQAAKQOACAXAACoDgAgRwAAqw4AIE0AALAOACBPAACvDgAgUAAApQ4AIFEAAKYOACBSAACnDgAgUwAAqQ4AIFUAAKwOACBWAACtDgAgVwAArg4AIF4AAP4XACDBBgEA7gwAIcoGAQCIDQAhywYBAO4MACHMBgEA7gwAIdoGIAC5DQAh2wYBAIgNACHcBgEAiA0AId0GAQDuDAAh3gYBAO4MACHfBgEAiA0AIeAGAgCHDQAh4QYBAO4MACHiBgEA7gwAIeMGAQDuDAAh5AYBAO4MACHlBgEA7gwAIeYGAQDuDAAh5wYBAO4MACHoBkAA_QwAIekGQAD9DAAhIAQAAKQOACAXAACoDgAgRwAAqw4AIE0AALAOACBPAACvDgAgUAAApQ4AIFEAAKYOACBSAACnDgAgUwAAqQ4AIFUAAKwOACBWAACtDgAgVwAArg4AIMEGAQDuDAAhygYBAIgNACHLBgEA7gwAIcwGAQDuDAAh2gYgALkNACHbBgEAiA0AIdwGAQCIDQAh3QYBAO4MACHeBgEA7gwAId8GAQCIDQAh4AYCAIcNACHhBgEA7gwAIeIGAQDuDAAh4wYBAO4MACHkBgEA7gwAIeUGAQDuDAAh5gYBAO4MACHnBgEA7gwAIegGQAD9DAAh6QZAAP0MACE0EwAAjhMAIBQAAI8TACAVAACQEwAgFgAAkRMAIBcAAJITACAdAACUEwAgHgAAlRMAICEAAJMTACAiAACaEwAgKwAAlhMAICwAAJcTACAuAACYEwAgLwAAmRMAIDAAAKYUACAxAACbEwAgMgAAnBMAIDMAAJ0TACA0AACeEwAgNQAAnxMAIDYAAKATACA3AAChEwAgOAAAohMAIDkAAKMTACA6AACkEwAgOwAApRMAIDwAAKYTACA9AACnEwAgQQAAqBMAIEMAAKoTACDBBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAALAHAooHAQAAAAGkBwEAAAABpQcBAAAAAaYHAQAAAAGnBwEAAAABqAdAAAAAAaoHAAAAqgcDqwcBAAAAAawHAQAAAAGuBwAAAK4HArAHAQAAAAGxBwEAAAABsgdAAAAAAbMHQAAAAAG0BwEAAAABtQdAAAAAAbYHAQAAAAG3BwEAAAABuAdAAAAAAQIAAACSAQAgZQAA_xcAIAjBBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB9QYBAAAAAYYHAQAAAAGHBwEAAAABiQcQAAAAAQMAAAAvACBlAAD_FwAgZgAAhBgAIDYAAAAvACATAADIEQAgFAAAyREAIBUAAMoRACAWAADLEQAgFwAAzBEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQwAA5REAIF4AAIQYACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhNBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBDAADlEQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AIQkDAACiEQAgGAAApA8AIMEGAQAAAAHCBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAYoHAQAAAAECAAAAuAEAIGUAAIUYACADAAAAtgEAIGUAAIUYACBmAACJGAAgCwAAALYBACADAAChEQAgGAAAjg8AIF4AAIkYACDBBgEA7gwAIcIGAQDuDAAh2gYgALkNACHoBkAA_QwAIekGQAD9DAAh9QYBAIgNACGKBwEA7gwAIQkDAAChEQAgGAAAjg8AIMEGAQDuDAAhwgYBAO4MACHaBiAAuQ0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIYoHAQDuDAAhIAQAANcQACAXAADbEAAgRwAA3hAAIE0AAOMQACBPAADiEAAgUAAA2BAAIFEAANkQACBSAADaEAAgUwAA3BAAIFQAAN0QACBVAADfEAAgVwAA4RAAIMEGAQAAAAHKBgEAAAABywYBAAAAAcwGAQAAAAHaBiAAAAAB2wYBAAAAAdwGAQAAAAHdBgEAAAAB3gYBAAAAAd8GAQAAAAHgBgIAAAAB4QYBAAAAAeIGAQAAAAHjBgEAAAAB5AYBAAAAAeUGAQAAAAHmBgEAAAAB5wYBAAAAAegGQAAAAAHpBkAAAAABAgAAAOYJACBlAACKGAAgAwAAAEcAIGUAAIoYACBmAACOGAAgIgAAAEcAIAQAAKQOACAXAACoDgAgRwAAqw4AIE0AALAOACBPAACvDgAgUAAApQ4AIFEAAKYOACBSAACnDgAgUwAAqQ4AIFQAAKoOACBVAACsDgAgVwAArg4AIF4AAI4YACDBBgEA7gwAIcoGAQCIDQAhywYBAO4MACHMBgEA7gwAIdoGIAC5DQAh2wYBAIgNACHcBgEAiA0AId0GAQDuDAAh3gYBAO4MACHfBgEAiA0AIeAGAgCHDQAh4QYBAO4MACHiBgEA7gwAIeMGAQDuDAAh5AYBAO4MACHlBgEA7gwAIeYGAQDuDAAh5wYBAO4MACHoBkAA_QwAIekGQAD9DAAhIAQAAKQOACAXAACoDgAgRwAAqw4AIE0AALAOACBPAACvDgAgUAAApQ4AIFEAAKYOACBSAACnDgAgUwAAqQ4AIFQAAKoOACBVAACsDgAgVwAArg4AIMEGAQDuDAAhygYBAIgNACHLBgEA7gwAIcwGAQDuDAAh2gYgALkNACHbBgEAiA0AIdwGAQCIDQAh3QYBAO4MACHeBgEA7gwAId8GAQCIDQAh4AYCAIcNACHhBgEA7gwAIeIGAQDuDAAh4wYBAO4MACHkBgEA7gwAIeUGAQDuDAAh5gYBAO4MACHnBgEA7gwAIegGQAD9DAAh6QZAAP0MACEgBAAA1xAAIBcAANsQACBHAADeEAAgTQAA4xAAIE8AAOIQACBQAADYEAAgUQAA2RAAIFIAANoQACBTAADcEAAgVAAA3RAAIFYAAOAQACBXAADhEAAgwQYBAAAAAcoGAQAAAAHLBgEAAAABzAYBAAAAAdoGIAAAAAHbBgEAAAAB3AYBAAAAAd0GAQAAAAHeBgEAAAAB3wYBAAAAAeAGAgAAAAHhBgEAAAAB4gYBAAAAAeMGAQAAAAHkBgEAAAAB5QYBAAAAAeYGAQAAAAHnBgEAAAAB6AZAAAAAAekGQAAAAAECAAAA5gkAIGUAAI8YACADAAAARwAgZQAAjxgAIGYAAJMYACAiAAAARwAgBAAApA4AIBcAAKgOACBHAACrDgAgTQAAsA4AIE8AAK8OACBQAAClDgAgUQAApg4AIFIAAKcOACBTAACpDgAgVAAAqg4AIFYAAK0OACBXAACuDgAgXgAAkxgAIMEGAQDuDAAhygYBAIgNACHLBgEA7gwAIcwGAQDuDAAh2gYgALkNACHbBgEAiA0AIdwGAQCIDQAh3QYBAO4MACHeBgEA7gwAId8GAQCIDQAh4AYCAIcNACHhBgEA7gwAIeIGAQDuDAAh4wYBAO4MACHkBgEA7gwAIeUGAQDuDAAh5gYBAO4MACHnBgEA7gwAIegGQAD9DAAh6QZAAP0MACEgBAAApA4AIBcAAKgOACBHAACrDgAgTQAAsA4AIE8AAK8OACBQAAClDgAgUQAApg4AIFIAAKcOACBTAACpDgAgVAAAqg4AIFYAAK0OACBXAACuDgAgwQYBAO4MACHKBgEAiA0AIcsGAQDuDAAhzAYBAO4MACHaBiAAuQ0AIdsGAQCIDQAh3AYBAIgNACHdBgEA7gwAId4GAQDuDAAh3wYBAIgNACHgBgIAhw0AIeEGAQDuDAAh4gYBAO4MACHjBgEA7gwAIeQGAQDuDAAh5QYBAO4MACHmBgEA7gwAIecGAQDuDAAh6AZAAP0MACHpBkAA_QwAISAEAADXEAAgFwAA2xAAIE0AAOMQACBPAADiEAAgUAAA2BAAIFEAANkQACBSAADaEAAgUwAA3BAAIFQAAN0QACBVAADfEAAgVgAA4BAAIFcAAOEQACDBBgEAAAABygYBAAAAAcsGAQAAAAHMBgEAAAAB2gYgAAAAAdsGAQAAAAHcBgEAAAAB3QYBAAAAAd4GAQAAAAHfBgEAAAAB4AYCAAAAAeEGAQAAAAHiBgEAAAAB4wYBAAAAAeQGAQAAAAHlBgEAAAAB5gYBAAAAAecGAQAAAAHoBkAAAAAB6QZAAAAAAQIAAADmCQAgZQAAlBgAIAMAAABHACBlAACUGAAgZgAAmBgAICIAAABHACAEAACkDgAgFwAAqA4AIE0AALAOACBPAACvDgAgUAAApQ4AIFEAAKYOACBSAACnDgAgUwAAqQ4AIFQAAKoOACBVAACsDgAgVgAArQ4AIFcAAK4OACBeAACYGAAgwQYBAO4MACHKBgEAiA0AIcsGAQDuDAAhzAYBAO4MACHaBiAAuQ0AIdsGAQCIDQAh3AYBAIgNACHdBgEA7gwAId4GAQDuDAAh3wYBAIgNACHgBgIAhw0AIeEGAQDuDAAh4gYBAO4MACHjBgEA7gwAIeQGAQDuDAAh5QYBAO4MACHmBgEA7gwAIecGAQDuDAAh6AZAAP0MACHpBkAA_QwAISAEAACkDgAgFwAAqA4AIE0AALAOACBPAACvDgAgUAAApQ4AIFEAAKYOACBSAACnDgAgUwAAqQ4AIFQAAKoOACBVAACsDgAgVgAArQ4AIFcAAK4OACDBBgEA7gwAIcoGAQCIDQAhywYBAO4MACHMBgEA7gwAIdoGIAC5DQAh2wYBAIgNACHcBgEAiA0AId0GAQDuDAAh3gYBAO4MACHfBgEAiA0AIeAGAgCHDQAh4QYBAO4MACHiBgEA7gwAIeMGAQDuDAAh5AYBAO4MACHlBgEA7gwAIeYGAQDuDAAh5wYBAO4MACHoBkAA_QwAIekGQAD9DAAhBMEGAQAAAAHMBgEAAAABzQYBAAAAAc4GAQAAAAELLQEAAAABwQYBAAAAAcMGAQAAAAHEBgEAAAABxQZAAAAAAcYGQAAAAAHHBkAAAAAByAZAAAAAAckGAQAAAAHKBgEAAAABywYBAAAAATQTAACOEwAgFAAAjxMAIBUAAJATACAWAACREwAgFwAAkhMAIB0AAJQTACAeAACVEwAgIQAAkxMAICIAAJoTACArAACWEwAgLAAAlxMAIC4AAJgTACAvAACZEwAgMAAAphQAIDEAAJsTACAyAACcEwAgNAAAnhMAIDUAAJ8TACA2AACgEwAgNwAAoRMAIDgAAKITACA5AACjEwAgOgAApBMAIDsAAKUTACA8AACmEwAgPQAApxMAIEEAAKgTACBCAACpEwAgQwAAqhMAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAAsAcCigcBAAAAAaQHAQAAAAGlBwEAAAABpgcBAAAAAacHAQAAAAGoB0AAAAABqgcAAACqBwOrBwEAAAABrAcBAAAAAa4HAAAArgcCsAcBAAAAAbEHAQAAAAGyB0AAAAABswdAAAAAAbQHAQAAAAG1B0AAAAABtgcBAAAAAbcHAQAAAAG4B0AAAAABAgAAAJIBACBlAACbGAAgNBMAAI4TACAUAACPEwAgFQAAkBMAIBYAAJETACAXAACSEwAgHQAAlBMAIB4AAJUTACAhAACTEwAgIgAAmhMAICsAAJYTACAsAACXEwAgLgAAmBMAIC8AAJkTACAwAACmFAAgMQAAmxMAIDIAAJwTACAzAACdEwAgNAAAnhMAIDYAAKATACA3AAChEwAgOAAAohMAIDkAAKMTACA6AACkEwAgOwAApRMAIDwAAKYTACA9AACnEwAgQQAAqBMAIEIAAKkTACBDAACqEwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAACwBwKKBwEAAAABpAcBAAAAAaUHAQAAAAGmBwEAAAABpwcBAAAAAagHQAAAAAGqBwAAAKoHA6sHAQAAAAGsBwEAAAABrgcAAACuBwKwBwEAAAABsQcBAAAAAbIHQAAAAAGzB0AAAAABtAcBAAAAAbUHQAAAAAG2BwEAAAABtwcBAAAAAbgHQAAAAAECAAAAkgEAIGUAAJ0YACA0EwAAjhMAIBQAAI8TACAVAACQEwAgFgAAkRMAIBcAAJITACAeAACVEwAgIQAAkxMAICIAAJoTACArAACWEwAgLAAAlxMAIC4AAJgTACAvAACZEwAgMAAAphQAIDEAAJsTACAyAACcEwAgMwAAnRMAIDQAAJ4TACA1AACfEwAgNgAAoBMAIDcAAKETACA4AACiEwAgOQAAoxMAIDoAAKQTACA7AAClEwAgPAAAphMAID0AAKcTACBBAACoEwAgQgAAqRMAIEMAAKoTACDBBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAALAHAooHAQAAAAGkBwEAAAABpQcBAAAAAaYHAQAAAAGnBwEAAAABqAdAAAAAAaoHAAAAqgcDqwcBAAAAAawHAQAAAAGuBwAAAK4HArAHAQAAAAGxBwEAAAABsgdAAAAAAbMHQAAAAAG0BwEAAAABtQdAAAAAAbYHAQAAAAG3BwEAAAABuAdAAAAAAQIAAACSAQAgZQAAnxgAIAMAAAAvACBlAACdGAAgZgAAoxgAIDYAAAAvACATAADIEQAgFAAAyREAIBUAAMoRACAWAADLEQAgFwAAzBEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIF4AAKMYACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhNBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AIQMAAAAvACBlAACfGAAgZgAAphgAIDYAAAAvACATAADIEQAgFAAAyREAIBUAAMoRACAWAADLEQAgFwAAzBEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIF4AAKYYACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhNBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AIQP2BgEAAAAB2wcBAAAAAdwHQAAAAAE0EwAAjhMAIBQAAI8TACAVAACQEwAgFgAAkRMAIBcAAJITACAdAACUEwAgIQAAkxMAICIAAJoTACArAACWEwAgLAAAlxMAIC4AAJgTACAvAACZEwAgMAAAphQAIDEAAJsTACAyAACcEwAgMwAAnRMAIDQAAJ4TACA1AACfEwAgNgAAoBMAIDcAAKETACA4AACiEwAgOQAAoxMAIDoAAKQTACA7AAClEwAgPAAAphMAID0AAKcTACBBAACoEwAgQgAAqRMAIEMAAKoTACDBBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAALAHAooHAQAAAAGkBwEAAAABpQcBAAAAAaYHAQAAAAGnBwEAAAABqAdAAAAAAaoHAAAAqgcDqwcBAAAAAawHAQAAAAGuBwAAAK4HArAHAQAAAAGxBwEAAAABsgdAAAAAAbMHQAAAAAG0BwEAAAABtQdAAAAAAbYHAQAAAAG3BwEAAAABuAdAAAAAAQIAAACSAQAgZQAAqBgAIAMAAAAvACBlAACoGAAgZgAArBgAIDYAAAAvACATAADIEQAgFAAAyREAIBUAAMoRACAWAADLEQAgFwAAzBEAIB0AAM4RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIF4AAKwYACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhNBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AIQXpBkAAAAAB9gYBAAAAAdgHAgAAAAHZBwIAAAAB2gcgAAAAAQbBBgEAAAAB9AYCAAAAAYQHAQAAAAGFBwEAAAABtwcBAAAAAeAHAgAAAAEFwQYBAAAAAfQGAgAAAAGEBwEAAAABtwcBAAAAAeEHAgAAAAE0EwAAjhMAIBQAAI8TACAVAACQEwAgFgAAkRMAIBcAAJITACAdAACUEwAgHgAAlRMAICEAAJMTACAiAACaEwAgKwAAlhMAICwAAJcTACAuAACYEwAgLwAAmRMAIDAAAKYUACAxAACbEwAgMgAAnBMAIDMAAJ0TACA1AACfEwAgNgAAoBMAIDcAAKETACA4AACiEwAgOQAAoxMAIDoAAKQTACA7AAClEwAgPAAAphMAID0AAKcTACBBAACoEwAgQgAAqRMAIEMAAKoTACDBBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAALAHAooHAQAAAAGkBwEAAAABpQcBAAAAAaYHAQAAAAGnBwEAAAABqAdAAAAAAaoHAAAAqgcDqwcBAAAAAawHAQAAAAGuBwAAAK4HArAHAQAAAAGxBwEAAAABsgdAAAAAAbMHQAAAAAG0BwEAAAABtQdAAAAAAbYHAQAAAAG3BwEAAAABuAdAAAAAAQIAAACSAQAgZQAAsBgAIDQTAACOEwAgFAAAjxMAIBUAAJATACAWAACREwAgFwAAkhMAIB0AAJQTACAeAACVEwAgIgAAmhMAICsAAJYTACAsAACXEwAgLgAAmBMAIC8AAJkTACAwAACmFAAgMQAAmxMAIDIAAJwTACAzAACdEwAgNAAAnhMAIDUAAJ8TACA2AACgEwAgNwAAoRMAIDgAAKITACA5AACjEwAgOgAApBMAIDsAAKUTACA8AACmEwAgPQAApxMAIEEAAKgTACBCAACpEwAgQwAAqhMAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAAsAcCigcBAAAAAaQHAQAAAAGlBwEAAAABpgcBAAAAAacHAQAAAAGoB0AAAAABqgcAAACqBwOrBwEAAAABrAcBAAAAAa4HAAAArgcCsAcBAAAAAbEHAQAAAAGyB0AAAAABswdAAAAAAbQHAQAAAAG1B0AAAAABtgcBAAAAAbcHAQAAAAG4B0AAAAABAgAAAJIBACBlAACyGAAgAwAAAC8AIGUAALAYACBmAAC2GAAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAAthgAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhAwAAAC8AIGUAALIYACBmAAC5GAAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAAuRgAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhA_YGAQAAAAHdBwEAAAAB3gdAAAAAASAEAADXEAAgFwAA2xAAIEcAAN4QACBNAADjEAAgTwAA4hAAIFAAANgQACBRAADZEAAgUgAA2hAAIFMAANwQACBUAADdEAAgVQAA3xAAIFYAAOAQACDBBgEAAAABygYBAAAAAcsGAQAAAAHMBgEAAAAB2gYgAAAAAdsGAQAAAAHcBgEAAAAB3QYBAAAAAd4GAQAAAAHfBgEAAAAB4AYCAAAAAeEGAQAAAAHiBgEAAAAB4wYBAAAAAeQGAQAAAAHlBgEAAAAB5gYBAAAAAecGAQAAAAHoBkAAAAAB6QZAAAAAAQIAAADmCQAgZQAAuxgAIAMAAABHACBlAAC7GAAgZgAAvxgAICIAAABHACAEAACkDgAgFwAAqA4AIEcAAKsOACBNAACwDgAgTwAArw4AIFAAAKUOACBRAACmDgAgUgAApw4AIFMAAKkOACBUAACqDgAgVQAArA4AIFYAAK0OACBeAAC_GAAgwQYBAO4MACHKBgEAiA0AIcsGAQDuDAAhzAYBAO4MACHaBiAAuQ0AIdsGAQCIDQAh3AYBAIgNACHdBgEA7gwAId4GAQDuDAAh3wYBAIgNACHgBgIAhw0AIeEGAQDuDAAh4gYBAO4MACHjBgEA7gwAIeQGAQDuDAAh5QYBAO4MACHmBgEA7gwAIecGAQDuDAAh6AZAAP0MACHpBkAA_QwAISAEAACkDgAgFwAAqA4AIEcAAKsOACBNAACwDgAgTwAArw4AIFAAAKUOACBRAACmDgAgUgAApw4AIFMAAKkOACBUAACqDgAgVQAArA4AIFYAAK0OACDBBgEA7gwAIcoGAQCIDQAhywYBAO4MACHMBgEA7gwAIdoGIAC5DQAh2wYBAIgNACHcBgEAiA0AId0GAQDuDAAh3gYBAO4MACHfBgEAiA0AIeAGAgCHDQAh4QYBAO4MACHiBgEA7gwAIeMGAQDuDAAh5AYBAO4MACHlBgEA7gwAIeYGAQDuDAAh5wYBAO4MACHoBkAA_QwAIekGQAD9DAAhCsEGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAH2BgEAAAAB-AYBAAAAAfkGAgAAAAH6BgEAAAAB-waAAAAAAf0GAAAA_QYCEAMAAPUNACAtAQAAAAFPAAD5DQAgUAAA9w0AIFgAAPYNACDBBgEAAAABwgYBAAAAAcMGAQAAAAHEBgEAAAABxQZAAAAAAcYGQAAAAAHHBkAAAAAByAZAAAAAAckGAQAAAAHKBgEAAAABywYBAAAAAQIAAAAFACBlAADBGAAgAwAAAAMAIGUAAMEYACBmAADFGAAgEgAAAAMAIAMAAJYNACAtAQCIDQAhTwAAmg0AIFAAAJgNACBYAACXDQAgXgAAxRgAIMEGAQDuDAAhwgYBAO4MACHDBgEA7gwAIcQGAQDuDAAhxQZAAJUNACHGBkAAlQ0AIccGQACVDQAhyAZAAJUNACHJBgEAiA0AIcoGAQCIDQAhywYBAIgNACEQAwAAlg0AIC0BAIgNACFPAACaDQAgUAAAmA0AIFgAAJcNACDBBgEA7gwAIcIGAQDuDAAhwwYBAO4MACHEBgEA7gwAIcUGQACVDQAhxgZAAJUNACHHBkAAlQ0AIcgGQACVDQAhyQYBAIgNACHKBgEAiA0AIcsGAQCIDQAhCrQGAQAAAAHBBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAYoHAQAAAAGfBwAAAMoHAsYHEAAAAAHOBwEAAAABAwAAAC8AIGUAAJsYACBmAADJGAAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAAyRgAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhC8EGAQAAAAHoBkAAAAAB6QZAAAAAAfUGAQAAAAGEBwEAAAABtwcBAAAAAbgHQAAAAAG5BwEAAAAB4gcBAAAAAeMHAQAAAAHkByAAAAABNBMAAI4TACAUAACPEwAgFQAAkBMAIBYAAJETACAdAACUEwAgHgAAlRMAICEAAJMTACAiAACaEwAgKwAAlhMAICwAAJcTACAuAACYEwAgLwAAmRMAIDAAAKYUACAxAACbEwAgMgAAnBMAIDMAAJ0TACA0AACeEwAgNQAAnxMAIDYAAKATACA3AAChEwAgOAAAohMAIDkAAKMTACA6AACkEwAgOwAApRMAIDwAAKYTACA9AACnEwAgQQAAqBMAIEIAAKkTACBDAACqEwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAACwBwKKBwEAAAABpAcBAAAAAaUHAQAAAAGmBwEAAAABpwcBAAAAAagHQAAAAAGqBwAAAKoHA6sHAQAAAAGsBwEAAAABrgcAAACuBwKwBwEAAAABsQcBAAAAAbIHQAAAAAGzB0AAAAABtAcBAAAAAbUHQAAAAAG2BwEAAAABtwcBAAAAAbgHQAAAAAECAAAAkgEAIGUAAMsYACADAAAALwAgZQAAyxgAIGYAAM8YACA2AAAALwAgEwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACBeAADPGAAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AITQTAADIEQAgFAAAyREAIBUAAMoRACAWAADLEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACEB9gYBAAAAATQTAACOEwAgFAAAjxMAIBUAAJATACAWAACREwAgFwAAkhMAIB0AAJQTACAeAACVEwAgIQAAkxMAICIAAJoTACArAACWEwAgLgAAmBMAIC8AAJkTACAwAACmFAAgMQAAmxMAIDIAAJwTACAzAACdEwAgNAAAnhMAIDUAAJ8TACA2AACgEwAgNwAAoRMAIDgAAKITACA5AACjEwAgOgAApBMAIDsAAKUTACA8AACmEwAgPQAApxMAIEEAAKgTACBCAACpEwAgQwAAqhMAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAAsAcCigcBAAAAAaQHAQAAAAGlBwEAAAABpgcBAAAAAacHAQAAAAGoB0AAAAABqgcAAACqBwOrBwEAAAABrAcBAAAAAa4HAAAArgcCsAcBAAAAAbEHAQAAAAGyB0AAAAABswdAAAAAAbQHAQAAAAG1B0AAAAABtgcBAAAAAbcHAQAAAAG4B0AAAAABAgAAAJIBACBlAADRGAAgAwAAAC8AIGUAANEYACBmAADVGAAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAA1RgAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhA-gGQAAAAAHpBkAAAAAB9gYBAAAAATQTAACOEwAgFAAAjxMAIBUAAJATACAWAACREwAgFwAAkhMAIB0AAJQTACAeAACVEwAgIQAAkxMAICIAAJoTACArAACWEwAgLAAAlxMAIC4AAJgTACAvAACZEwAgMAAAphQAIDEAAJsTACAyAACcEwAgMwAAnRMAIDQAAJ4TACA1AACfEwAgNgAAoBMAIDcAAKETACA4AACiEwAgOQAAoxMAIDoAAKQTACA7AAClEwAgPAAAphMAID0AAKcTACBCAACpEwAgQwAAqhMAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAAsAcCigcBAAAAAaQHAQAAAAGlBwEAAAABpgcBAAAAAacHAQAAAAGoB0AAAAABqgcAAACqBwOrBwEAAAABrAcBAAAAAa4HAAAArgcCsAcBAAAAAbEHAQAAAAGyB0AAAAABswdAAAAAAbQHAQAAAAG1B0AAAAABtgcBAAAAAbcHAQAAAAG4B0AAAAABAgAAAJIBACBlAADXGAAgNBMAAI4TACAUAACPEwAgFQAAkBMAIBYAAJETACAXAACSEwAgHQAAlBMAIB4AAJUTACAhAACTEwAgIgAAmhMAICsAAJYTACAsAACXEwAgLgAAmBMAIC8AAJkTACAwAACmFAAgMQAAmxMAIDIAAJwTACAzAACdEwAgNAAAnhMAIDUAAJ8TACA2AACgEwAgNwAAoRMAIDgAAKITACA5AACjEwAgOgAApBMAIDsAAKUTACA8AACmEwAgPQAApxMAIEEAAKgTACBCAACpEwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAACwBwKKBwEAAAABpAcBAAAAAaUHAQAAAAGmBwEAAAABpwcBAAAAAagHQAAAAAGqBwAAAKoHA6sHAQAAAAGsBwEAAAABrgcAAACuBwKwBwEAAAABsQcBAAAAAbIHQAAAAAGzB0AAAAABtAcBAAAAAbUHQAAAAAG2BwEAAAABtwcBAAAAAbgHQAAAAAECAAAAkgEAIGUAANkYACAIDQEAAAABGAAAnBEAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAfUGAQAAAAGKBwEAAAABiwcBAAAAAQIAAADIAQAgZQAA2xgAIBoIAAD2FQAgDgAA9xUAIA8AAPgVACAQAAD5FQAgEQAA-hUAICgAAPwVACBFAAD7FQAgRwAA_hUAIEgAAP8VACBJAACKFgAgwQYBAAAAAegGQAAAAAHpBkAAAAABigcBAAAAAacHAQAAAAGqBwAAAKoHAqwHAQAAAAG4B0AAAAABgggBAAAAAYMIAQAAAAGECAEAAAABhQhAAAAAAYYIIAAAAAGHCAEAAAABiAgBAAAAAYkIAQAAAAECAAAAHQAgZQAA3RgAIAMAAAAvACBlAADZGAAgZgAA4RgAIDYAAAAvACATAADIEQAgFAAAyREAIBUAAMoRACAWAADLEQAgFwAAzBEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIF4AAOEYACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhNBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AIQMAAADAAQAgZQAA2xgAIGYAAOQYACAKAAAAwAEAIA0BAO4MACEYAACREQAgXgAA5BgAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIfUGAQCIDQAhigcBAO4MACGLBwEAiA0AIQgNAQDuDAAhGAAAkREAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIfUGAQCIDQAhigcBAO4MACGLBwEAiA0AIQMAAAAbACBlAADdGAAgZgAA5xgAIBwAAAAbACAIAACuFQAgDgAArxUAIA8AALAVACAQAACxFQAgEQAAshUAICgAALQVACBFAACzFQAgRwAAthUAIEgAALcVACBJAACIFgAgXgAA5xgAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIYoHAQDuDAAhpwcBAO4MACGqBwAArBWqByKsBwEA7gwAIbgHQACVDQAhgggBAO4MACGDCAEAiA0AIYQIAQCIDQAhhQhAAP0MACGGCCAAuQ0AIYcIAQCIDQAhiAgBAIgNACGJCAEAiA0AIRoIAACuFQAgDgAArxUAIA8AALAVACAQAACxFQAgEQAAshUAICgAALQVACBFAACzFQAgRwAAthUAIEgAALcVACBJAACIFgAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAhigcBAO4MACGnBwEA7gwAIaoHAACsFaoHIqwHAQDuDAAhuAdAAJUNACGCCAEA7gwAIYMIAQCIDQAhhAgBAIgNACGFCEAA_QwAIYYIIAC5DQAhhwgBAIgNACGICAEAiA0AIYkIAQCIDQAhCMEGAQAAAAHoBkAAAAAB6QZAAAAAAe0GAQAAAAH1BgEAAAABhgcBAAAAAYgHAQAAAAGJBxAAAAABAwAAAC8AIGUAANcYACBmAADrGAAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEIAAOQRACBDAADlEQAgXgAA6xgAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhBsEGAQAAAAHaBiAAAAAB6AZAAAAAAekGQAAAAAH1BgEAAAABigcBAAAAATQTAACOEwAgFAAAjxMAIBUAAJATACAWAACREwAgFwAAkhMAIB0AAJQTACAeAACVEwAgIQAAkxMAICIAAJoTACArAACWEwAgLAAAlxMAIC4AAJgTACAvAACZEwAgMAAAphQAIDEAAJsTACAyAACcEwAgMwAAnRMAIDQAAJ4TACA1AACfEwAgNgAAoBMAIDcAAKETACA4AACiEwAgOQAAoxMAIDoAAKQTACA7AAClEwAgPAAAphMAIEEAAKgTACBCAACpEwAgQwAAqhMAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAAsAcCigcBAAAAAaQHAQAAAAGlBwEAAAABpgcBAAAAAacHAQAAAAGoB0AAAAABqgcAAACqBwOrBwEAAAABrAcBAAAAAa4HAAAArgcCsAcBAAAAAbEHAQAAAAGyB0AAAAABswdAAAAAAbQHAQAAAAG1B0AAAAABtgcBAAAAAbcHAQAAAAG4B0AAAAABAgAAAJIBACBlAADtGAAgGggAAPYVACAOAAD3FQAgDwAA-BUAIBAAAPkVACARAAD6FQAgKAAA_BUAIEUAAPsVACBGAAD9FQAgSAAA_xUAIEkAAIoWACDBBgEAAAAB6AZAAAAAAekGQAAAAAGKBwEAAAABpwcBAAAAAaoHAAAAqgcCrAcBAAAAAbgHQAAAAAGCCAEAAAABgwgBAAAAAYQIAQAAAAGFCEAAAAABhgggAAAAAYcIAQAAAAGICAEAAAABiQgBAAAAAQIAAAAdACBlAADvGAAgAwAAAC8AIGUAAO0YACBmAADzGAAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDsAAOARACA8AADhEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAA8xgAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhAwAAABsAIGUAAO8YACBmAAD2GAAgHAAAABsAIAgAAK4VACAOAACvFQAgDwAAsBUAIBAAALEVACARAACyFQAgKAAAtBUAIEUAALMVACBGAAC1FQAgSAAAtxUAIEkAAIgWACBeAAD2GAAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAhigcBAO4MACGnBwEA7gwAIaoHAACsFaoHIqwHAQDuDAAhuAdAAJUNACGCCAEA7gwAIYMIAQCIDQAhhAgBAIgNACGFCEAA_QwAIYYIIAC5DQAhhwgBAIgNACGICAEAiA0AIYkIAQCIDQAhGggAAK4VACAOAACvFQAgDwAAsBUAIBAAALEVACARAACyFQAgKAAAtBUAIEUAALMVACBGAAC1FQAgSAAAtxUAIEkAAIgWACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACGKBwEA7gwAIacHAQDuDAAhqgcAAKwVqgcirAcBAO4MACG4B0AAlQ0AIYIIAQDuDAAhgwgBAIgNACGECAEAiA0AIYUIQAD9DAAhhgggALkNACGHCAEAiA0AIYgIAQCIDQAhiQgBAIgNACEPwQYBAAAAAcoGAQAAAAHLBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAe4GAQAAAAHvBgEAAAAB8AYBAAAAAfEGAQAAAAHyBgEAAAAB8wYBAAAAAfQGAgAAAAH1BgEAAAABNBMAAI4TACAUAACPEwAgFQAAkBMAIBYAAJETACAXAACSEwAgHQAAlBMAIB4AAJUTACAhAACTEwAgIgAAmhMAICsAAJYTACAsAACXEwAgLgAAmBMAIC8AAJkTACAwAACmFAAgMQAAmxMAIDIAAJwTACAzAACdEwAgNAAAnhMAIDUAAJ8TACA2AACgEwAgNwAAoRMAIDgAAKITACA5AACjEwAgOgAApBMAIDsAAKUTACA9AACnEwAgQQAAqBMAIEIAAKkTACBDAACqEwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAACwBwKKBwEAAAABpAcBAAAAAaUHAQAAAAGmBwEAAAABpwcBAAAAAagHQAAAAAGqBwAAAKoHA6sHAQAAAAGsBwEAAAABrgcAAACuBwKwBwEAAAABsQcBAAAAAbIHQAAAAAGzB0AAAAABtAcBAAAAAbUHQAAAAAG2BwEAAAABtwcBAAAAAbgHQAAAAAECAAAAkgEAIGUAAPgYACADAAAALwAgZQAA-BgAIGYAAPwYACA2AAAALwAgEwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACBeAAD8GAAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AITQTAADIEQAgFAAAyREAIBUAAMoRACAWAADLEQAgFwAAzBEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACEIwQYBAAAAAdoGIAAAAAHoBkAAAAAB6QZAAAAAAe4GAQAAAAHvBgEAAAAB9QYBAAAAAYQHAQAAAAE0EwAAjhMAIBQAAI8TACAVAACQEwAgFgAAkRMAIBcAAJITACAdAACUEwAgHgAAlRMAICEAAJMTACAiAACaEwAgKwAAlhMAICwAAJcTACAuAACYEwAgLwAAmRMAIDAAAKYUACAxAACbEwAgMgAAnBMAIDMAAJ0TACA0AACeEwAgNQAAnxMAIDYAAKATACA3AAChEwAgOAAAohMAIDkAAKMTACA6AACkEwAgPAAAphMAID0AAKcTACBBAACoEwAgQgAAqRMAIEMAAKoTACDBBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAALAHAooHAQAAAAGkBwEAAAABpQcBAAAAAaYHAQAAAAGnBwEAAAABqAdAAAAAAaoHAAAAqgcDqwcBAAAAAawHAQAAAAGuBwAAAK4HArAHAQAAAAGxBwEAAAABsgdAAAAAAbMHQAAAAAG0BwEAAAABtQdAAAAAAbYHAQAAAAG3BwEAAAABuAdAAAAAAQIAAACSAQAgZQAA_hgAIAMAAAAvACBlAAD-GAAgZgAAghkAIDYAAAAvACATAADIEQAgFAAAyREAIBUAAMoRACAWAADLEQAgFwAAzBEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIF4AAIIZACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhNBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDgAAN0RACA5AADeEQAgOgAA3xEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AIQfBBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAYQHAQAAAAGFBwEAAAABEQMAAPMSACAYAAC1EAAgIAAAthAAICEAALcQACApAAC5EAAgwQYBAAAAAcIGAQAAAAHoBkAAAAAB6QZAAAAAAfUGAQAAAAGEBwEAAAABtwcBAAAAAbgHQAAAAAG5BwEAAAAB4gcBAAAAAeMHAQAAAAHkByAAAAABAgAAAJYBACBlAACEGQAgNBMAAI4TACAUAACPEwAgFQAAkBMAIBYAAJETACAXAACSEwAgHQAAlBMAIB4AAJUTACAhAACTEwAgKwAAlhMAICwAAJcTACAuAACYEwAgLwAAmRMAIDAAAKYUACAxAACbEwAgMgAAnBMAIDMAAJ0TACA0AACeEwAgNQAAnxMAIDYAAKATACA3AAChEwAgOAAAohMAIDkAAKMTACA6AACkEwAgOwAApRMAIDwAAKYTACA9AACnEwAgQQAAqBMAIEIAAKkTACBDAACqEwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAACwBwKKBwEAAAABpAcBAAAAAaUHAQAAAAGmBwEAAAABpwcBAAAAAagHQAAAAAGqBwAAAKoHA6sHAQAAAAGsBwEAAAABrgcAAACuBwKwBwEAAAABsQcBAAAAAbIHQAAAAAGzB0AAAAABtAcBAAAAAbUHQAAAAAG2BwEAAAABtwcBAAAAAbgHQAAAAAECAAAAkgEAIGUAAIYZACADAAAAZAAgZQAAhBkAIGYAAIoZACATAAAAZAAgAwAA8RIAIBgAAM0PACAgAADODwAgIQAAzw8AICkAANEPACBeAACKGQAgwQYBAO4MACHCBgEAiA0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIYQHAQDuDAAhtwcBAIgNACG4B0AAlQ0AIbkHAQCIDQAh4gcBAO4MACHjBwEAiA0AIeQHIAC5DQAhEQMAAPESACAYAADNDwAgIAAAzg8AICEAAM8PACApAADRDwAgwQYBAO4MACHCBgEAiA0AIegGQAD9DAAh6QZAAP0MACH1BgEAiA0AIYQHAQDuDAAhtwcBAIgNACG4B0AAlQ0AIbkHAQCIDQAh4gcBAO4MACHjBwEAiA0AIeQHIAC5DQAhAwAAAC8AIGUAAIYZACBmAACNGQAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAAjRkAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhCsEGAQAAAAHoBkAAAAAB6QZAAAAAAfYGAQAAAAH3BgEAAAAB-AYBAAAAAfkGAgAAAAH6BgEAAAAB-waAAAAAAf0GAAAA_QYCBrQGAQAAAAHBBgEAAAAB6AZAAAAAAekGQAAAAAH2BgEAAAABiggBAAAAAQQFAACODQAgBgAAjw0AILQGAQAAAAG1BgEAAAABAgAAAA8AIGUAAJAZACADAAAADQAgZQAAkBkAIGYAAJQZACAGAAAADQAgBQAA7wwAIAYAAPAMACBeAACUGQAgtAYBAO4MACG1BgEA7gwAIQQFAADvDAAgBgAA8AwAILQGAQDuDAAhtQYBAO4MACEHtAYBAAAAAbUGAQAAAAHBBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB_QYAAADyBwIgFwAA2xAAIEcAAN4QACBNAADjEAAgTwAA4hAAIFAAANgQACBRAADZEAAgUgAA2hAAIFMAANwQACBUAADdEAAgVQAA3xAAIFYAAOAQACBXAADhEAAgwQYBAAAAAcoGAQAAAAHLBgEAAAABzAYBAAAAAdoGIAAAAAHbBgEAAAAB3AYBAAAAAd0GAQAAAAHeBgEAAAAB3wYBAAAAAeAGAgAAAAHhBgEAAAAB4gYBAAAAAeMGAQAAAAHkBgEAAAAB5QYBAAAAAeYGAQAAAAHnBgEAAAAB6AZAAAAAAekGQAAAAAECAAAA5gkAIGUAAJYZACADAAAARwAgZQAAlhkAIGYAAJoZACAiAAAARwAgFwAAqA4AIEcAAKsOACBNAACwDgAgTwAArw4AIFAAAKUOACBRAACmDgAgUgAApw4AIFMAAKkOACBUAACqDgAgVQAArA4AIFYAAK0OACBXAACuDgAgXgAAmhkAIMEGAQDuDAAhygYBAIgNACHLBgEA7gwAIcwGAQDuDAAh2gYgALkNACHbBgEAiA0AIdwGAQCIDQAh3QYBAO4MACHeBgEA7gwAId8GAQCIDQAh4AYCAIcNACHhBgEA7gwAIeIGAQDuDAAh4wYBAO4MACHkBgEA7gwAIeUGAQDuDAAh5gYBAO4MACHnBgEA7gwAIegGQAD9DAAh6QZAAP0MACEgFwAAqA4AIEcAAKsOACBNAACwDgAgTwAArw4AIFAAAKUOACBRAACmDgAgUgAApw4AIFMAAKkOACBUAACqDgAgVQAArA4AIFYAAK0OACBXAACuDgAgwQYBAO4MACHKBgEAiA0AIcsGAQDuDAAhzAYBAO4MACHaBiAAuQ0AIdsGAQCIDQAh3AYBAIgNACHdBgEA7gwAId4GAQDuDAAh3wYBAIgNACHgBgIAhw0AIeEGAQDuDAAh4gYBAO4MACHjBgEA7gwAIeQGAQDuDAAh5QYBAO4MACHmBgEA7gwAIecGAQDuDAAh6AZAAP0MACHpBkAA_QwAISAEAADXEAAgFwAA2xAAIEcAAN4QACBNAADjEAAgTwAA4hAAIFEAANkQACBSAADaEAAgUwAA3BAAIFQAAN0QACBVAADfEAAgVgAA4BAAIFcAAOEQACDBBgEAAAABygYBAAAAAcsGAQAAAAHMBgEAAAAB2gYgAAAAAdsGAQAAAAHcBgEAAAAB3QYBAAAAAd4GAQAAAAHfBgEAAAAB4AYCAAAAAeEGAQAAAAHiBgEAAAAB4wYBAAAAAeQGAQAAAAHlBgEAAAAB5gYBAAAAAecGAQAAAAHoBkAAAAAB6QZAAAAAAQIAAADmCQAgZQAAmxkAIAG0BgEAAAABEAMAAPUNACApAAD4DQAgLQEAAAABUAAA9w0AIFgAAPYNACDBBgEAAAABwgYBAAAAAcMGAQAAAAHEBgEAAAABxQZAAAAAAcYGQAAAAAHHBkAAAAAByAZAAAAAAckGAQAAAAHKBgEAAAABywYBAAAAAQIAAAAFACBlAACeGQAgAwAAAAMAIGUAAJ4ZACBmAACiGQAgEgAAAAMAIAMAAJYNACApAACZDQAgLQEAiA0AIVAAAJgNACBYAACXDQAgXgAAohkAIMEGAQDuDAAhwgYBAO4MACHDBgEA7gwAIcQGAQDuDAAhxQZAAJUNACHGBkAAlQ0AIccGQACVDQAhyAZAAJUNACHJBgEAiA0AIcoGAQCIDQAhywYBAIgNACEQAwAAlg0AICkAAJkNACAtAQCIDQAhUAAAmA0AIFgAAJcNACDBBgEA7gwAIcIGAQDuDAAhwwYBAO4MACHEBgEA7gwAIcUGQACVDQAhxgZAAJUNACHHBkAAlQ0AIcgGQACVDQAhyQYBAIgNACHKBgEAiA0AIcsGAQCIDQAhBrQGAQAAAAHBBgEAAAABwgYBAAAAAegGQAAAAAHpBkAAAAAB9gYBAAAAAQMAAABHACBlAACbGQAgZgAAphkAICIAAABHACAEAACkDgAgFwAAqA4AIEcAAKsOACBNAACwDgAgTwAArw4AIFEAAKYOACBSAACnDgAgUwAAqQ4AIFQAAKoOACBVAACsDgAgVgAArQ4AIFcAAK4OACBeAACmGQAgwQYBAO4MACHKBgEAiA0AIcsGAQDuDAAhzAYBAO4MACHaBiAAuQ0AIdsGAQCIDQAh3AYBAIgNACHdBgEA7gwAId4GAQDuDAAh3wYBAIgNACHgBgIAhw0AIeEGAQDuDAAh4gYBAO4MACHjBgEA7gwAIeQGAQDuDAAh5QYBAO4MACHmBgEA7gwAIecGAQDuDAAh6AZAAP0MACHpBkAA_QwAISAEAACkDgAgFwAAqA4AIEcAAKsOACBNAACwDgAgTwAArw4AIFEAAKYOACBSAACnDgAgUwAAqQ4AIFQAAKoOACBVAACsDgAgVgAArQ4AIFcAAK4OACDBBgEA7gwAIcoGAQCIDQAhywYBAO4MACHMBgEA7gwAIdoGIAC5DQAh2wYBAIgNACHcBgEAiA0AId0GAQDuDAAh3gYBAO4MACHfBgEAiA0AIeAGAgCHDQAh4QYBAO4MACHiBgEA7gwAIeMGAQDuDAAh5AYBAO4MACHlBgEA7gwAIeYGAQDuDAAh5wYBAO4MACHoBkAA_QwAIekGQAD9DAAhAsEGAQAAAAGKBwEAAAABAgAAAAEAIGUAAKcZACAgBAAA1xAAIBcAANsQACBHAADeEAAgTQAA4xAAIE8AAOIQACBQAADYEAAgUgAA2hAAIFMAANwQACBUAADdEAAgVQAA3xAAIFYAAOAQACBXAADhEAAgwQYBAAAAAcoGAQAAAAHLBgEAAAABzAYBAAAAAdoGIAAAAAHbBgEAAAAB3AYBAAAAAd0GAQAAAAHeBgEAAAAB3wYBAAAAAeAGAgAAAAHhBgEAAAAB4gYBAAAAAeMGAQAAAAHkBgEAAAAB5QYBAAAAAeYGAQAAAAHnBgEAAAAB6AZAAAAAAekGQAAAAAECAAAA5gkAIGUAAKkZACABtQYBAAAAATQTAACOEwAgFAAAjxMAIBUAAJATACAWAACREwAgFwAAkhMAIB0AAJQTACAeAACVEwAgIQAAkxMAICIAAJoTACArAACWEwAgLAAAlxMAIC4AAJgTACAvAACZEwAgMAAAphQAIDEAAJsTACAyAACcEwAgMwAAnRMAIDQAAJ4TACA1AACfEwAgNwAAoRMAIDgAAKITACA5AACjEwAgOgAApBMAIDsAAKUTACA8AACmEwAgPQAApxMAIEEAAKgTACBCAACpEwAgQwAAqhMAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAAsAcCigcBAAAAAaQHAQAAAAGlBwEAAAABpgcBAAAAAacHAQAAAAGoB0AAAAABqgcAAACqBwOrBwEAAAABrAcBAAAAAa4HAAAArgcCsAcBAAAAAbEHAQAAAAGyB0AAAAABswdAAAAAAbQHAQAAAAG1B0AAAAABtgcBAAAAAbcHAQAAAAG4B0AAAAABAgAAAJIBACBlAACsGQAgEQMAAPMSACAYAAC1EAAgIAAAthAAICEAALcQACAiAAC4EAAgwQYBAAAAAcIGAQAAAAHoBkAAAAAB6QZAAAAAAfUGAQAAAAGEBwEAAAABtwcBAAAAAbgHQAAAAAG5BwEAAAAB4gcBAAAAAeMHAQAAAAHkByAAAAABAgAAAJYBACBlAACuGQAgNBMAAI4TACAUAACPEwAgFQAAkBMAIBYAAJETACAXAACSEwAgHQAAlBMAIB4AAJUTACAhAACTEwAgIgAAmhMAICsAAJYTACAsAACXEwAgLgAAmBMAIC8AAJkTACAwAACmFAAgMQAAmxMAIDIAAJwTACAzAACdEwAgNAAAnhMAIDUAAJ8TACA2AACgEwAgNwAAoRMAIDkAAKMTACA6AACkEwAgOwAApRMAIDwAAKYTACA9AACnEwAgQQAAqBMAIEIAAKkTACBDAACqEwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAACwBwKKBwEAAAABpAcBAAAAAaUHAQAAAAGmBwEAAAABpwcBAAAAAagHQAAAAAGqBwAAAKoHA6sHAQAAAAGsBwEAAAABrgcAAACuBwKwBwEAAAABsQcBAAAAAbIHQAAAAAGzB0AAAAABtAcBAAAAAbUHQAAAAAG2BwEAAAABtwcBAAAAAbgHQAAAAAECAAAAkgEAIGUAALAZACA0EwAAjhMAIBQAAI8TACAVAACQEwAgFgAAkRMAIBcAAJITACAdAACUEwAgHgAAlRMAICEAAJMTACAiAACaEwAgKwAAlhMAICwAAJcTACAuAACYEwAgLwAAmRMAIDAAAKYUACAxAACbEwAgMgAAnBMAIDMAAJ0TACA0AACeEwAgNQAAnxMAIDYAAKATACA4AACiEwAgOQAAoxMAIDoAAKQTACA7AAClEwAgPAAAphMAID0AAKcTACBBAACoEwAgQgAAqRMAIEMAAKoTACDBBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAALAHAooHAQAAAAGkBwEAAAABpQcBAAAAAaYHAQAAAAGnBwEAAAABqAdAAAAAAaoHAAAAqgcDqwcBAAAAAawHAQAAAAGuBwAAAK4HArAHAQAAAAGxBwEAAAABsgdAAAAAAbMHQAAAAAG0BwEAAAABtQdAAAAAAbYHAQAAAAG3BwEAAAABuAdAAAAAAQIAAACSAQAgZQAAshkAIDQTAACOEwAgFAAAjxMAIBUAAJATACAWAACREwAgFwAAkhMAIB0AAJQTACAeAACVEwAgIQAAkxMAICIAAJoTACArAACWEwAgLAAAlxMAIC4AAJgTACAwAACmFAAgMQAAmxMAIDIAAJwTACAzAACdEwAgNAAAnhMAIDUAAJ8TACA2AACgEwAgNwAAoRMAIDgAAKITACA5AACjEwAgOgAApBMAIDsAAKUTACA8AACmEwAgPQAApxMAIEEAAKgTACBCAACpEwAgQwAAqhMAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAf0GAAAAsAcCigcBAAAAAaQHAQAAAAGlBwEAAAABpgcBAAAAAacHAQAAAAGoB0AAAAABqgcAAACqBwOrBwEAAAABrAcBAAAAAa4HAAAArgcCsAcBAAAAAbEHAQAAAAGyB0AAAAABswdAAAAAAbQHAQAAAAG1B0AAAAABtgcBAAAAAbcHAQAAAAG4B0AAAAABAgAAAJIBACBlAAC0GQAgGggAAPYVACAOAAD3FQAgDwAA-BUAIBAAAPkVACARAAD6FQAgRQAA-xUAIEYAAP0VACBHAAD-FQAgSAAA_xUAIEkAAIoWACDBBgEAAAAB6AZAAAAAAekGQAAAAAGKBwEAAAABpwcBAAAAAaoHAAAAqgcCrAcBAAAAAbgHQAAAAAGCCAEAAAABgwgBAAAAAYQIAQAAAAGFCEAAAAABhgggAAAAAYcIAQAAAAGICAEAAAABiQgBAAAAAQIAAAAdACBlAAC2GQAgNBMAAI4TACAUAACPEwAgFQAAkBMAIBYAAJETACAXAACSEwAgHQAAlBMAIB4AAJUTACAhAACTEwAgIgAAmhMAICsAAJYTACAsAACXEwAgLgAAmBMAIC8AAJkTACAwAACmFAAgMQAAmxMAIDIAAJwTACAzAACdEwAgNAAAnhMAIDUAAJ8TACA2AACgEwAgNwAAoRMAIDgAAKITACA6AACkEwAgOwAApRMAIDwAAKYTACA9AACnEwAgQQAAqBMAIEIAAKkTACBDAACqEwAgwQYBAAAAAegGQAAAAAHpBkAAAAAB_QYAAACwBwKKBwEAAAABpAcBAAAAAaUHAQAAAAGmBwEAAAABpwcBAAAAAagHQAAAAAGqBwAAAKoHA6sHAQAAAAGsBwEAAAABrgcAAACuBwKwBwEAAAABsQcBAAAAAbIHQAAAAAGzB0AAAAABtAcBAAAAAbUHQAAAAAG2BwEAAAABtwcBAAAAAbgHQAAAAAECAAAAkgEAIGUAALgZACADAAAALwAgZQAAuBkAIGYAALwZACA2AAAALwAgEwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACBeAAC8GQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAh_QYAAMcRsAciigcBAIgNACGkBwEA7gwAIaUHAQCIDQAhpgcBAIgNACGnBwEAiA0AIagHQACVDQAhqgcAAMURqgcjqwcBAIgNACGsBwEAiA0AIa4HAADGEa4HIrAHAQCIDQAhsQcBAIgNACGyB0AAlQ0AIbMHQACVDQAhtAcBAIgNACG1B0AAlQ0AIbYHAQCIDQAhtwcBAIgNACG4B0AAlQ0AITQTAADIEQAgFAAAyREAIBUAAMoRACAWAADLEQAgFwAAzBEAIB0AAM4RACAeAADPEQAgIQAAzREAICIAANQRACArAADQEQAgLAAA0REAIC4AANIRACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOgAA3xEAIDsAAOARACA8AADhEQAgPQAA4hEAIEEAAOMRACBCAADkEQAgQwAA5REAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACEGwQYBAAAAAegGQAAAAAH1BgEAAAABxgcQAAAAAccHAQAAAAHIBwEAAAABAwAAAC8AIGUAALAZACBmAADAGQAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgNwAA3BEAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAAwBkAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhAwAAAC8AIGUAALIZACBmAADDGQAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA2AADbEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAAwxkAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhAwAAAC8AIGUAALQZACBmAADGGQAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAAxhkAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhAwAAABsAIGUAALYZACBmAADJGQAgHAAAABsAIAgAAK4VACAOAACvFQAgDwAAsBUAIBAAALEVACARAACyFQAgRQAAsxUAIEYAALUVACBHAAC2FQAgSAAAtxUAIEkAAIgWACBeAADJGQAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAhigcBAO4MACGnBwEA7gwAIaoHAACsFaoHIqwHAQDuDAAhuAdAAJUNACGCCAEA7gwAIYMIAQCIDQAhhAgBAIgNACGFCEAA_QwAIYYIIAC5DQAhhwgBAIgNACGICAEAiA0AIYkIAQCIDQAhGggAAK4VACAOAACvFQAgDwAAsBUAIBAAALEVACARAACyFQAgRQAAsxUAIEYAALUVACBHAAC2FQAgSAAAtxUAIEkAAIgWACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACGKBwEA7gwAIacHAQDuDAAhqgcAAKwVqgcirAcBAO4MACG4B0AAlQ0AIYIIAQDuDAAhgwgBAIgNACGECAEAiA0AIYUIQAD9DAAhhgggALkNACGHCAEAiA0AIYgIAQCIDQAhiQgBAIgNACEUwQYBAAAAAegGQAAAAAHpBkAAAAAB7QYBAAAAAfYGAQAAAAH9BgAAAMsHApUHQAAAAAGfBwAAAMoHAr4HAAAAvgcCxgcQAAAAAcwHAAAAzAcDzgcBAAAAAc8HIAAAAAHQBwEAAAAB0QcBAAAAAdIHAQAAAAHTBwEAAAAB1AcBAAAAAdUHQAAAAAHWB0AAAAABAwAAAC8AIGUAAKwZACBmAADNGQAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLgAA0hEAIC8AANMRACAwAADVEQAgMQAA1hEAIDIAANcRACAzAADYEQAgNAAA2REAIDUAANoRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAAzRkAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAuAADSEQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhAwAAAGQAIGUAAK4ZACBmAADQGQAgEwAAAGQAIAMAAPESACAYAADNDwAgIAAAzg8AICEAAM8PACAiAADQDwAgXgAA0BkAIMEGAQDuDAAhwgYBAIgNACHoBkAA_QwAIekGQAD9DAAh9QYBAIgNACGEBwEA7gwAIbcHAQCIDQAhuAdAAJUNACG5BwEAiA0AIeIHAQDuDAAh4wcBAIgNACHkByAAuQ0AIREDAADxEgAgGAAAzQ8AICAAAM4PACAhAADPDwAgIgAA0A8AIMEGAQDuDAAhwgYBAIgNACHoBkAA_QwAIekGQAD9DAAh9QYBAIgNACGEBwEA7gwAIbcHAQCIDQAhuAdAAJUNACG5BwEAiA0AIeIHAQDuDAAh4wcBAIgNACHkByAAuQ0AIQrBBgEAAAAB2gYgAAAAAegGQAAAAAHpBkAAAAAB9QYBAAAAAfcGAQAAAAGKBwEAAAABnwcAAADKBwLGBxAAAAABzgcBAAAAAQcDAACUDgAgTgAAlQ4AIMEGAQAAAAHCBgEAAAABzAYBAAAAAc0GAQAAAAHOBgEAAAABAgAAAAsAIGUAANIZACAgBAAA1xAAIBcAANsQACBHAADeEAAgTQAA4xAAIFAAANgQACBRAADZEAAgUgAA2hAAIFMAANwQACBUAADdEAAgVQAA3xAAIFYAAOAQACBXAADhEAAgwQYBAAAAAcoGAQAAAAHLBgEAAAABzAYBAAAAAdoGIAAAAAHbBgEAAAAB3AYBAAAAAd0GAQAAAAHeBgEAAAAB3wYBAAAAAeAGAgAAAAHhBgEAAAAB4gYBAAAAAeMGAQAAAAHkBgEAAAAB5QYBAAAAAeYGAQAAAAHnBgEAAAAB6AZAAAAAAekGQAAAAAECAAAA5gkAIGUAANQZACA0EwAAjhMAIBQAAI8TACAVAACQEwAgFgAAkRMAIBcAAJITACAdAACUEwAgHgAAlRMAICEAAJMTACAiAACaEwAgKwAAlhMAICwAAJcTACAvAACZEwAgMAAAphQAIDEAAJsTACAyAACcEwAgMwAAnRMAIDQAAJ4TACA1AACfEwAgNgAAoBMAIDcAAKETACA4AACiEwAgOQAAoxMAIDoAAKQTACA7AAClEwAgPAAAphMAID0AAKcTACBBAACoEwAgQgAAqRMAIEMAAKoTACDBBgEAAAAB6AZAAAAAAekGQAAAAAH9BgAAALAHAooHAQAAAAGkBwEAAAABpQcBAAAAAaYHAQAAAAGnBwEAAAABqAdAAAAAAaoHAAAAqgcDqwcBAAAAAawHAQAAAAGuBwAAAK4HArAHAQAAAAGxBwEAAAABsgdAAAAAAbMHQAAAAAG0BwEAAAABtQdAAAAAAbYHAQAAAAG3BwEAAAABuAdAAAAAAQIAAACSAQAgZQAA1hkAIAMAAAAJACBlAADSGQAgZgAA2hkAIAkAAAAJACADAAD9DQAgTgAA_g0AIF4AANoZACDBBgEA7gwAIcIGAQDuDAAhzAYBAO4MACHNBgEA7gwAIc4GAQDuDAAhBwMAAP0NACBOAAD-DQAgwQYBAO4MACHCBgEA7gwAIcwGAQDuDAAhzQYBAO4MACHOBgEA7gwAIQMAAABHACBlAADUGQAgZgAA3RkAICIAAABHACAEAACkDgAgFwAAqA4AIEcAAKsOACBNAACwDgAgUAAApQ4AIFEAAKYOACBSAACnDgAgUwAAqQ4AIFQAAKoOACBVAACsDgAgVgAArQ4AIFcAAK4OACBeAADdGQAgwQYBAO4MACHKBgEAiA0AIcsGAQDuDAAhzAYBAO4MACHaBiAAuQ0AIdsGAQCIDQAh3AYBAIgNACHdBgEA7gwAId4GAQDuDAAh3wYBAIgNACHgBgIAhw0AIeEGAQDuDAAh4gYBAO4MACHjBgEA7gwAIeQGAQDuDAAh5QYBAO4MACHmBgEA7gwAIecGAQDuDAAh6AZAAP0MACHpBkAA_QwAISAEAACkDgAgFwAAqA4AIEcAAKsOACBNAACwDgAgUAAApQ4AIFEAAKYOACBSAACnDgAgUwAAqQ4AIFQAAKoOACBVAACsDgAgVgAArQ4AIFcAAK4OACDBBgEA7gwAIcoGAQCIDQAhywYBAO4MACHMBgEA7gwAIdoGIAC5DQAh2wYBAIgNACHcBgEAiA0AId0GAQDuDAAh3gYBAO4MACHfBgEAiA0AIeAGAgCHDQAh4QYBAO4MACHiBgEA7gwAIeMGAQDuDAAh5AYBAO4MACHlBgEA7gwAIeYGAQDuDAAh5wYBAO4MACHoBkAA_QwAIekGQAD9DAAhAwAAAC8AIGUAANYZACBmAADgGQAgNgAAAC8AIBMAAMgRACAUAADJEQAgFQAAyhEAIBYAAMsRACAXAADMEQAgHQAAzhEAIB4AAM8RACAhAADNEQAgIgAA1BEAICsAANARACAsAADREQAgLwAA0xEAIDAAANURACAxAADWEQAgMgAA1xEAIDMAANgRACA0AADZEQAgNQAA2hEAIDYAANsRACA3AADcEQAgOAAA3REAIDkAAN4RACA6AADfEQAgOwAA4BEAIDwAAOERACA9AADiEQAgQQAA4xEAIEIAAOQRACBDAADlEQAgXgAA4BkAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIf0GAADHEbAHIooHAQCIDQAhpAcBAO4MACGlBwEAiA0AIaYHAQCIDQAhpwcBAIgNACGoB0AAlQ0AIaoHAADFEaoHI6sHAQCIDQAhrAcBAIgNACGuBwAAxhGuByKwBwEAiA0AIbEHAQCIDQAhsgdAAJUNACGzB0AAlQ0AIbQHAQCIDQAhtQdAAJUNACG2BwEAiA0AIbcHAQCIDQAhuAdAAJUNACE0EwAAyBEAIBQAAMkRACAVAADKEQAgFgAAyxEAIBcAAMwRACAdAADOEQAgHgAAzxEAICEAAM0RACAiAADUEQAgKwAA0BEAICwAANERACAvAADTEQAgMAAA1REAIDEAANYRACAyAADXEQAgMwAA2BEAIDQAANkRACA1AADaEQAgNgAA2xEAIDcAANwRACA4AADdEQAgOQAA3hEAIDoAAN8RACA7AADgEQAgPAAA4REAID0AAOIRACBBAADjEQAgQgAA5BEAIEMAAOURACDBBgEA7gwAIegGQAD9DAAh6QZAAP0MACH9BgAAxxGwByKKBwEAiA0AIaQHAQDuDAAhpQcBAIgNACGmBwEAiA0AIacHAQCIDQAhqAdAAJUNACGqBwAAxRGqByOrBwEAiA0AIawHAQCIDQAhrgcAAMYRrgcisAcBAIgNACGxBwEAiA0AIbIHQACVDQAhswdAAJUNACG0BwEAiA0AIbUHQACVDQAhtgcBAIgNACG3BwEAiA0AIbgHQACVDQAhBsEGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAH2BgEAAAABiggBAAAAAQMAAACPAgAgZQAApxkAIGYAAOQZACAEAAAAjwIAIF4AAOQZACDBBgEA7gwAIYoHAQDuDAAhAsEGAQDuDAAhigcBAO4MACEDAAAARwAgZQAAqRkAIGYAAOcZACAiAAAARwAgBAAApA4AIBcAAKgOACBHAACrDgAgTQAAsA4AIE8AAK8OACBQAAClDgAgUgAApw4AIFMAAKkOACBUAACqDgAgVQAArA4AIFYAAK0OACBXAACuDgAgXgAA5xkAIMEGAQDuDAAhygYBAIgNACHLBgEA7gwAIcwGAQDuDAAh2gYgALkNACHbBgEAiA0AIdwGAQCIDQAh3QYBAO4MACHeBgEA7gwAId8GAQCIDQAh4AYCAIcNACHhBgEA7gwAIeIGAQDuDAAh4wYBAO4MACHkBgEA7gwAIeUGAQDuDAAh5gYBAO4MACHnBgEA7gwAIegGQAD9DAAh6QZAAP0MACEgBAAApA4AIBcAAKgOACBHAACrDgAgTQAAsA4AIE8AAK8OACBQAAClDgAgUgAApw4AIFMAAKkOACBUAACqDgAgVQAArA4AIFYAAK0OACBXAACuDgAgwQYBAO4MACHKBgEAiA0AIcsGAQDuDAAhzAYBAO4MACHaBiAAuQ0AIdsGAQCIDQAh3AYBAIgNACHdBgEA7gwAId4GAQDuDAAh3wYBAIgNACHgBgIAhw0AIeEGAQDuDAAh4gYBAO4MACHjBgEA7gwAIeQGAQDuDAAh5QYBAO4MACHmBgEA7gwAIecGAQDuDAAh6AZAAP0MACHpBkAA_QwAIQcDAACUDgAgTwAAlg4AIMEGAQAAAAHCBgEAAAABzAYBAAAAAc0GAQAAAAHOBgEAAAABAgAAAAsAIGUAAOgZACAQAwAA9Q0AICkAAPgNACAtAQAAAAFPAAD5DQAgWAAA9g0AIMEGAQAAAAHCBgEAAAABwwYBAAAAAcQGAQAAAAHFBkAAAAABxgZAAAAAAccGQAAAAAHIBkAAAAAByQYBAAAAAcoGAQAAAAHLBgEAAAABAgAAAAUAIGUAAOoZACAgBAAA1xAAIBcAANsQACBHAADeEAAgTwAA4hAAIFAAANgQACBRAADZEAAgUgAA2hAAIFMAANwQACBUAADdEAAgVQAA3xAAIFYAAOAQACBXAADhEAAgwQYBAAAAAcoGAQAAAAHLBgEAAAABzAYBAAAAAdoGIAAAAAHbBgEAAAAB3AYBAAAAAd0GAQAAAAHeBgEAAAAB3wYBAAAAAeAGAgAAAAHhBgEAAAAB4gYBAAAAAeMGAQAAAAHkBgEAAAAB5QYBAAAAAeYGAQAAAAHnBgEAAAAB6AZAAAAAAekGQAAAAAECAAAA5gkAIGUAAOwZACAaCAAA9hUAIA4AAPcVACAPAAD4FQAgEAAA-RUAICgAAPwVACBFAAD7FQAgRgAA_RUAIEcAAP4VACBIAAD_FQAgSQAAihYAIMEGAQAAAAHoBkAAAAAB6QZAAAAAAYoHAQAAAAGnBwEAAAABqgcAAACqBwKsBwEAAAABuAdAAAAAAYIIAQAAAAGDCAEAAAABhAgBAAAAAYUIQAAAAAGGCCAAAAABhwgBAAAAAYgIAQAAAAGJCAEAAAABAgAAAB0AIGUAAO4ZACADAAAARwAgZQAA7BkAIGYAAPIZACAiAAAARwAgBAAApA4AIBcAAKgOACBHAACrDgAgTwAArw4AIFAAAKUOACBRAACmDgAgUgAApw4AIFMAAKkOACBUAACqDgAgVQAArA4AIFYAAK0OACBXAACuDgAgXgAA8hkAIMEGAQDuDAAhygYBAIgNACHLBgEA7gwAIcwGAQDuDAAh2gYgALkNACHbBgEAiA0AIdwGAQCIDQAh3QYBAO4MACHeBgEA7gwAId8GAQCIDQAh4AYCAIcNACHhBgEA7gwAIeIGAQDuDAAh4wYBAO4MACHkBgEA7gwAIeUGAQDuDAAh5gYBAO4MACHnBgEA7gwAIegGQAD9DAAh6QZAAP0MACEgBAAApA4AIBcAAKgOACBHAACrDgAgTwAArw4AIFAAAKUOACBRAACmDgAgUgAApw4AIFMAAKkOACBUAACqDgAgVQAArA4AIFYAAK0OACBXAACuDgAgwQYBAO4MACHKBgEAiA0AIcsGAQDuDAAhzAYBAO4MACHaBiAAuQ0AIdsGAQCIDQAh3AYBAIgNACHdBgEA7gwAId4GAQDuDAAh3wYBAIgNACHgBgIAhw0AIeEGAQDuDAAh4gYBAO4MACHjBgEA7gwAIeQGAQDuDAAh5QYBAO4MACHmBgEA7gwAIecGAQDuDAAh6AZAAP0MACHpBkAA_QwAIQMAAAAbACBlAADuGQAgZgAA9RkAIBwAAAAbACAIAACuFQAgDgAArxUAIA8AALAVACAQAACxFQAgKAAAtBUAIEUAALMVACBGAAC1FQAgRwAAthUAIEgAALcVACBJAACIFgAgXgAA9RkAIMEGAQDuDAAh6AZAAP0MACHpBkAA_QwAIYoHAQDuDAAhpwcBAO4MACGqBwAArBWqByKsBwEA7gwAIbgHQACVDQAhgggBAO4MACGDCAEAiA0AIYQIAQCIDQAhhQhAAP0MACGGCCAAuQ0AIYcIAQCIDQAhiAgBAIgNACGJCAEAiA0AIRoIAACuFQAgDgAArxUAIA8AALAVACAQAACxFQAgKAAAtBUAIEUAALMVACBGAAC1FQAgRwAAthUAIEgAALcVACBJAACIFgAgwQYBAO4MACHoBkAA_QwAIekGQAD9DAAhigcBAO4MACGnBwEA7gwAIaoHAACsFaoHIqwHAQDuDAAhuAdAAJUNACGCCAEA7gwAIYMIAQCIDQAhhAgBAIgNACGFCEAA_QwAIYYIIAC5DQAhhwgBAIgNACGICAEAiA0AIYkIAQCIDQAhBsEGAQAAAAHCBgEAAAAB6AZAAAAAAekGQAAAAAHtBgEAAAAB_QYAAADyBwIDAAAACQAgZQAA6BkAIGYAAPkZACAJAAAACQAgAwAA_Q0AIE8AAP8NACBeAAD5GQAgwQYBAO4MACHCBgEA7gwAIcwGAQDuDAAhzQYBAO4MACHOBgEA7gwAIQcDAAD9DQAgTwAA_w0AIMEGAQDuDAAhwgYBAO4MACHMBgEA7gwAIc0GAQDuDAAhzgYBAO4MACEDAAAAAwAgZQAA6hkAIGYAAPwZACASAAAAAwAgAwAAlg0AICkAAJkNACAtAQCIDQAhTwAAmg0AIFgAAJcNACBeAAD8GQAgwQYBAO4MACHCBgEA7gwAIcMGAQDuDAAhxAYBAO4MACHFBkAAlQ0AIcYGQACVDQAhxwZAAJUNACHIBkAAlQ0AIckGAQCIDQAhygYBAIgNACHLBgEAiA0AIRADAACWDQAgKQAAmQ0AIC0BAIgNACFPAACaDQAgWAAAlw0AIMEGAQDuDAAhwgYBAO4MACHDBgEA7gwAIcQGAQDuDAAhxQZAAJUNACHGBkAAlQ0AIccGQACVDQAhyAZAAJUNACHJBgEAiA0AIcoGAQCIDQAhywYBAIgNACECDAA4UQYCBgMAAwwANymSAh9PkwInUJECBliQAgEOBAgEDAA2F_gBFUf9AStNggIHT4ECJ1AMBVH2AQJS9wEXU_sBJlT8ASxV_gEqVv8BKVeAAh4BAwADBAMAAwwANU4QBk_zAScEBQACBgAFDAA0TRQHBAMAAwcACEoABkzvATMMCBYJDAAyDhgKDycNECkOESoHKOUBIEUuD0bmAS1H5wErSOgBC0npAQsBBwAIAgcACA0aCwQJHggKHwgLIgoMAAwDCSMACiQACyUAAQcACAEHAAgCBwAIRDAQHwwAMRM0ERQ2EhU6ExY-FBdCFR2DARoehAEbIUYWIo8BHiuIASUsigEmLowBJy-OASAwkAEQMZMBEDKUAQ8zlwEXNJgBFjWZARo2mgEfN5sBIDicASA5nQEhOqEBKDumASk8rAEqPbIBK0G5ASxCyQEuQ8oBLQESABABEgAQARIAEAESABACAwADEgAQAxIAEBkAFyqCARAHA0gDDAAkGEkQIE0YIV4WImIeKWofAwwAHRkAFx9RGQQMABwaABgdVRoeWhsDEgAQGwAZHFYQAhIAEBsAGQIdWwAeXAABH10AAwNmAxJjEBllFwUFawIMACMYbRAZbBcocSAHB3IIDAAiEnMQI3QfJHUQJXYQJ3ohAhh7ECYAIAEnfAABKH0ABCB-ACF_ACKAAQApgQEAARIAEAIDAAMSABAEAwADBQACEgAQLY0BBQEYogEQAgOnAQMYqAEQAgOtAQMYrgEQAwO0AQMHswEIGLUBEAQDAAMMADAYugEQP74BLQQHAAgYxQEQPr8BLEDBAS4DDAAvGMIBED_DAS0BP8QBAAE_xgEAGhPLAQAVzAEAFs0BABfOAQAd0AEAHtEBACHPAQAi1AEAK9IBAC_TAQAx1QEAMtYBADPXAQA02AEANdkBADbaAQA32wEAONwBADndAQA63gEAO98BADzgAQA94QEAQeIBAELjAQBD5AEABBHqAQAo7AEAResBAEftAQABSwAHAU3wAQACTvQBAE_1AQAMF4YCAEeJAgBNjgIAT40CAFCDAgBRhAIAUoUCAFOHAgBUiAIAVYoCAFaLAgBXjAIAAymVAgBPlgIAUJQCAAFRlwIAAAAAAwwAPWsAPmwAPwAAAAMMAD1rAD5sAD8CAwADEgAQAgMAAxIAEAMMAERrAEVsAEYAAAADDABEawBFbABGAgMAAxIAEAIDAAMSABADDABLawBMbABNAAAAAwwAS2sATGwATQQDAAMFAAISABAt5AIFBAMAAwUAAhIAEC3qAgUDDABSawBTbABUAAAAAwwAUmsAU2wAVAJI_AILSf0CCwJIgwMLSYQDCwMMAFlrAFpsAFsAAAADDABZawBabABbAAADDABgawBhbABiAAAAAwwAYGsAYWwAYgEHAAgBBwAIAwwAZ2sAaGwAaQAAAAMMAGdrAGhsAGkCBwAIDcYDCwIHAAgNzAMLAwwAbmsAb2wAcAAAAAMMAG5rAG9sAHABBwAIAQcACAUMAHVrAHhsAHntAQB27gEAdwAAAAAABQwAdWsAeGwAee0BAHbuAQB3AQcACAEHAAgFDAB-awCBAWwAggHtAQB_7gEAgAEAAAAAAAUMAH5rAIEBbACCAe0BAH_uAQCAAQMDAAMHAAhKAAYDAwADBwAISgAGAwwAhwFrAIgBbACJAQAAAAMMAIcBawCIAWwAiQEBSwAHAUsABwUMAI4BawCRAWwAkgHtAQCPAe4BAJABAAAAAAAFDACOAWsAkQFsAJIB7QEAjwHuAQCQAQIHAAhEvAQQAgcACETCBBADDACXAWsAmAFsAJkBAAAAAwwAlwFrAJgBbACZAQID1AQDGNUEEAID2wQDGNwEEAMMAJ4BawCfAWwAoAEAAAADDACeAWsAnwFsAKABARkAFwEZABcFDAClAWsAqAFsAKkB7QEApgHuAQCnAQAAAAAABQwApQFrAKgBbACpAe0BAKYB7gEApwEBGgAYARoAGAUMAK4BawCxAWwAsgHtAQCvAe4BALABAAAAAAAFDACuAWsAsQFsALIB7QEArwHuAQCwAQMSABAZABcqmgUQAxIAEBkAFyqgBRADDAC3AWsAuAFsALkBAAAAAwwAtwFrALgBbAC5AQMSABAbABkcsgUQAxIAEBsAGRy4BRADDAC-AWsAvwFsAMABAAAAAwwAvgFrAL8BbADAAQISABAbABkCEgAQGwAZBQwAxQFrAMgBbADJAe0BAMYB7gEAxwEAAAAAAAUMAMUBawDIAWwAyQHtAQDGAe4BAMcBAwXgBQIY4gUQGeEFFwMF6AUCGOoFEBnpBRcFDADOAWsA0QFsANIB7QEAzwHuAQDQAQAAAAAABQwAzgFrANEBbADSAe0BAM8B7gEA0AEFB_wFCBL9BRAj_gUfJP8FECWABhAFB4YGCBKHBhAjiAYfJIkGECWKBhAFDADXAWsA2gFsANsB7QEA2AHuAQDZAQAAAAAABQwA1wFrANoBbADbAe0BANgB7gEA2QECGJwGECYAIAIYogYQJgAgBQwA4AFrAOMBbADkAe0BAOEB7gEA4gEAAAAAAAUMAOABawDjAWwA5AHtAQDhAe4BAOIBARIAEAESABADDADpAWsA6gFsAOsBAAAAAwwA6QFrAOoBbADrAQAAAAMMAPEBawDyAWwA8wEAAAADDADxAWsA8gFsAPMBAAAAAwwA-QFrAPoBbAD7AQAAAAMMAPkBawD6AWwA-wEAAAADDACBAmsAggJsAIMCAAAAAwwAgQJrAIICbACDAgEYlQcQARibBxADDACIAmsAiQJsAIoCAAAAAwwAiAJrAIkCbACKAgEwrQcQATCzBxADDACPAmsAkAJsAJECAAAAAwwAjwJrAJACbACRAgESABABEgAQAwwAlgJrAJcCbACYAgAAAAMMAJYCawCXAmwAmAIBEgAQARIAEAUMAJ0CawCgAmwAoQLtAQCeAu4BAJ8CAAAAAAAFDACdAmsAoAJsAKEC7QEAngLuAQCfAgESABABEgAQAwwApgJrAKcCbACoAgAAAAMMAKYCawCnAmwAqAIBEgAQARIAEAMMAK0CawCuAmwArwIAAAADDACtAmsArgJsAK8CAAAABQwAtQJrALgCbAC5Au0BALYC7gEAtwIAAAAAAAUMALUCawC4AmwAuQLtAQC2Au4BALcCAgMAAxi4CBACAwADGL4IEAMMAL4CawC_AmwAwAIAAAADDAC-AmsAvwJsAMACARjQCBABGNYIEAMMAMUCawDGAmwAxwIAAAADDADFAmsAxgJsAMcCBAcACBjqCBA-6AgsQOkILgQHAAgY8ggQPvAILEDxCC4FDADMAmsAzwJsANAC7QEAzQLuAQDOAgAAAAAABQwAzAJrAM8CbADQAu0BAM0C7gEAzgICA4QJAxiFCRACA4sJAxiMCRADDADVAmsA1gJsANcCAAAAAwwA1QJrANYCbADXAgIDngkDGJ8JEAIDpQkDGKYJEAMMANwCawDdAmwA3gIAAAADDADcAmsA3QJsAN4CAwO6CQMSuAkQGbkJFwMDwgkDEsAJEBnBCRcFDADjAmsA5gJsAOcC7QEA5ALuAQDlAgAAAAAABQwA4wJrAOYCbADnAu0BAOQC7gEA5QIDA9UJAwfUCQgY1gkQAwPdCQMH3AkIGN4JEAUMAOwCawDvAmwA8ALtAQDtAu4BAO4CAAAAAAAFDADsAmsA7wJsAPAC7QEA7QLuAQDuAgAABQwA9QJrAPgCbAD5Au0BAPYC7gEA9wIAAAAAAAUMAPUCawD4AmwA-QLtAQD2Au4BAPcCAQMAAwEDAAMFDAD-AmsAgQNsAIID7QEA_wLuAQCAAwAAAAAABQwA_gJrAIEDbACCA-0BAP8C7gEAgAMBAwADAQMAAwMMAIcDawCIA2wAiQMAAAADDACHA2sAiANsAIkDAgMAA1i2CgECAwADWLwKAQMMAI4DawCPA2wAkAMAAAADDACOA2sAjwNsAJADAgUAAgYABQIFAAIGAAUDDACVA2sAlgNsAJcDAAAAAwwAlQNrAJYDbACXA1kCAVqYAgFbmgIBXJsCAV2cAgFfngIBYKACOWGhAjpiowIBY6UCOWSmAjtnpwIBaKgCAWmpAjltrAI8bq0CQG-uAhVwrwIVcbACFXKxAhVzsgIVdLQCFXW2Ajl2twJBd7kCFXi7Ajl5vAJCer0CFXu-AhV8vwI5fcICQ37DAkd_xAImgAHFAiaBAcYCJoIBxwImgwHIAiaEAcoCJoUBzAI5hgHNAkiHAc8CJogB0QI5iQHSAkmKAdMCJosB1AImjAHVAjmNAdgCSo4B2QJOjwHaAieQAdsCJ5EB3AInkgHdAieTAd4CJ5QB4AInlQHiAjmWAeMCT5cB5gInmAHoAjmZAekCUJoB6wInmwHsAiecAe0COZ0B8AJRngHxAlWfAfICCKAB8wIIoQH0AgiiAfUCCKMB9gIIpAH4AgilAfoCOaYB-wJWpwH_AgioAYEDOakBggNXqgGFAwirAYYDCKwBhwM5rQGKA1iuAYsDXK8BjQMLsAGOAwuxAZADC7IBkQMLswGSAwu0AZQDC7UBlgM5tgGXA123AZkDC7gBmwM5uQGcA166AZ0DC7sBngMLvAGfAzm9AaIDX74BowNjvwGlAwnAAaYDCcEBqAMJwgGpAwnDAaoDCcQBrAMJxQGuAznGAa8DZMcBsQMJyAGzAznJAbQDZcoBtQMJywG2AwnMAbcDOc0BugNmzgG7A2rPAbwDCtABvQMK0QG-AwrSAb8DCtMBwAMK1AHCAwrVAcQDOdYBxQNr1wHIAwrYAcoDOdkBywNs2gHNAwrbAc4DCtwBzwM53QHSA23eAdMDcd8B1QMN4AHWAw3hAdgDDeIB2QMN4wHaAw3kAdwDDeUB3gM55gHfA3LnAeEDDegB4wM56QHkA3PqAeUDDesB5gMN7AHnAznvAeoDdPAB6wN68QHtAw7yAe4DDvMB8AMO9AHxAw71AfIDDvYB9AMO9wH2Azn4AfcDe_kB-QMO-gH7Azn7AfwDfPwB_QMO_QH-Aw7-Af8DOf8BggR9gAKDBIMBgQKEBAeCAoUEB4MChgQHhAKHBAeFAogEB4YCigQHhwKMBDmIAo0EhAGJAo8EB4oCkQQ5iwKSBIUBjAKTBAeNApQEB44ClQQ5jwKYBIYBkAKZBIoBkQKbBDOSApwEM5MCngQzlAKfBDOVAqAEM5YCogQzlwKkBDmYAqUEiwGZAqcEM5oCqQQ5mwKqBIwBnAKrBDOdAqwEM54CrQQ5nwKwBI0BoAKxBJMBoQKyBA-iArMED6MCtAQPpAK1BA-lArYED6YCuAQPpwK6BDmoArsElAGpAr4ED6oCwAQ5qwLBBJUBrALDBA-tAsQED64CxQQ5rwLIBJYBsALJBJoBsQLKBBeyAssEF7MCzAQXtALNBBe1As4EF7YC0AQXtwLSBDm4AtMEmwG5AtcEF7oC2QQ5uwLaBJwBvALdBBe9At4EF74C3wQ5vwLiBJ0BwALjBKEBwQLkBBjCAuUEGMMC5gQYxALnBBjFAugEGMYC6gQYxwLsBDnIAu0EogHJAu8EGMoC8QQ5ywLyBKMBzALzBBjNAvQEGM4C9QQ5zwL4BKQB0AL5BKoB0QL6BBnSAvsEGdMC_AQZ1AL9BBnVAv4EGdYCgAUZ1wKCBTnYAoMFqwHZAoUFGdoChwU52wKIBawB3AKJBRndAooFGd4CiwU53wKOBa0B4AKPBbMB4QKQBRbiApEFFuMCkgUW5AKTBRblApQFFuYClgUW5wKYBTnoApkFtAHpApwFFuoCngU56wKfBbUB7AKhBRbtAqIFFu4CowU57wKmBbYB8AKnBboB8QKoBRryAqkFGvMCqgUa9AKrBRr1AqwFGvYCrgUa9wKwBTn4ArEFuwH5ArQFGvoCtgU5-wK3BbwB_AK5BRr9AroFGv4CuwU5_wK-Bb0BgAO_BcEBgQPABRuCA8EFG4MDwgUbhAPDBRuFA8QFG4YDxgUbhwPIBTmIA8kFwgGJA8sFG4oDzQU5iwPOBcMBjAPPBRuNA9AFG44D0QU5jwPUBcQBkAPVBcoBkQPWBR-SA9cFH5MD2AUflAPZBR-VA9oFH5YD3AUflwPeBTmYA98FywGZA-QFH5oD5gU5mwPnBcwBnAPrBR-dA-wFH54D7QU5nwPwBc0BoAPxBdMBoQPyBSCiA_MFIKMD9AUgpAP1BSClA_YFIKYD-AUgpwP6BTmoA_sF1AGpA4IGIKoDhAY5qwOFBtUBrAOLBiCtA4wGIK4DjQY5rwOQBtYBsAORBtwBsQOSBiGyA5MGIbMDlAYhtAOVBiG1A5YGIbYDmAYhtwOaBjm4A5sG3QG5A54GIboDoAY5uwOhBt4BvAOjBiG9A6QGIb4DpQY5vwOoBt8BwAOpBuUBwQOqBiXCA6sGJcMDrAYlxAOtBiXFA64GJcYDsAYlxwOyBjnIA7MG5gHJA7UGJcoDtwY5ywO4BucBzAO5BiXNA7oGJc4DuwY5zwO-BugB0AO_BuwB0QPBBu0B0gPCBu0B0wPFBu0B1APGBu0B1QPHBu0B1gPJBu0B1wPLBjnYA8wG7gHZA84G7QHaA9AGOdsD0QbvAdwD0gbtAd0D0wbtAd4D1AY53wPXBvAB4APYBvQB4QPaBvUB4gPbBvUB4wPeBvUB5APfBvUB5QPgBvUB5gPiBvUB5wPkBjnoA-UG9gHpA-cG9QHqA-kGOesD6gb3AewD6wb1Ae0D7Ab1Ae4D7QY57wPwBvgB8APxBvwB8QPzBv0B8gP0Bv0B8wP3Bv0B9AP4Bv0B9QP5Bv0B9gP7Bv0B9wP9Bjn4A_4G_gH5A4AH_QH6A4IHOfsDgwf_AfwDhAf9Af0DhQf9Af4Dhgc5_wOJB4ACgASKB4QCgQSLByiCBIwHKIMEjQcohASOByiFBI8HKIYEkQcohwSTBzmIBJQHhQKJBJcHKIoEmQc5iwSaB4YCjAScByiNBJ0HKI4Engc5jwShB4cCkASiB4sCkQSjBxCSBKQHEJMEpQcQlASmBxCVBKcHEJYEqQcQlwSrBzmYBKwHjAKZBK8HEJoEsQc5mwSyB40CnAS0BxCdBLUHEJ4Etgc5nwS5B44CoAS6B5ICoQS7BxGiBLwHEaMEvQcRpAS-BxGlBL8HEaYEwQcRpwTDBzmoBMQHkwKpBMYHEaoEyAc5qwTJB5QCrATKBxGtBMsHEa4EzAc5rwTPB5UCsATQB5kCsQTSBxKyBNMHErME1QcStATWBxK1BNcHErYE2QcStwTbBzm4BNwHmgK5BN4HEroE4Ac5uwThB5sCvATiBxK9BOMHEr4E5Ac5vwTnB5wCwAToB6ICwQTpBxPCBOoHE8ME6wcTxATsBxPFBO0HE8YE7wcTxwTxBznIBPIHowLJBPQHE8oE9gc5ywT3B6QCzAT4BxPNBPkHE84E-gc5zwT9B6UC0AT-B6kC0QT_BxTSBIAIFNMEgQgU1ASCCBTVBIMIFNYEhQgU1wSHCDnYBIgIqgLZBIoIFNoEjAg52wSNCKsC3ASOCBTdBI8IFN4EkAg53wSTCKwC4ASUCLAC4QSWCLEC4gSXCLEC4wSaCLEC5ASbCLEC5QScCLEC5gSeCLEC5wSgCDnoBKEIsgLpBKMIsQLqBKUIOesEpgizAuwEpwixAu0EqAixAu4EqQg57wSsCLQC8AStCLoC8QSuCCzyBK8ILPMEsAgs9ASxCCz1BLIILPYEtAgs9wS2CDn4BLcIuwL5BLoILPoEvAg5-wS9CLwC_AS_CCz9BMAILP4EwQg5_wTECL0CgAXFCMECgQXGCC6CBccILoMFyAguhAXJCC6FBcoILoYFzAguhwXOCDmIBc8IwgKJBdIILooF1Ag5iwXVCMMCjAXXCC6NBdgILo4F2Qg5jwXcCMQCkAXdCMgCkQXeCC2SBd8ILZMF4AgtlAXhCC2VBeIILZYF5AgtlwXmCDmYBecIyQKZBewILZoF7gg5mwXvCMoCnAXzCC2dBfQILZ4F9Qg5nwX4CMsCoAX5CNECoQX6CCmiBfsIKaMF_AgppAX9CCmlBf4IKaYFgAkppwWCCTmoBYMJ0gKpBYcJKaoFiQk5qwWKCdMCrAWNCSmtBY4JKa4Fjwk5rwWSCdQCsAWTCdgCsQWUCSqyBZUJKrMFlgkqtAWXCSq1BZgJKrYFmgkqtwWcCTm4BZ0J2QK5BaEJKroFowk5uwWkCdoCvAWnCSq9BagJKr4FqQk5vwWsCdsCwAWtCd8CwQWuCR7CBa8JHsMFsAkexAWxCR7FBbIJHsYFtAkexwW2CTnIBbcJ4ALJBbwJHsoFvgk5ywW_CeECzAXDCR7NBcQJHs4FxQk5zwXICeIC0AXJCegC0QXKCSvSBcsJK9MFzAkr1AXNCSvVBc4JK9YF0Akr1wXSCTnYBdMJ6QLZBdgJK9oF2gk52wXbCeoC3AXfCSvdBeAJK94F4Qk53wXkCesC4AXlCfEC4QXnCQPiBegJA-MF6gkD5AXrCQPlBewJA-YF7gkD5wXwCTnoBfEJ8gLpBfMJA-oF9Qk56wX2CfMC7AX3CQPtBfgJA-4F-Qk57wX8CfQC8AX9CfoC8QX_CQTyBYAKBPMFggoE9AWDCgT1BYQKBPYFhgoE9wWICjn4BYkK-wL5BYsKBPoFjQo5-wWOCvwC_AWPCgT9BZAKBP4FkQo5_wWUCv0CgAaVCoMDgQaWCgWCBpcKBYMGmAoFhAaZCgWFBpoKBYYGnAoFhwaeCjmIBp8KhAOJBqEKBYoGowo5iwakCoUDjAalCgWNBqYKBY4Gpwo5jwaqCoYDkAarCooDkQasCgKSBq0KApMGrgoClAavCgKVBrAKApYGsgoClwa0CjmYBrUKiwOZBrgKApoGugo5mwa7CowDnAa9CgKdBr4KAp4Gvwo5nwbCCo0DoAbDCpEDoQbECgaiBsUKBqMGxgoGpAbHCgalBsgKBqYGygoGpwbMCjmoBs0KkgOpBs8KBqoG0Qo5qwbSCpMDrAbTCgatBtQKBq4G1Qo5rwbYCpQDsAbZCpgD"
};
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer: Buffer2 } = await import("buffer");
  const wasmArray = Buffer2.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
  getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs"),
  getQueryCompilerWasmModule: async () => {
    const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs");
    return await decodeBase64AsWasm(wasm);
  },
  importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}

// src/generated/internal/prismaNamespace.ts
var prismaNamespace_exports = {};
__export(prismaNamespace_exports, {
  AddressScalarFieldEnum: () => AddressScalarFieldEnum,
  AnyNull: () => AnyNull2,
  ApplicantTradeScalarFieldEnum: () => ApplicantTradeScalarFieldEnum,
  AuditLogScalarFieldEnum: () => AuditLogScalarFieldEnum,
  AuthTokenScalarFieldEnum: () => AuthTokenScalarFieldEnum,
  BannerScalarFieldEnum: () => BannerScalarFieldEnum,
  BatchScalarFieldEnum: () => BatchScalarFieldEnum,
  BatchShiftScalarFieldEnum: () => BatchShiftScalarFieldEnum,
  CourseAssignmentScalarFieldEnum: () => CourseAssignmentScalarFieldEnum,
  CourseModuleScalarFieldEnum: () => CourseModuleScalarFieldEnum,
  CourseScalarFieldEnum: () => CourseScalarFieldEnum,
  CourseVideoScalarFieldEnum: () => CourseVideoScalarFieldEnum,
  DbNull: () => DbNull2,
  Decimal: () => Decimal2,
  DesignationScalarFieldEnum: () => DesignationScalarFieldEnum,
  DonorScalarFieldEnum: () => DonorScalarFieldEnum,
  EducationScalarFieldEnum: () => EducationScalarFieldEnum,
  EmployeeProfileScalarFieldEnum: () => EmployeeProfileScalarFieldEnum,
  ExaminationResultScalarFieldEnum: () => ExaminationResultScalarFieldEnum,
  FamilyInformationScalarFieldEnum: () => FamilyInformationScalarFieldEnum,
  FeePlanScalarFieldEnum: () => FeePlanScalarFieldEnum,
  GatewayCustomerScalarFieldEnum: () => GatewayCustomerScalarFieldEnum,
  GatewayEventScalarFieldEnum: () => GatewayEventScalarFieldEnum,
  GuardianInformationScalarFieldEnum: () => GuardianInformationScalarFieldEnum,
  HeadlineScalarFieldEnum: () => HeadlineScalarFieldEnum,
  JobHolderScalarFieldEnum: () => JobHolderScalarFieldEnum,
  JsonNull: () => JsonNull2,
  JsonNullValueFilter: () => JsonNullValueFilter,
  ModelName: () => ModelName,
  NewsScalarFieldEnum: () => NewsScalarFieldEnum,
  NullTypes: () => NullTypes2,
  NullableJsonNullValueInput: () => NullableJsonNullValueInput,
  NullsOrder: () => NullsOrder,
  ParentInformationScalarFieldEnum: () => ParentInformationScalarFieldEnum,
  PaymentRefundScalarFieldEnum: () => PaymentRefundScalarFieldEnum,
  PaymentScalarFieldEnum: () => PaymentScalarFieldEnum,
  PictureGalleryScalarFieldEnum: () => PictureGalleryScalarFieldEnum,
  PrismaClientInitializationError: () => PrismaClientInitializationError2,
  PrismaClientKnownRequestError: () => PrismaClientKnownRequestError2,
  PrismaClientRustPanicError: () => PrismaClientRustPanicError2,
  PrismaClientUnknownRequestError: () => PrismaClientUnknownRequestError2,
  PrismaClientValidationError: () => PrismaClientValidationError2,
  QueryMode: () => QueryMode,
  RefreshTokenScalarFieldEnum: () => RefreshTokenScalarFieldEnum,
  SortOrder: () => SortOrder,
  Sql: () => Sql2,
  StudentFeedbackScalarFieldEnum: () => StudentFeedbackScalarFieldEnum,
  StudentInformationScalarFieldEnum: () => StudentInformationScalarFieldEnum,
  StudentRemarkScalarFieldEnum: () => StudentRemarkScalarFieldEnum,
  StudentTradeScalarFieldEnum: () => StudentTradeScalarFieldEnum,
  StudentTrainingScalarFieldEnum: () => StudentTrainingScalarFieldEnum,
  SuccessStoryScalarFieldEnum: () => SuccessStoryScalarFieldEnum,
  TradeInfoScalarFieldEnum: () => TradeInfoScalarFieldEnum,
  TradeScalarFieldEnum: () => TradeScalarFieldEnum,
  TradeShiftScalarFieldEnum: () => TradeShiftScalarFieldEnum,
  TrainerTradeScalarFieldEnum: () => TrainerTradeScalarFieldEnum,
  TransactionIsolationLevel: () => TransactionIsolationLevel,
  UserAddressScalarFieldEnum: () => UserAddressScalarFieldEnum,
  UserScalarFieldEnum: () => UserScalarFieldEnum,
  VideoGalleryScalarFieldEnum: () => VideoGalleryScalarFieldEnum,
  VideoProgressScalarFieldEnum: () => VideoProgressScalarFieldEnum,
  VideoUnlockScalarFieldEnum: () => VideoUnlockScalarFieldEnum,
  WorkplaceScalarFieldEnum: () => WorkplaceScalarFieldEnum,
  defineExtension: () => defineExtension,
  empty: () => empty2,
  getExtensionContext: () => getExtensionContext,
  join: () => join2,
  prismaVersion: () => prismaVersion,
  raw: () => raw2,
  sql: () => sql
});
import * as runtime2 from "@prisma/client/runtime/client";
var PrismaClientKnownRequestError2 = runtime2.PrismaClientKnownRequestError;
var PrismaClientUnknownRequestError2 = runtime2.PrismaClientUnknownRequestError;
var PrismaClientRustPanicError2 = runtime2.PrismaClientRustPanicError;
var PrismaClientInitializationError2 = runtime2.PrismaClientInitializationError;
var PrismaClientValidationError2 = runtime2.PrismaClientValidationError;
var sql = runtime2.sqltag;
var empty2 = runtime2.empty;
var join2 = runtime2.join;
var raw2 = runtime2.raw;
var Sql2 = runtime2.Sql;
var Decimal2 = runtime2.Decimal;
var getExtensionContext = runtime2.Extensions.getExtensionContext;
var prismaVersion = {
  client: "7.10.1",
  engine: "d1b3f377ca835d73fd50954a5e22128b9ebdd6b8"
};
var NullTypes2 = {
  DbNull: runtime2.NullTypes.DbNull,
  JsonNull: runtime2.NullTypes.JsonNull,
  AnyNull: runtime2.NullTypes.AnyNull
};
var DbNull2 = runtime2.DbNull;
var JsonNull2 = runtime2.JsonNull;
var AnyNull2 = runtime2.AnyNull;
var ModelName = {
  Donor: "Donor",
  TrainerTrade: "TrainerTrade",
  ApplicantTrade: "ApplicantTrade",
  StudentTraining: "StudentTraining",
  StudentInformation: "StudentInformation",
  Address: "Address",
  ParentInformation: "ParentInformation",
  GuardianInformation: "GuardianInformation",
  FamilyInformation: "FamilyInformation",
  Education: "Education",
  StudentTrade: "StudentTrade",
  ExaminationResult: "ExaminationResult",
  StudentRemark: "StudentRemark",
  Course: "Course",
  CourseModule: "CourseModule",
  CourseVideo: "CourseVideo",
  CourseAssignment: "CourseAssignment",
  VideoUnlock: "VideoUnlock",
  VideoProgress: "VideoProgress",
  FeePlan: "FeePlan",
  Payment: "Payment",
  PaymentRefund: "PaymentRefund",
  GatewayCustomer: "GatewayCustomer",
  GatewayEvent: "GatewayEvent",
  Headline: "Headline",
  Banner: "Banner",
  News: "News",
  User: "User",
  UserAddress: "UserAddress",
  EmployeeProfile: "EmployeeProfile",
  RefreshToken: "RefreshToken",
  AuthToken: "AuthToken",
  AuditLog: "AuditLog",
  Designation: "Designation",
  Workplace: "Workplace",
  JobHolder: "JobHolder",
  VideoGallery: "VideoGallery",
  PictureGallery: "PictureGallery",
  StudentFeedback: "StudentFeedback",
  SuccessStory: "SuccessStory",
  Trade: "Trade",
  TradeInfo: "TradeInfo",
  TradeShift: "TradeShift",
  Batch: "Batch",
  BatchShift: "BatchShift"
};
var TransactionIsolationLevel = runtime2.makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable"
});
var DonorScalarFieldEnum = {
  id: "id",
  name: "name"
};
var TrainerTradeScalarFieldEnum = {
  userId: "userId",
  tradeId: "tradeId"
};
var ApplicantTradeScalarFieldEnum = {
  userId: "userId",
  tradeId: "tradeId",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var StudentTrainingScalarFieldEnum = {
  id: "id",
  userId: "userId",
  tradeId: "tradeId",
  batchId: "batchId",
  shiftId: "shiftId",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var StudentInformationScalarFieldEnum = {
  id: "id",
  formNo: "formNo",
  mrNo: "mrNo",
  photo: "photo",
  name: "name",
  gender: "gender",
  phone: "phone",
  nidOrBirthNo: "nidOrBirthNo",
  birthDate: "birthDate",
  physicalDisability: "physicalDisability",
  disabilityDetails: "disabilityDetails",
  presentAddressId: "presentAddressId",
  permanentAddressId: "permanentAddressId",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  deletedAt: "deletedAt"
};
var AddressScalarFieldEnum = {
  id: "id",
  addressLine: "addressLine",
  postOffice: "postOffice",
  upazila: "upazila",
  district: "district",
  division: "division",
  postCode: "postCode",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var ParentInformationScalarFieldEnum = {
  id: "id",
  studentId: "studentId",
  fatherName: "fatherName",
  fatherOccupation: "fatherOccupation",
  fatherPhone: "fatherPhone",
  motherName: "motherName",
  motherOccupation: "motherOccupation",
  motherPhone: "motherPhone"
};
var GuardianInformationScalarFieldEnum = {
  id: "id",
  studentId: "studentId",
  name: "name",
  relation: "relation",
  phone: "phone",
  addressId: "addressId"
};
var FamilyInformationScalarFieldEnum = {
  id: "id",
  studentId: "studentId",
  totalMembers: "totalMembers",
  income: "income"
};
var EducationScalarFieldEnum = {
  id: "id",
  studentId: "studentId",
  qualification: "qualification",
  passingYear: "passingYear",
  result: "result",
  institution: "institution"
};
var StudentTradeScalarFieldEnum = {
  id: "id",
  studentId: "studentId",
  tradeId: "tradeId",
  batchId: "batchId",
  tradeShiftId: "tradeShiftId",
  status: "status",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var ExaminationResultScalarFieldEnum = {
  id: "id",
  studentTradeId: "studentTradeId",
  theory: "theory",
  practical: "practical",
  viva: "viva",
  totalMarks: "totalMarks",
  attendedDays: "attendedDays",
  totalDays: "totalDays",
  certificateSl: "certificateSl",
  finalGrade: "finalGrade",
  status: "status",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var StudentRemarkScalarFieldEnum = {
  id: "id",
  studentId: "studentId",
  text: "text",
  authorId: "authorId",
  createdAt: "createdAt"
};
var CourseScalarFieldEnum = {
  id: "id",
  slug: "slug",
  title: "title",
  description: "description",
  thumbnailUrl: "thumbnailUrl",
  isPublished: "isPublished",
  tradeId: "tradeId",
  createdById: "createdById",
  legacyMongoId: "legacyMongoId",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  deletedAt: "deletedAt"
};
var CourseModuleScalarFieldEnum = {
  id: "id",
  courseId: "courseId",
  title: "title",
  milestone: "milestone",
  sortOrder: "sortOrder",
  legacyMongoId: "legacyMongoId"
};
var CourseVideoScalarFieldEnum = {
  id: "id",
  moduleId: "moduleId",
  title: "title",
  youtubeVideoId: "youtubeVideoId",
  durationSeconds: "durationSeconds",
  sortOrder: "sortOrder",
  legacyMongoId: "legacyMongoId"
};
var CourseAssignmentScalarFieldEnum = {
  userId: "userId",
  courseId: "courseId",
  assignedById: "assignedById",
  assignedAt: "assignedAt"
};
var VideoUnlockScalarFieldEnum = {
  userId: "userId",
  videoId: "videoId",
  unlockedById: "unlockedById",
  unlockedAt: "unlockedAt"
};
var VideoProgressScalarFieldEnum = {
  userId: "userId",
  videoId: "videoId",
  watchedSeconds: "watchedSeconds",
  lastPosition: "lastPosition",
  completed: "completed",
  updatedAt: "updatedAt"
};
var FeePlanScalarFieldEnum = {
  id: "id",
  kind: "kind",
  name: "name",
  amount: "amount",
  currency: "currency",
  batchId: "batchId",
  courseId: "courseId",
  isActive: "isActive",
  createdById: "createdById",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var PaymentScalarFieldEnum = {
  id: "id",
  kind: "kind",
  status: "status",
  gateway: "gateway",
  method: "method",
  studentId: "studentId",
  userId: "userId",
  feePlanId: "feePlanId",
  amount: "amount",
  currency: "currency",
  isAnonymous: "isAnonymous",
  gatewaySessionId: "gatewaySessionId",
  gatewayPaymentId: "gatewayPaymentId",
  receiptNo: "receiptNo",
  receivedById: "receivedById",
  verifiedById: "verifiedById",
  verifiedAt: "verifiedAt",
  expiresAt: "expiresAt",
  paidAt: "paidAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var PaymentRefundScalarFieldEnum = {
  id: "id",
  paymentId: "paymentId",
  amount: "amount",
  reason: "reason",
  gatewayRefundId: "gatewayRefundId",
  createdById: "createdById",
  createdAt: "createdAt"
};
var GatewayCustomerScalarFieldEnum = {
  userId: "userId",
  gateway: "gateway",
  customerRef: "customerRef",
  createdAt: "createdAt"
};
var GatewayEventScalarFieldEnum = {
  gateway: "gateway",
  eventId: "eventId",
  type: "type",
  receivedAt: "receivedAt",
  processedAt: "processedAt"
};
var HeadlineScalarFieldEnum = {
  id: "id",
  titleBn: "titleBn",
  titleEn: "titleEn",
  isActive: "isActive",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var BannerScalarFieldEnum = {
  id: "id",
  imageUrl: "imageUrl",
  imagePublicId: "imagePublicId",
  title: "title",
  isActive: "isActive",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var NewsScalarFieldEnum = {
  id: "id",
  title: "title",
  description: "description",
  publishedOn: "publishedOn",
  imageUrl: "imageUrl",
  imagePublicId: "imagePublicId",
  isActive: "isActive",
  createdById: "createdById",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var UserScalarFieldEnum = {
  id: "id",
  email: "email",
  name: "name",
  avatarUrl: "avatarUrl",
  avatarPublicId: "avatarPublicId",
  phone: "phone",
  dateOfBirth: "dateOfBirth",
  gender: "gender",
  bloodGroup: "bloodGroup",
  nidOrBirthNo: "nidOrBirthNo",
  role: "role",
  status: "status",
  passwordHash: "passwordHash",
  googleSub: "googleSub",
  emailVerifiedAt: "emailVerifiedAt",
  lastLoginAt: "lastLoginAt",
  approvedById: "approvedById",
  approvedAt: "approvedAt",
  statusReason: "statusReason",
  legacyMongoId: "legacyMongoId",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  deletedAt: "deletedAt"
};
var UserAddressScalarFieldEnum = {
  id: "id",
  userId: "userId",
  kind: "kind",
  address: "address",
  division: "division",
  district: "district",
  upazila: "upazila",
  union: "union"
};
var EmployeeProfileScalarFieldEnum = {
  userId: "userId",
  identityCardNo: "identityCardNo",
  designation: "designation",
  joiningDate: "joiningDate",
  dateOfIssue: "dateOfIssue",
  salary: "salary"
};
var RefreshTokenScalarFieldEnum = {
  id: "id",
  userId: "userId",
  tokenHash: "tokenHash",
  familyId: "familyId",
  expiresAt: "expiresAt",
  revokedAt: "revokedAt",
  userAgent: "userAgent",
  ip: "ip",
  createdAt: "createdAt"
};
var AuthTokenScalarFieldEnum = {
  id: "id",
  userId: "userId",
  purpose: "purpose",
  tokenHash: "tokenHash",
  expiresAt: "expiresAt",
  usedAt: "usedAt"
};
var AuditLogScalarFieldEnum = {
  id: "id",
  actorId: "actorId",
  service: "service",
  action: "action",
  entity: "entity",
  entityId: "entityId",
  diff: "diff",
  createdAt: "createdAt"
};
var DesignationScalarFieldEnum = {
  id: "id",
  tradeId: "tradeId",
  name: "name",
  isActive: "isActive",
  createdById: "createdById",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var WorkplaceScalarFieldEnum = {
  id: "id",
  name: "name",
  address: "address",
  contact: "contact",
  createdById: "createdById",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var JobHolderScalarFieldEnum = {
  id: "id",
  studentId: "studentId",
  photoUrl: "photoUrl",
  designationId: "designationId",
  workplaceId: "workplaceId",
  salary: "salary",
  createdById: "createdById",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var VideoGalleryScalarFieldEnum = {
  id: "id",
  title: "title",
  tradeId: "tradeId",
  youtubeVideoId: "youtubeVideoId",
  isActive: "isActive",
  createdById: "createdById",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var PictureGalleryScalarFieldEnum = {
  id: "id",
  title: "title",
  tradeId: "tradeId",
  imageUrl: "imageUrl",
  imagePublicId: "imagePublicId",
  isActive: "isActive",
  createdById: "createdById",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var StudentFeedbackScalarFieldEnum = {
  id: "id",
  userId: "userId",
  courseId: "courseId",
  tradeId: "tradeId",
  legacyAuthorName: "legacyAuthorName",
  rating: "rating",
  comment: "comment",
  extra: "extra",
  status: "status",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var SuccessStoryScalarFieldEnum = {
  id: "id",
  studentId: "studentId",
  nameBn: "nameBn",
  imageUrl: "imageUrl",
  imagePublicId: "imagePublicId",
  tradeId: "tradeId",
  nameEn: "nameEn",
  roleBn: "roleBn",
  roleEn: "roleEn",
  quoteBn: "quoteBn",
  quoteEn: "quoteEn",
  sortOrder: "sortOrder",
  isActive: "isActive",
  createdById: "createdById",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var TradeScalarFieldEnum = {
  id: "id",
  code: "code",
  nameBn: "nameBn",
  nameEn: "nameEn",
  isActive: "isActive",
  tradeName: "tradeName",
  image: "image",
  details: "details",
  detailsEn: "detailsEn",
  mobile: "mobile",
  fee: "fee",
  feeUnit: "feeUnit",
  weeklyClassBn: "weeklyClassBn",
  weeklyClassEn: "weeklyClassEn",
  weekendBn: "weekendBn",
  weekendEn: "weekendEn",
  batchTypeBn: "batchTypeBn",
  batchTypeEn: "batchTypeEn",
  createdAt: "createdAt",
  updatedAt: "updatedAt"
};
var TradeInfoScalarFieldEnum = {
  id: "id",
  tradeId: "tradeId",
  isBteb: "isBteb",
  seats: "seats",
  durationDays: "durationDays",
  durationBn: "durationBn",
  durationEn: "durationEn",
  dailyHours: "dailyHours",
  routineBn: "routineBn",
  routineEn: "routineEn",
  minGrade: "minGrade",
  qualificationBn: "qualificationBn",
  qualificationEn: "qualificationEn"
};
var TradeShiftScalarFieldEnum = {
  id: "id",
  tradeId: "tradeId",
  code: "code",
  startTime: "startTime",
  endTime: "endTime"
};
var BatchScalarFieldEnum = {
  id: "id",
  tradeId: "tradeId",
  batchNumber: "batchNumber",
  batchCode: "batchCode",
  shift: "shift",
  startDate: "startDate",
  endDate: "endDate",
  admissionOpensAt: "admissionOpensAt",
  admissionClosesAt: "admissionClosesAt",
  donorId: "donorId",
  nameBn: "nameBn",
  nameEn: "nameEn"
};
var BatchShiftScalarFieldEnum = {
  batchId: "batchId",
  tradeShiftId: "tradeShiftId"
};
var SortOrder = {
  asc: "asc",
  desc: "desc"
};
var NullableJsonNullValueInput = {
  DbNull: DbNull2,
  JsonNull: JsonNull2
};
var QueryMode = {
  default: "default",
  insensitive: "insensitive"
};
var NullsOrder = {
  first: "first",
  last: "last"
};
var JsonNullValueFilter = {
  DbNull: DbNull2,
  JsonNull: JsonNull2,
  AnyNull: AnyNull2
};
var defineExtension = runtime2.Extensions.defineExtension;

// src/generated/client.ts
globalThis["__dirname"] = path2.dirname(fileURLToPath(import.meta.url));
var PrismaClient = getPrismaClientClass();

// src/db/client.ts
var connectionString = process.env.DATABASE_URL;
var pool = new Pool({ connectionString, max: 10 });
var adapter = new PrismaPg(pool);
var prisma = new PrismaClient({ adapter });

// src/app/middleware/globalErrorHandler.ts
import status from "http-status";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

// src/app/utils/appError.ts
var AppError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
};
var appError_default = AppError;

// src/app/middleware/globalErrorHandler.ts
var { JsonWebTokenError } = jwt;
var isJwtError = (err) => err instanceof JsonWebTokenError || err instanceof Error && (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError");
var errorHandler = async (err, _, res, __) => {
  let statusCode = status.INTERNAL_SERVER_ERROR;
  let message = "";
  let errorName = "Internal Server Error";
  let errorStack;
  if (err instanceof prismaNamespace_exports.PrismaClientValidationError) {
    errorName = err.name;
    statusCode = status.BAD_REQUEST;
    message = "You have provided incorrect field type or missing fields";
    errorStack = err.stack;
  } else if (err instanceof prismaNamespace_exports.PrismaClientKnownRequestError) {
    errorName = err.name;
    errorStack = err.stack;
    if (err.code === "P2002") {
      statusCode = status.CONFLICT;
      message = "Duplicate Key Error";
    } else if (err.code === "P2003") {
      statusCode = status.BAD_REQUEST;
      message = "Foreign key constraint failed";
    } else if (err.code === "P2025") {
      statusCode = status.NOT_FOUND;
      message = "An operation failed because it depends on one or more records that were required but not found.";
    } else {
      statusCode = status.BAD_REQUEST;
      message = "Database request failed";
    }
  } else if (err instanceof prismaNamespace_exports.PrismaClientInitializationError) {
    errorName = err.name;
    errorStack = err.stack;
    if (err.errorCode === "P1000") {
      statusCode = status.UNAUTHORIZED;
      message = "Authentication failed against database server. Please Check Your Credentials";
    } else if (err.errorCode === "P1001") {
      statusCode = status.BAD_REQUEST;
      message = "Can't reach database server";
    }
  } else if (err instanceof prismaNamespace_exports.PrismaClientUnknownRequestError) {
    errorName = err.name;
    statusCode = status.INTERNAL_SERVER_ERROR;
    message = "Error occurred during query execution";
    errorStack = err.stack;
  } else if (err instanceof ZodError) {
    statusCode = status.BAD_REQUEST;
    errorName = "ValidationError";
    errorStack = err.stack;
    const formattedIssues = err.issues.map((issue) => {
      const fieldPath = issue.path.length > 0 ? issue.path.join(".") : "field";
      return `${fieldPath}: ${issue.message}`;
    });
    message = formattedIssues.join("; ");
  } else if (isJwtError(err)) {
    errorName = err.name;
    message = "Invalid or expired token";
    errorStack = err.stack;
    statusCode = status.UNAUTHORIZED;
  } else if (err instanceof appError_default) {
    errorName = err.name;
    message = err.message;
    errorStack = err.stack;
    statusCode = err.code;
  } else if (typeof err.status === "number" && err.expose === true) {
    const httpError = err;
    errorName = "HttpError";
    statusCode = httpError.status;
    message = httpError.message;
    errorStack = httpError.stack;
  } else if (err instanceof Error) {
    errorName = err.name;
    errorStack = err.stack;
    message = err.message;
  }
  res.status(statusCode).json({
    success: false,
    errorName,
    message,
    stack: config_default.environment === "development" ? errorStack : void 0
  });
};
var globalErrorHandler_default = errorHandler;

// src/app/middleware/notFound.ts
import httpStatus from "http-status";
var notFound = (req, res) => {
  res.status(httpStatus.NOT_FOUND).json({
    message: "Route not found",
    path: req.originalUrl,
    date: /* @__PURE__ */ new Date()
  });
};

// src/app/middleware/rateLimit.ts
import crypto from "crypto";
import status2 from "http-status";

// src/app/utils/catchAsync.ts
var catchAsync = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

// src/app/middleware/rateLimit.ts
var rateLimit = (options) => {
  return catchAsync(async (req, _, next) => {
    if (config_default.rate_limit_bypass) {
      return next();
    }
    const identity = req.user?.id ?? req.ip ?? "anonymous";
    const key = `ratelimit:${options.prefix}:${identity}`;
    try {
      const now = Date.now();
      const windowStart = now - options.windowSeconds * 1e3;
      await redis_default.zRemRangeByScore(key, "0", String(windowStart));
      const count = await redis_default.zCard(key);
      if (count >= options.max) {
        throw new appError_default(
          status2.TOO_MANY_REQUESTS,
          "Too many requests. Please try again later."
        );
      }
      await redis_default.zAdd(key, {
        score: now,
        value: `${now}:${crypto.randomUUID()}`
      });
      await redis_default.expire(key, options.windowSeconds);
      return next();
    } catch (error) {
      if (error instanceof appError_default) {
        throw error;
      }
      return next();
    }
  });
};

// src/app/middleware/requestLogger.ts
import crypto2 from "crypto";
var requestLogger = () => (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  const requestId = typeof incoming === "string" && incoming.length > 0 ? incoming.slice(0, 100) : crypto2.randomUUID();
  res.setHeader("x-request-id", requestId);
  const path3 = req.originalUrl.split("?")[0] ?? req.originalUrl;
  const quiet = path3 === "/health" || path3 === "/ready" || // integration suites fire hundreds of requests — keep their output clean
  config_default.environment === "test";
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    if (quiet) {
      return;
    }
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    console.log(
      JSON.stringify({
        level: res.statusCode >= 500 ? "error" : "info",
        service: config_default.service_name ?? "gs-service",
        requestId,
        method: req.method,
        path: path3,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100
      })
    );
  });
  next();
};

// src/app/middleware/security.ts
import helmet from "helmet";
var securityHeaders = () => helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // JSON APIs are never framed
  frameguard: { action: "deny" }
});

// src/app.ts
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

// src/app/auth/auth.ts
import status3 from "http-status";

// src/app/utils/jwt.ts
import jwt2 from "jsonwebtoken";
var { JsonWebTokenError: JsonWebTokenError2 } = jwt2;
var verifyToken = (token, secret, options) => {
  try {
    const decode = jwt2.verify(token, secret, options);
    return {
      success: true,
      message: "token verified",
      data: decode,
      error: void 0
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof JsonWebTokenError2 ? err.message : "error while verifying token",
      data: void 0,
      error: err
    };
  }
};

// src/app/auth/auth.ts
var denylistKey = (userId) => `denylist:user:${userId}`;
var isDenied = async (userId) => {
  try {
    return await redis_default.get(denylistKey(userId)) !== null;
  } catch {
    return false;
  }
};
var auth = (...roles) => {
  return catchAsync(async (req, _, next) => {
    const bearerToken = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization?.split(" ")[1] : req.headers.authorization;
    const token = req.cookies?.access_token ?? bearerToken;
    if (!token) {
      throw new appError_default(
        status3.UNAUTHORIZED,
        "You are not logged in. Please log in to access this resource."
      );
    }
    const decoded = verifyToken(token, config_default.jwt_public_key, {
      algorithms: ["ES256"],
      issuer: config_default.jwt_issuer,
      audience: config_default.jwt_audience
    });
    if (!decoded.success || !decoded.data) {
      throw new appError_default(
        status3.UNAUTHORIZED,
        decoded.message || "Invalid or expired token"
      );
    }
    const claims = decoded.data;
    if (await isDenied(claims.sub)) {
      throw new appError_default(
        status3.UNAUTHORIZED,
        "Your session is no longer valid. Please log in again"
      );
    }
    if (roles.length > 0 && !roles.includes(claims.role)) {
      throw new appError_default(status3.FORBIDDEN, "You are unauthorized");
    }
    req.user = {
      id: claims.sub,
      role: claims.role,
      status: claims.status
    };
    next();
  });
};
var requireActive = () => {
  return catchAsync(async (req, _, next) => {
    const user = req.user;
    if (!user) {
      throw new appError_default(
        status3.BAD_REQUEST,
        "You are not logged in. Please log in to access this resource."
      );
    }
    if (user.status !== "ACTIVE") {
      throw new appError_default(
        status3.FORBIDDEN,
        "Your account is not active yet. Please contact support."
      );
    }
    next();
  });
};
var auth_default = auth;

// src/app/middleware/validateRequest.ts
var validateRequest = (schema) => {
  return catchAsync((req, _, next) => {
    const payload = req.body;
    const result = schema.parse(payload);
    req.body = result;
    next();
  });
};
var validateRequest_default = validateRequest;

// src/app/modules/designations/designations.route.ts
import { Router } from "express";

// src/app/lib/cache.ts
import crypto3 from "crypto";
var hashQuery = (query) => crypto3.createHash("sha256").update(JSON.stringify(query ?? {})).digest("hex").slice(0, 32);
var buildCacheKey = (service, route, query) => `cache:${service}:${route}:${hashQuery(query)}`;
var getCache = async (key) => {
  try {
    const raw3 = await redis_default.get(key);
    return raw3 ? JSON.parse(raw3) : null;
  } catch {
    return null;
  }
};
var setCache = async (key, value, ttlSeconds) => {
  try {
    await redis_default.set(key, JSON.stringify(value), {
      expiration: {
        type: "EX",
        value: Math.min(Math.max(ttlSeconds, 60), 300)
      }
    });
  } catch {
  }
};
var invalidateCachePrefix = async (prefix) => {
  try {
    let cursor = "0";
    do {
      const result = await redis_default.scan(cursor, {
        MATCH: `${prefix}*`,
        COUNT: 100
      });
      cursor = result.cursor;
      const keys = result.keys;
      if (keys.length > 0) {
        await redis_default.del(keys);
      }
    } while (cursor !== "0");
  } catch {
  }
};
var readThroughCache = async (key, ttlSeconds, compute) => {
  const cached = await getCache(key);
  if (cached !== null) {
    return cached;
  }
  const value = await compute();
  if (value !== null && value !== void 0) {
    await setCache(key, value, ttlSeconds);
  }
  return value;
};

// src/app/utils/sendResponse.ts
import status4 from "http-status";
var sendResponse = (res, payload) => {
  const responseStatus = payload.status ? payload.status : status4.OK;
  const responseSuccess = payload.success ? payload.success : true;
  const responseData = payload.data ? payload.data : void 0;
  const responseMeta = payload.meta ? payload.meta : void 0;
  res.status(responseStatus).json({
    success: responseSuccess,
    message: payload.message,
    data: responseData,
    meta: responseMeta
  });
};
var sendResponse_default = sendResponse;

// src/app/modules/designations/designations.schema.ts
import z from "zod";
var createDesignationSchema = z.object({
  tradeId: z.uuid("Invalid trade id"),
  name: z.string("Name is required").trim().min(1).max(120)
});
var updateDesignationSchema = z.object({
  name: z.string("Name must be string").trim().min(1).max(120).optional(),
  isActive: z.boolean("isActive must be boolean").optional()
});
var designationParamsSchema = z.object({
  id: z.uuid("Invalid designation id")
});
var listDesignationsQuerySchema = z.object({
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
  tradeId: z.uuid("Invalid trade id").optional()
});

// src/app/utils/audit.ts
var recordAudit = async (input) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actor?.id ?? null,
        service: input.service,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        ...input.diff === void 0 ? {} : { diff: input.diff }
      }
    });
  } catch (error) {
    console.log("Audit log could not be written", error);
  }
};

// src/app/modules/designations/designations.service.ts
import status5 from "http-status";
var tradeSelect = {
  id: true,
  code: true,
  nameBn: true,
  nameEn: true
};
var findDesignationOrThrow = async (id) => {
  const designation = await prisma.designation.findUnique({ where: { id } });
  if (!designation) {
    throw new appError_default(status5.NOT_FOUND, "Designation not found");
  }
  return designation;
};
var listDesignations = async (query) => {
  const page = Math.max(query.page ?? 1, 1);
  const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);
  const skip = (page - 1) * limit;
  const where = {
    isActive: true,
    ...query.tradeId ? { tradeId: query.tradeId } : {}
  };
  const [designations, total] = await Promise.all([
    prisma.designation.findMany({
      where,
      select: {
        id: true,
        name: true,
        isActive: true,
        tradeId: true,
        trade: { select: tradeSelect }
      },
      orderBy: { name: "asc" },
      skip,
      take: limit
    }),
    prisma.designation.count({ where })
  ]);
  const meta = {
    page,
    limit,
    dataCount: total,
    totalPages: Math.ceil(total / limit) || 1
  };
  return { data: designations, meta };
};
var createDesignation = async (actor, payload) => {
  const trade = await prisma.trade.findUnique({
    where: { id: payload.tradeId },
    select: { id: true }
  });
  if (!trade) {
    throw new appError_default(status5.BAD_REQUEST, "Trade not found");
  }
  const designation = await prisma.designation.create({
    data: {
      tradeId: payload.tradeId,
      name: payload.name,
      createdById: actor.id
    },
    include: { trade: { select: tradeSelect } }
  });
  await recordAudit({
    actor,
    service: "jobs",
    action: "jobs.created",
    entity: "designation",
    entityId: designation.id,
    diff: { name: designation.name, tradeId: designation.tradeId }
  });
  return designation;
};
var updateDesignation = async (actor, id, payload) => {
  await findDesignationOrThrow(id);
  const designation = await prisma.designation.update({
    where: { id },
    data: {
      ...payload.name === void 0 ? {} : { name: payload.name },
      ...payload.isActive === void 0 ? {} : { isActive: payload.isActive }
    },
    include: { trade: { select: tradeSelect } }
  });
  await recordAudit({
    actor,
    service: "jobs",
    action: "jobs.updated",
    entity: "designation",
    entityId: id,
    diff: { fields: Object.keys(payload) }
  });
  return designation;
};
var deleteDesignation = async (actor, id) => {
  const designation = await findDesignationOrThrow(id);
  const holders = await prisma.jobHolder.count({
    where: { designationId: id }
  });
  if (holders > 0) {
    throw new appError_default(
      status5.CONFLICT,
      "Designation is used by job holders and cannot be deleted"
    );
  }
  await prisma.designation.delete({ where: { id } });
  await recordAudit({
    actor,
    service: "jobs",
    action: "jobs.deleted",
    entity: "designation",
    entityId: id,
    diff: { name: designation.name }
  });
};
var DesignationService = {
  listDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation
};

// src/app/modules/designations/designations.controller.ts
var CACHE_PREFIX = "cache:jobs:designations";
var listDesignations2 = catchAsync(async (req, res) => {
  const query = listDesignationsQuerySchema.parse(req.query);
  const result = await readThroughCache(
    buildCacheKey("jobs", "designations", req.query),
    config_default.cache_ttl_reference,
    () => DesignationService.listDesignations(query)
  );
  sendResponse_default(res, {
    message: "Designations fetched Successfully",
    data: result.data,
    meta: result.meta
  });
});
var createDesignation2 = catchAsync(async (req, res) => {
  const actor = req.user;
  const result = await DesignationService.createDesignation(actor, req.body);
  await invalidateCachePrefix(CACHE_PREFIX);
  sendResponse_default(res, {
    status: 201,
    message: "Designation created Successfully",
    data: result
  });
});
var updateDesignation2 = catchAsync(async (req, res) => {
  const actor = req.user;
  const params = designationParamsSchema.parse(req.params);
  const result = await DesignationService.updateDesignation(
    actor,
    params.id,
    req.body
  );
  await invalidateCachePrefix(CACHE_PREFIX);
  sendResponse_default(res, {
    message: "Designation updated Successfully",
    data: result
  });
});
var deleteDesignation2 = catchAsync(async (req, res) => {
  const actor = req.user;
  const params = designationParamsSchema.parse(req.params);
  await DesignationService.deleteDesignation(actor, params.id);
  await invalidateCachePrefix(CACHE_PREFIX);
  sendResponse_default(res, { message: "Designation deleted Successfully" });
});
var DesignationController = {
  listDesignations: listDesignations2,
  createDesignation: createDesignation2,
  updateDesignation: updateDesignation2,
  deleteDesignation: deleteDesignation2
};

// src/app/modules/designations/designations.route.ts
var router = Router();
router.get("/", DesignationController.listDesignations);
router.post(
  "/",
  auth_default(Role.ADMIN, Role.MODERATOR),
  requireActive(),
  validateRequest_default(createDesignationSchema),
  DesignationController.createDesignation
);
router.patch(
  "/:id",
  auth_default(Role.ADMIN, Role.MODERATOR),
  requireActive(),
  validateRequest_default(updateDesignationSchema),
  DesignationController.updateDesignation
);
router.delete(
  "/:id",
  auth_default(Role.ADMIN),
  requireActive(),
  DesignationController.deleteDesignation
);
var DesignationRoutes = router;

// src/app/modules/health/health.route.ts
import { Router as Router2 } from "express";

// src/app/modules/health/health.controller.ts
import status6 from "http-status";
var healthCheck = catchAsync(async (_, res) => {
  let db = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    db = "down";
  }
  res.status(200).json({
    status: "ok",
    service: config_default.service_name,
    db
  });
});
var readyCheck = catchAsync(async (_, res) => {
  let db = "down";
  let redis = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    db = "down";
  }
  try {
    redis = await redis_default.ping() === "PONG" ? "up" : "down";
  } catch {
    redis = "down";
  }
  const ready = db === "up";
  res.status(ready ? status6.OK : status6.SERVICE_UNAVAILABLE).json({
    status: ready ? "ready" : "not-ready",
    service: config_default.service_name,
    db,
    redis
  });
});
var HealthController = { healthCheck, readyCheck };

// src/app/modules/health/health.route.ts
var router2 = Router2();
router2.get("/health", HealthController.healthCheck);
router2.get("/ready", HealthController.readyCheck);
var HealthRoutes = router2;

// src/app/modules/job-holders/job-holders.route.ts
import { Router as Router3 } from "express";

// src/app/lib/multer.ts
import multer from "multer";
import z2 from "zod";
var MAX_FILE_SIZE = 5 * 1024 * 1024;
var ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp"];
var storage = multer.memoryStorage();
var upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new appError_default(400, "Only jpeg, png and webp images are allowed"));
  }
});
var uploadSingle = (field) => {
  const single = upload.single(field);
  return (req, res, next) => {
    single(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        const message = error.code === "LIMIT_FILE_SIZE" ? "File is too large (max 5 MB)" : error.message;
        return next(new appError_default(400, message));
      }
      if (error) {
        return next(error);
      }
      next();
    });
  };
};
var multerFileSchema = z2.object({
  fieldname: z2.string(),
  originalname: z2.string(),
  encoding: z2.string(),
  mimetype: z2.string(),
  buffer: z2.instanceof(Buffer),
  size: z2.number()
});

// src/app/modules/job-holders/job-holders.schema.ts
import z3 from "zod";
var salaryField = z3.coerce.number("Salary must be a number").nonnegative("Salary can't be negative").max(999999999999e-2, "Salary is too large");
var createJobHolderSchema = z3.object({
  studentId: z3.uuid("Invalid student id"),
  photoUrl: z3.url("Invalid photo URL").max(500),
  designationId: z3.uuid("Invalid designation id"),
  workplaceId: z3.uuid("Invalid workplace id"),
  salary: salaryField
});
var updateJobHolderSchema = z3.strictObject({
  studentId: z3.uuid("Invalid student id").optional(),
  photoUrl: z3.union([z3.url("Invalid photo URL").max(500), z3.null()]).optional(),
  designationId: z3.union([z3.uuid("Invalid designation id"), z3.null()]).optional(),
  workplaceId: z3.union([z3.uuid("Invalid workplace id"), z3.null()]).optional(),
  salary: z3.union([salaryField, z3.null()]).optional()
});
var jobHolderParamsSchema = z3.object({
  id: z3.uuid("Invalid job holder id")
});
var listJobHoldersQuerySchema = z3.object({
  page: z3.coerce.number().int().optional(),
  limit: z3.coerce.number().int().optional(),
  tradeId: z3.uuid("Invalid trade id").optional(),
  workplaceId: z3.uuid("Invalid workplace id").optional(),
  search: z3.string().trim().optional()
});

// src/app/modules/job-holders/job-holders.service.ts
import status7 from "http-status";

// src/app/utils/uploadImage.ts
import streamifier from "streamifier";

// src/app/lib/cloudinary.ts
import { v2 as Cloudinary } from "cloudinary";
Cloudinary.config({
  cloud_name: config_default.cloudinary_cloud_name,
  api_key: config_default.cloudinary_api_key,
  api_secret: config_default.cloudinary_api_secret
});
var cloudinary = Cloudinary;

// src/app/utils/uploadImage.ts
var uploadImage = async (buffer, options) => {
  return await new Promise((resolve, reject) => {
    if (!buffer) {
      return resolve(null);
    }
    const upload_stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
        ...options
      },
      (err, result) => {
        if (err || !result) {
          console.log("Cloudinary error", err);
          return reject(
            new appError_default(err?.http_code, err?.message)
          );
        }
        return resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(upload_stream);
  });
};
var uploadImage_default = uploadImage;

// src/app/modules/job-holders/job-holders.service.ts
var mapViewRow = (row) => ({
  id: row.id,
  studentId: row.student_id,
  mrNo: row.mr_no,
  name: row.name,
  gender: row.gender,
  tradeId: row.trade_id,
  trade: row.trade,
  photoUrl: row.photo_url,
  designationId: row.designation_id,
  designation: row.designation,
  workplaceId: row.workplace_id,
  workplace: row.workplace,
  address: row.address,
  salary: row.salary === null ? null : Number(row.salary),
  donorId: row.donor_id
});
var findJobHolderOrThrow = async (id) => {
  const holder = await prisma.jobHolder.findUnique({ where: { id } });
  if (!holder) {
    throw new appError_default(status7.NOT_FOUND, "Job holder not found");
  }
  return holder;
};
var assertRelated = async (input) => {
  if (input.studentId) {
    const student = await prisma.studentInformation.findFirst({
      where: { id: input.studentId, deletedAt: null },
      select: { id: true }
    });
    if (!student) {
      throw new appError_default(status7.BAD_REQUEST, "Student not found");
    }
  }
  if (input.designationId) {
    const designation = await prisma.designation.findUnique({
      where: { id: input.designationId },
      select: { id: true, tradeId: true }
    });
    if (!designation) {
      throw new appError_default(status7.BAD_REQUEST, "Designation not found");
    }
    if (input.studentId) {
      const trades = await prisma.studentTrade.findMany({
        where: { studentId: input.studentId },
        select: { tradeId: true }
      });
      if (trades.length === 0) {
        throw new appError_default(
          status7.BAD_REQUEST,
          "Student has no enrolled trade; add a trade before creating a job holder"
        );
      }
      if (!trades.some((row) => row.tradeId === designation.tradeId)) {
        throw new appError_default(
          status7.BAD_REQUEST,
          "Designation does not belong to the student's trade"
        );
      }
    }
  }
  if (input.workplaceId) {
    const workplace = await prisma.workplace.findUnique({
      where: { id: input.workplaceId },
      select: { id: true }
    });
    if (!workplace) {
      throw new appError_default(status7.BAD_REQUEST, "Workplace not found");
    }
  }
};
var isUniqueViolation = (error) => typeof error === "object" && error !== null && error.code === "P2002";
var duplicateStudentHolder = () => new appError_default(
  status7.CONFLICT,
  "\u098F\u0987 \u09B8\u09CD\u099F\u09C1\u09A1\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u098F\u0995\u099F\u09BF \u099C\u09AC \u09B9\u09CB\u09B2\u09CD\u09A1\u09BE\u09B0 \u09B0\u09C7\u0995\u09B0\u09CD\u09A1 \u0986\u099B\u09C7"
);
var readViewRow = async (id) => {
  const rows = await prisma.$queryRaw`
		SELECT * FROM jobs.v_job_holders WHERE id = ${id}::uuid
	`;
  const row = rows[0];
  if (!row) {
    throw new appError_default(status7.NOT_FOUND, "Job holder not found");
  }
  return mapViewRow(row);
};
var listJobHolders = async (query) => {
  const page = Math.max(query.page ?? 1, 1);
  const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);
  const skip = (page - 1) * limit;
  const tradeId = query.tradeId ?? null;
  const workplaceId = query.workplaceId ?? null;
  const search = query.search ? `%${query.search}%` : null;
  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw`
			SELECT * FROM jobs.v_job_holders v
			WHERE (${tradeId}::uuid IS NULL OR v.trade_id = ${tradeId}::uuid)
				AND (${workplaceId}::uuid IS NULL OR v.workplace_id = ${workplaceId}::uuid)
				AND (${search}::text IS NULL OR v.name ILIKE ${search} OR v.mr_no ILIKE ${search}
					OR v.workplace ILIKE ${search} OR v.address ILIKE ${search}
					OR v.designation ILIKE ${search})
			ORDER BY v.name ASC
			LIMIT ${limit} OFFSET ${skip}
		`,
    prisma.$queryRaw`
			SELECT count(*)::bigint AS count FROM jobs.v_job_holders v
			WHERE (${tradeId}::uuid IS NULL OR v.trade_id = ${tradeId}::uuid)
				AND (${workplaceId}::uuid IS NULL OR v.workplace_id = ${workplaceId}::uuid)
				AND (${search}::text IS NULL OR v.name ILIKE ${search} OR v.mr_no ILIKE ${search}
					OR v.workplace ILIKE ${search} OR v.address ILIKE ${search}
					OR v.designation ILIKE ${search})
		`
  ]);
  const total = Number(countRows[0]?.count ?? 0);
  const meta = {
    page,
    limit,
    dataCount: total,
    totalPages: Math.ceil(total / limit) || 1
  };
  return { data: rows.map(mapViewRow), meta };
};
var getJobHolder = async (id) => readViewRow(id);
var createJobHolder = async (actor, payload) => {
  await assertRelated({
    studentId: payload.studentId,
    designationId: payload.designationId,
    workplaceId: payload.workplaceId
  });
  let holder;
  try {
    holder = await prisma.jobHolder.create({
      data: {
        studentId: payload.studentId,
        photoUrl: payload.photoUrl,
        designationId: payload.designationId,
        workplaceId: payload.workplaceId,
        salary: payload.salary,
        createdById: actor.id
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw duplicateStudentHolder();
    }
    throw error;
  }
  await recordAudit({
    actor,
    service: "jobs",
    action: "jobs.created",
    entity: "job_holder",
    entityId: holder.id,
    diff: { studentId: holder.studentId }
  });
  return readViewRow(holder.id);
};
var updateJobHolder = async (actor, id, payload) => {
  const existing = await findJobHolderOrThrow(id);
  const effectiveStudentId = payload.studentId === void 0 ? existing.studentId : payload.studentId;
  const effectiveDesignationId = payload.designationId === void 0 ? existing.designationId : payload.designationId;
  const linkChanged = payload.studentId !== void 0 || payload.designationId !== void 0;
  await assertRelated({
    ...payload.studentId === void 0 ? {} : { studentId: payload.studentId },
    ...linkChanged && effectiveStudentId && effectiveDesignationId ? {
      studentId: effectiveStudentId,
      designationId: effectiveDesignationId
    } : {},
    workplaceId: payload.workplaceId === void 0 ? existing.workplaceId : payload.workplaceId
  });
  let holder;
  try {
    holder = await prisma.jobHolder.update({
      where: { id },
      data: {
        ...payload.studentId === void 0 ? {} : { studentId: payload.studentId },
        ...payload.photoUrl === void 0 ? {} : { photoUrl: payload.photoUrl },
        ...payload.designationId === void 0 ? {} : { designationId: payload.designationId },
        ...payload.workplaceId === void 0 ? {} : { workplaceId: payload.workplaceId },
        ...payload.salary === void 0 ? {} : { salary: payload.salary }
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw duplicateStudentHolder();
    }
    throw error;
  }
  await recordAudit({
    actor,
    service: "jobs",
    action: "jobs.updated",
    entity: "job_holder",
    entityId: id,
    diff: { fields: Object.keys(payload) }
  });
  return readViewRow(holder.id);
};
var uploadJobHolderPhoto = async (file) => {
  if (!file) {
    throw new appError_default(status7.BAD_REQUEST, "Job holder photo is required");
  }
  const result = await uploadImage_default(file.buffer, { folder: "job holder" });
  if (!result) {
    throw new appError_default(status7.BAD_REQUEST, "Job holder photo upload failed");
  }
  return { url: result.secure_url, publicId: result.public_id };
};
var deleteJobHolder = async (actor, id) => {
  const holder = await findJobHolderOrThrow(id);
  await prisma.jobHolder.delete({ where: { id } });
  await recordAudit({
    actor,
    service: "jobs",
    action: "jobs.deleted",
    entity: "job_holder",
    entityId: id,
    diff: { studentId: holder.studentId }
  });
};
var JobHolderService = {
  listJobHolders,
  getJobHolder,
  createJobHolder,
  updateJobHolder,
  uploadJobHolderPhoto,
  deleteJobHolder
};

// src/app/modules/job-holders/job-holders.controller.ts
var CACHE_PREFIX2 = "cache:jobs:job-holders";
var listJobHolders2 = catchAsync(async (req, res) => {
  const query = listJobHoldersQuerySchema.parse(req.query);
  const result = await readThroughCache(
    buildCacheKey("jobs", "job-holders", req.query),
    config_default.cache_ttl_reference,
    () => JobHolderService.listJobHolders(query)
  );
  sendResponse_default(res, {
    message: "Job holders fetched Successfully",
    data: result.data,
    meta: result.meta
  });
});
var getJobHolder2 = catchAsync(async (req, res) => {
  const params = jobHolderParamsSchema.parse(req.params);
  const result = await readThroughCache(
    buildCacheKey("jobs", "job-holder", { id: params.id }),
    config_default.cache_ttl_reference,
    () => JobHolderService.getJobHolder(params.id)
  );
  sendResponse_default(res, {
    message: "Job holder fetched Successfully",
    data: result
  });
});
var createJobHolder2 = catchAsync(async (req, res) => {
  const actor = req.user;
  const result = await JobHolderService.createJobHolder(actor, req.body);
  await invalidateCachePrefix(CACHE_PREFIX2);
  sendResponse_default(res, {
    status: 201,
    message: "Job holder created Successfully",
    data: result
  });
});
var updateJobHolder2 = catchAsync(async (req, res) => {
  const actor = req.user;
  const params = jobHolderParamsSchema.parse(req.params);
  const result = await JobHolderService.updateJobHolder(
    actor,
    params.id,
    req.body
  );
  await invalidateCachePrefix(CACHE_PREFIX2);
  sendResponse_default(res, {
    message: "Job holder updated Successfully",
    data: result
  });
});
var uploadJobHolderPhoto2 = catchAsync(async (req, res) => {
  const result = await JobHolderService.uploadJobHolderPhoto(req.file);
  sendResponse_default(res, {
    status: 201,
    message: "Job holder photo uploaded Successfully",
    data: result
  });
});
var deleteJobHolder2 = catchAsync(async (req, res) => {
  const actor = req.user;
  const params = jobHolderParamsSchema.parse(req.params);
  await JobHolderService.deleteJobHolder(actor, params.id);
  await invalidateCachePrefix(CACHE_PREFIX2);
  sendResponse_default(res, { message: "Job holder deleted Successfully" });
});
var JobHolderController = {
  listJobHolders: listJobHolders2,
  getJobHolder: getJobHolder2,
  createJobHolder: createJobHolder2,
  updateJobHolder: updateJobHolder2,
  uploadJobHolderPhoto: uploadJobHolderPhoto2,
  deleteJobHolder: deleteJobHolder2
};

// src/app/modules/job-holders/job-holders.route.ts
var router3 = Router3();
router3.get(
  "/",
  auth_default(Role.ADMIN, Role.MODERATOR),
  requireActive(),
  JobHolderController.listJobHolders
);
router3.get(
  "/:id",
  auth_default(Role.ADMIN, Role.MODERATOR),
  requireActive(),
  JobHolderController.getJobHolder
);
router3.post(
  "/photo",
  auth_default(Role.ADMIN, Role.MODERATOR),
  requireActive(),
  uploadSingle("photo"),
  JobHolderController.uploadJobHolderPhoto
);
router3.post(
  "/",
  auth_default(Role.ADMIN, Role.MODERATOR),
  requireActive(),
  validateRequest_default(createJobHolderSchema),
  JobHolderController.createJobHolder
);
router3.patch(
  "/:id",
  auth_default(Role.ADMIN, Role.MODERATOR),
  requireActive(),
  validateRequest_default(updateJobHolderSchema),
  JobHolderController.updateJobHolder
);
router3.delete(
  "/:id",
  auth_default(Role.ADMIN),
  requireActive(),
  JobHolderController.deleteJobHolder
);
var JobHolderRoutes = router3;

// src/app/modules/workplaces/workplaces.route.ts
import { Router as Router4 } from "express";

// src/app/modules/workplaces/workplaces.schema.ts
import z4 from "zod";
var createWorkplaceSchema = z4.object({
  name: z4.string("Name is required").trim().min(1).max(160),
  address: z4.string("Address is required").trim().min(1).max(500),
  contact: z4.string("Contact must be string").trim().max(60).optional()
});
var updateWorkplaceSchema = z4.strictObject({
  name: z4.string("Name must be string").trim().min(1).max(160).optional(),
  address: z4.string("Address must be string").trim().min(1).max(500).optional(),
  contact: z4.union([z4.string().trim().max(60), z4.null()]).optional()
});
var workplaceParamsSchema = z4.object({
  id: z4.uuid("Invalid workplace id")
});
var listWorkplacesQuerySchema = z4.object({
  page: z4.coerce.number().int().optional(),
  limit: z4.coerce.number().int().optional(),
  search: z4.string().trim().optional()
});

// src/app/modules/workplaces/workplaces.service.ts
import status8 from "http-status";
var findWorkplaceOrThrow = async (id) => {
  const workplace = await prisma.workplace.findUnique({ where: { id } });
  if (!workplace) {
    throw new appError_default(status8.NOT_FOUND, "Workplace not found");
  }
  return workplace;
};
var listWorkplaces = async (query) => {
  const page = Math.max(query.page ?? 1, 1);
  const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);
  const skip = (page - 1) * limit;
  const where = query.search ? {
    OR: [
      { name: { contains: query.search, mode: "insensitive" } },
      { address: { contains: query.search, mode: "insensitive" } }
    ]
  } : {};
  const [workplaces, total] = await Promise.all([
    prisma.workplace.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit
    }),
    prisma.workplace.count({ where })
  ]);
  const meta = {
    page,
    limit,
    dataCount: total,
    totalPages: Math.ceil(total / limit) || 1
  };
  return { data: workplaces, meta };
};
var getWorkplace = async (id) => findWorkplaceOrThrow(id);
var createWorkplace = async (actor, payload) => {
  const workplace = await prisma.workplace.create({
    data: {
      name: payload.name,
      address: payload.address,
      ...payload.contact ? { contact: payload.contact } : {},
      createdById: actor.id
    }
  });
  await recordAudit({
    actor,
    service: "jobs",
    action: "jobs.created",
    entity: "workplace",
    entityId: workplace.id,
    diff: { name: workplace.name }
  });
  return workplace;
};
var updateWorkplace = async (actor, id, payload) => {
  await findWorkplaceOrThrow(id);
  const workplace = await prisma.workplace.update({
    where: { id },
    data: {
      ...payload.name === void 0 ? {} : { name: payload.name },
      ...payload.address === void 0 ? {} : { address: payload.address },
      ...payload.contact === void 0 ? {} : { contact: payload.contact }
    }
  });
  await recordAudit({
    actor,
    service: "jobs",
    action: "jobs.updated",
    entity: "workplace",
    entityId: id,
    diff: { fields: Object.keys(payload) }
  });
  return workplace;
};
var deleteWorkplace = async (actor, id) => {
  const workplace = await findWorkplaceOrThrow(id);
  const holders = await prisma.jobHolder.count({ where: { workplaceId: id } });
  if (holders > 0) {
    throw new appError_default(
      status8.CONFLICT,
      "Workplace is used by job holders and cannot be deleted"
    );
  }
  await prisma.workplace.delete({ where: { id } });
  await recordAudit({
    actor,
    service: "jobs",
    action: "jobs.deleted",
    entity: "workplace",
    entityId: id,
    diff: { name: workplace.name }
  });
};
var WorkplaceService = {
  listWorkplaces,
  getWorkplace,
  createWorkplace,
  updateWorkplace,
  deleteWorkplace
};

// src/app/modules/workplaces/workplaces.controller.ts
var CACHE_PREFIX3 = "cache:jobs:workplaces";
var listWorkplaces2 = catchAsync(async (req, res) => {
  const query = listWorkplacesQuerySchema.parse(req.query);
  const result = await readThroughCache(
    buildCacheKey("jobs", "workplaces", req.query),
    config_default.cache_ttl_reference,
    () => WorkplaceService.listWorkplaces(query)
  );
  sendResponse_default(res, {
    message: "Workplaces fetched Successfully",
    data: result.data,
    meta: result.meta
  });
});
var getWorkplace2 = catchAsync(async (req, res) => {
  const params = workplaceParamsSchema.parse(req.params);
  const result = await readThroughCache(
    buildCacheKey("jobs", "workplace", { id: params.id }),
    config_default.cache_ttl_reference,
    () => WorkplaceService.getWorkplace(params.id)
  );
  sendResponse_default(res, {
    message: "Workplace fetched Successfully",
    data: result
  });
});
var createWorkplace2 = catchAsync(async (req, res) => {
  const actor = req.user;
  const result = await WorkplaceService.createWorkplace(actor, req.body);
  await invalidateCachePrefix(CACHE_PREFIX3);
  sendResponse_default(res, {
    status: 201,
    message: "Workplace created Successfully",
    data: result
  });
});
var updateWorkplace2 = catchAsync(async (req, res) => {
  const actor = req.user;
  const params = workplaceParamsSchema.parse(req.params);
  const result = await WorkplaceService.updateWorkplace(
    actor,
    params.id,
    req.body
  );
  await invalidateCachePrefix(CACHE_PREFIX3);
  sendResponse_default(res, {
    message: "Workplace updated Successfully",
    data: result
  });
});
var deleteWorkplace2 = catchAsync(async (req, res) => {
  const actor = req.user;
  const params = workplaceParamsSchema.parse(req.params);
  await WorkplaceService.deleteWorkplace(actor, params.id);
  await invalidateCachePrefix(CACHE_PREFIX3);
  sendResponse_default(res, { message: "Workplace deleted Successfully" });
});
var WorkplaceController = {
  listWorkplaces: listWorkplaces2,
  getWorkplace: getWorkplace2,
  createWorkplace: createWorkplace2,
  updateWorkplace: updateWorkplace2,
  deleteWorkplace: deleteWorkplace2
};

// src/app/modules/workplaces/workplaces.route.ts
var router4 = Router4();
router4.get("/", WorkplaceController.listWorkplaces);
router4.get("/:id", WorkplaceController.getWorkplace);
router4.post(
  "/",
  auth_default(Role.ADMIN, Role.MODERATOR),
  requireActive(),
  validateRequest_default(createWorkplaceSchema),
  WorkplaceController.createWorkplace
);
router4.patch(
  "/:id",
  auth_default(Role.ADMIN, Role.MODERATOR),
  requireActive(),
  validateRequest_default(updateWorkplaceSchema),
  WorkplaceController.updateWorkplace
);
router4.delete(
  "/:id",
  auth_default(Role.ADMIN),
  requireActive(),
  WorkplaceController.deleteWorkplace
);
var WorkplaceRoutes = router4;

// src/app.ts
var app = express();
if (config_default.trust_proxy) {
  app.set(
    "trust proxy",
    config_default.trust_proxy === "true" ? 1 : Number(config_default.trust_proxy) || config_default.trust_proxy
  );
}
app.use(securityHeaders());
app.use(requestLogger());
app.use(
  cors({
    origin: config_default.frontend_urls,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(
  rateLimit({
    prefix: "global",
    windowSeconds: 60,
    max: config_default.rate_limit_global_max
  })
);
app.use(HealthRoutes);
app.use("/api/v1/designations", DesignationRoutes);
app.use("/api/v1/workplaces", WorkplaceRoutes);
app.use("/api/v1/job-holders", JobHolderRoutes);
app.get("/", async (_, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running"
  });
});
app.use(globalErrorHandler_default);
app.use(notFound);
var app_default = app;

// src/server.ts
var port = config_default.port;
if (!port) {
  throw new Error("port is missing in env");
}
var main = async () => {
  try {
    await prisma.$connect();
    console.log("Connected to database successfully");
    redis_default.connect().then(() => {
      console.log("Redis connected successfully");
    }).catch((error) => {
      console.error(
        "Redis initial connection failed; retrying in the background",
        error
      );
    });
    app_default.listen(port, () => {
      console.log(
        `${config_default.service_name ?? "gs-service"} is running on port: ${port}`
      );
    });
  } catch (error) {
    console.log(`Failed to start the server`, error);
    prisma.$disconnect();
    process.exit(1);
  }
};
main();
//# sourceMappingURL=server.js.map