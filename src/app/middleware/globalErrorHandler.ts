import { Prisma } from "../../generated/client";
import type { NextFunction, Request, Response } from "express";
import status from "http-status";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import config from "../config";
import AppError from "../utils/appError";

const { JsonWebTokenError } = jwt;

/**
 * `instanceof` alone is not enough: in the bundled build jsonwebtoken can be
 * instantiated twice, so a real JsonWebTokenError/TokenExpiredError may fail the
 * check. Match the stable `name` as well.
 */
const isJwtError = (err: unknown): err is Error =>
	err instanceof JsonWebTokenError ||
	(err instanceof Error &&
		(err.name === "JsonWebTokenError" || err.name === "TokenExpiredError"));

/**
 * D10 — only the two Prisma request-error branches changed from Task Orbit:
 * `P2002 → 409`, `P2025 → 404` (design §7.2). Everything else is identical.
 */
const errorHandler = async (
	err: unknown,
	_: Request,
	res: Response,
	__: NextFunction,
) => {
	let statusCode: number = status.INTERNAL_SERVER_ERROR;
	let message: string = "";
	let errorName: string = "Internal Server Error";
	let errorStack: string | undefined;

	if (err instanceof Prisma.PrismaClientValidationError) {
		errorName = err.name;
		statusCode = status.BAD_REQUEST;
		message = "You have provided incorrect field type or missing fields";
		errorStack = err.stack;
	} else if (err instanceof Prisma.PrismaClientKnownRequestError) {
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
			message =
				"An operation failed because it depends on one or more records that were required but not found.";
		} else {
			statusCode = status.BAD_REQUEST;
			message = "Database request failed";
		}
	} else if (err instanceof Prisma.PrismaClientInitializationError) {
		errorName = err.name;
		errorStack = err.stack;
		if (err.errorCode === "P1000") {
			statusCode = status.UNAUTHORIZED;
			message =
				"Authentication failed against database server. Please Check Your Credentials";
		} else if (err.errorCode === "P1001") {
			statusCode = status.BAD_REQUEST;
			message = "Can't reach database server";
		}
	} else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
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
		// Same contract as auth(): 401 tells the browser to refresh the session.
		message = "Invalid or expired token";
		errorStack = err.stack;
		statusCode = status.UNAUTHORIZED;
	} else if (err instanceof AppError) {
		errorName = err.name;
		message = err.message;
		errorStack = err.stack;
		statusCode = err.code;
	} else if (
		typeof (err as { status?: unknown }).status === "number" &&
		(err as { expose?: unknown }).expose === true
	) {
		// http-errors (express.json / body-parser): 413 payload too large,
		// 400 malformed body — keep their status instead of a generic 500
		const httpError = err as {
			status: number;
			message: string;
			stack?: string;
		};
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
		stack: config.environment === "development" ? errorStack : undefined,
	});
};

export default errorHandler;
