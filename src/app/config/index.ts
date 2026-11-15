/** biome-ignore-all lint/style/noNonNullAssertion: <for env config> */
import path from "node:path";
import process, { env } from "node:process";
import dotenv from "dotenv";

const envPath = path.join(process.cwd(), "/.env");

dotenv.config({ path: envPath, quiet: true });

/** env PEM values carry literal `\n` escapes — unwrap them once, here */
const pem = (value: string | undefined): string =>
	value ? value.replaceAll("\\n", "\n") : (value as string);

export default {
	environment: env.ENVIRONMENT,
	service_name: env.SERVICE_NAME,
	port: env.PORT,
	frontend_url: env.FRONTEND_URL || "http://localhost:3000",
	database_url: env.DATABASE_URL!,
	bcrypt_salt_rounds: env.BCRYPT_SALT_ROUNDS!,

	// asymmetric JWT (D4): identity signs with the private key, every service
	// verifies with the public key — ES256 pins the algorithm (D11)
	jwt_private_key: pem(env.JWT_PRIVATE_KEY!),
	jwt_public_key: pem(env.JWT_PUBLIC_KEY!),
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
	frontend_urls: (
		env.FRONTEND_URLS ||
		env.FRONTEND_URL ||
		"http://localhost:3000"
	)
		.split(",")
		.map((url) => url.trim())
		.filter(Boolean),
	trust_proxy: env.TRUST_PROXY,
	cache_ttl_public: Number(env.CACHE_TTL_PUBLIC) || 120,
	cache_ttl_reference: Number(env.CACHE_TTL_REFERENCE) || 300,
	rate_limit_global_max: Number(env.RATE_LIMIT_GLOBAL_MAX) || 300,
	log_level: env.LOG_LEVEL || "info",

	// cloudinary credentials
	cloudinary_cloud_name: env.CLOUDINARY_CLOUD_NAME!,
	cloudinary_api_key: env.CLOUDINARY_API_KEY!,
	cloudinary_api_secret: env.CLOUDINARY_API_SECRET!,

	// redis credentials
	redis_username: env.REDIS_USERNAME,
	redis_password: env.REDIS_PASSWORD,
	redis_host: env.REDIS_HOST || "127.0.0.1",
	redis_port: env.REDIS_PORT || "6379",

	// nodemailer credentials
	email_sender: env.EMAIL_SENDER!,
	google_app_password: env.GOOGLE_APP_PASSWORD!,

	// google oauth (ID token audience)
	google_client_id: env.GOOGLE_CLIENT_ID,

	// stripe (adapter only — staging/tests, design §7.7)
	stripe_secret_key: env.STRIPE_SECRET_KEY,
	stripe_webhook_secret: env.STRIPE_WEBHOOK_SECRET,

	// billing guardrails
	min_donation_amount: env.MIN_DONATION_AMOUNT || "10",
};
