/** Test bootstrap — runs before every test file imports the app. */
process.env.ENVIRONMENT = "test";
process.env.SERVICE_NAME = "jobs";
process.env.PORT = "5094";
process.env.DATABASE_URL =
	process.env.TEST_DATABASE_URL ??
	"postgresql://postgres:R%40kibul00@localhost:5432/gs_test";
process.env.BCRYPT_SALT_ROUNDS = "4";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.RATE_LIMIT_BYPASS = "true";
