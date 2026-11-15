import { Stripe } from "stripe";
import config from "../config";
import AppError from "../utils/appError";

/**
 * Used only by the StripeAdapter (billing gateways) — design §7.7 keeps
 * Stripe staging/tests-only, so a missing key is fine for every other service.
 */
const stripeSecretKey = config.stripe_secret_key;

if (!stripeSecretKey) {
	throw new AppError(404, "Stripe secret key missing");
}

const stripe = new Stripe(stripeSecretKey);

export default stripe;
