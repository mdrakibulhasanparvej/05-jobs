-- Per-student shift: a student may override the batch-level shift.
ALTER TABLE "academy"."students" ADD COLUMN "shift" TEXT;
