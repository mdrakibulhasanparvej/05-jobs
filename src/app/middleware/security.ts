import helmet from "helmet";

/**
 * P9 hardening (Q31) — helmet for JSON APIs:
 * - keeps `nosniff`, `frameguard`, referrer policy and HSTS (proxy also sets it);
 * - disables CSP (no HTML is served) and COEP (breaks cross-origin assets);
 * - CORP is `cross-origin` so the frontend can embed Cloudinary images.
 * `X-Powered-By` is removed by helmet's hidePoweredBy.
 */
export const securityHeaders = () =>
	helmet({
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false,
		crossOriginResourcePolicy: { policy: "cross-origin" },
		// JSON APIs are never framed
		frameguard: { action: "deny" },
	});

export default securityHeaders;
