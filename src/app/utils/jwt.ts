import type { SignOptions, VerifyOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import type { IJwtPayload } from "../types/index.js";

const { JsonWebTokenError } = jwt;

/**
 * D11 — gains an options pass-through so ES256 can pin the algorithm
 * (and verification can pin `algorithms` + `issuer` + `audience`).
 * Existing call shapes (`signToken(payload, secret, expiresIn?)`) still work
 * because the third parameter stays optional. Generic: access tokens sign
 * `IJwtPayload`, internal service tokens sign `{ sub: "svc:<name>" }` (D19).
 */
const signToken = <T extends object>(
	payload: T,
	secret: string,
	options?: SignOptions,
) => {
	return options
		? jwt.sign(payload, secret, options)
		: jwt.sign(payload, secret);
};

const verifyToken = <T extends object = IJwtPayload>(
	token: string,
	secret: string,
	options?: VerifyOptions,
) => {
	try {
		const decode = jwt.verify(token, secret, options) as T;
		return {
			success: true,
			message: "token verified",
			data: decode,
			error: undefined,
		};
	} catch (err: unknown) {
		return {
			success: false,
			message:
				err instanceof JsonWebTokenError
					? err.message
					: "error while verifying token",
			data: undefined,
			error: err,
		};
	}
};

export { signToken, verifyToken };
