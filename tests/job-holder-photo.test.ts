import { beforeEach, describe, expect, it, vi } from "vitest";
import uploadImage from "../src/app/utils/uploadImage";
import { api, createUser, resetDb, tokenFor, withAuth } from "./helpers";

vi.mock("../src/app/utils/uploadImage", () => ({ default: vi.fn() }));

const uploadMock = vi.mocked(uploadImage);

const UPLOAD_RESULT = {
	secure_url:
		"https://res.cloudinary.com/demo/image/upload/v1/job%20holder/new.png",
	public_id: "job holder/new",
};

const UPLOAD_RESPONSE = {
	url: UPLOAD_RESULT.secure_url,
	publicId: UPLOAD_RESULT.public_id,
};

const photo = () =>
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
		"base64",
	);

beforeEach(async () => {
	await resetDb();
	vi.clearAllMocks();
	uploadMock.mockResolvedValue(
		UPLOAD_RESULT as unknown as Awaited<ReturnType<typeof uploadImage>>,
	);
});

describe("job holder photo upload", () => {
	it("uploads a photo for admin and moderator", async () => {
		const admin = await createUser({
			email: "photo-admin@jobs.test",
			role: "ADMIN",
		});
		const moderator = await createUser({
			email: "photo-moderator@jobs.test",
			role: "MODERATOR",
		});

		const adminRes = await withAuth(
			api().post("/api/v1/job-holders/photo").attach("photo", photo(), {
				filename: "photo.png",
				contentType: "image/png",
			}),
			tokenFor(admin),
		);

		expect(adminRes.status).toBe(201);
		expect(adminRes.body).toMatchObject({
			success: true,
			message: "Job holder photo uploaded Successfully",
			data: UPLOAD_RESPONSE,
		});

		const moderatorRes = await withAuth(
			api().post("/api/v1/job-holders/photo").attach("photo", photo(), {
				filename: "photo.png",
				contentType: "image/png",
			}),
			tokenFor(moderator),
		);

		expect(moderatorRes.status).toBe(201);
		expect(moderatorRes.body).toMatchObject({
			success: true,
			message: "Job holder photo uploaded Successfully",
			data: UPLOAD_RESPONSE,
		});

		expect(uploadMock).toHaveBeenCalledWith(expect.any(Buffer), {
			folder: "job holder",
		});
		expect(uploadMock).toHaveBeenCalledTimes(2);
	});

	it("rejects a request without a file", async () => {
		const admin = await createUser({
			email: "photo-missing@jobs.test",
			role: "ADMIN",
		});

		const res = await withAuth(
			api().post("/api/v1/job-holders/photo"),
			tokenFor(admin),
		);

		expect(res.status).toBe(400);
		expect(uploadMock).not.toHaveBeenCalled();
	});

	it("rejects a student and anonymous callers", async () => {
		const student = await createUser({
			email: "photo-student@jobs.test",
			role: "STUDENT",
		});

		const studentRes = await withAuth(
			api().post("/api/v1/job-holders/photo").attach("photo", photo(), {
				filename: "photo.png",
				contentType: "image/png",
			}),
			tokenFor(student),
		);
		const anonymousRes = await api()
			.post("/api/v1/job-holders/photo")
			.attach("photo", photo(), {
				filename: "photo.png",
				contentType: "image/png",
			});

		expect(studentRes.status).toBe(403);
		expect(anonymousRes.status).toBe(401);
		expect(uploadMock).not.toHaveBeenCalled();
	});

	it("rejects a non-image upload without calling Cloudinary", async () => {
		const admin = await createUser({
			email: "photo-pdf@jobs.test",
			role: "ADMIN",
		});

		const res = await withAuth(
			api()
				.post("/api/v1/job-holders/photo")
				.attach("photo", Buffer.from("%PDF-1.4"), {
					filename: "photo.pdf",
					contentType: "application/pdf",
				}),
			tokenFor(admin),
		);

		expect(res.status).toBe(400);
		expect(uploadMock).not.toHaveBeenCalled();
	});
});
