import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import z from "zod";
import AppError from "../utils/appError";

// D13 — design §7.6: 5 MB per-file cap + jpeg/png/webp whitelist (was 10 MB, open list)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.memoryStorage();

const upload = multer({
	storage: storage,
	limits: { fileSize: MAX_FILE_SIZE },
	fileFilter: (_, file, cb) => {
		if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
			return cb(null, true);
		}
		// AppError(400) — the global handler maps it to 400, not 500
		return cb(new AppError(400, "Only jpeg, png and webp images are allowed"));
	},
});

/**
 * `upload.single()` with multer errors normalized to 400 (D13). Without this
 * a >5 MB upload (MulterError LIMIT_FILE_SIZE) would surface as a 500.
 */
export const uploadSingle = (field: string) => {
	const single = upload.single(field);

	return (req: Request, res: Response, next: NextFunction) => {
		single(req, res, (error: unknown) => {
			if (error instanceof multer.MulterError) {
				const message =
					error.code === "LIMIT_FILE_SIZE"
						? "File is too large (max 5 MB)"
						: error.message;
				return next(new AppError(400, message));
			}
			if (error) {
				return next(error);
			}
			next();
		});
	};
};

export type TMulterFile = Express.Multer.File;

export const multerFileSchema = z.object({
	fieldname: z.string(),
	originalname: z.string(),
	encoding: z.string(),
	mimetype: z.string(),
	buffer: z.instanceof(Buffer),
	size: z.number(),
});

export default upload;
