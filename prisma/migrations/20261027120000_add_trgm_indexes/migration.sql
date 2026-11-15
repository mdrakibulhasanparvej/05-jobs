-- P9 / Q32 — search performance deviation (logged, approved as a logged deviation).
--
-- The design's schema ships no trigram indexes, but `GET /students?search=...`
-- uses ILIKE '%term%' on users.name/phone and students.sid/form_number, which
-- cannot use a btree index. The P9 load test measured p95 ≈ 615 ms on 12 000
-- rows (budget 300 ms), so pg_trgm GIN indexes are added here — a new migration
-- rather than a change to the P0 schema files.
--
-- Reversible: DROP INDEX ... ; DROP EXTENSION pg_trgm;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS users_name_trgm_idx
	ON identity.users USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS users_email_trgm_idx
	ON identity.users USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS users_phone_trgm_idx
	ON identity.users USING gin (phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS students_sid_trgm_idx
	ON academy.students USING gin (sid gin_trgm_ops);

CREATE INDEX IF NOT EXISTS students_form_number_trgm_idx
	ON academy.students USING gin (form_number gin_trgm_ops);
