import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db/client";
import {
	api,
	createDesignation,
	createLinkedStudent,
	createUser,
	resetDb,
	tokenFor,
	withAuth,
} from "./helpers";

beforeEach(resetDb);

describe("job holders RBAC", () => {
	it("rejects anonymous callers on list and detail", async () => {
		const list = await api().get("/api/v1/job-holders");
		const detail = await api().get(
			"/api/v1/job-holders/00000000-0000-7000-8000-000000000000",
		);

		expect([401, 403]).toContain(list.status);
		expect([401, 403]).toContain(detail.status);
	});

	it("rejects a student token", async () => {
		const student = await createUser({
			email: "student@jobs-rbac.test",
			role: "STUDENT",
		});
		const res = await withAuth(
			api().get("/api/v1/job-holders"),
			tokenFor(student),
		);

		expect(res.status).toBe(403);
	});

	it("allows admin and moderator to list", async () => {
		const admin = await createUser({
			email: "admin@jobs-rbac.test",
			role: "ADMIN",
		});
		const moderator = await createUser({
			email: "moderator@jobs-rbac.test",
			role: "MODERATOR",
		});

		const adminRes = await withAuth(
			api().get("/api/v1/job-holders"),
			tokenFor(admin),
		);
		const moderatorRes = await withAuth(
			api().get("/api/v1/job-holders"),
			tokenFor(moderator),
		);

		expect(adminRes.status).toBe(200);
		expect(moderatorRes.status).toBe(200);
	});

	it("returns a 409 when a student already has a job holder", async () => {
		const admin = await createUser({
			email: "admin2@jobs-rbac.test",
			role: "ADMIN",
		});
		const token = tokenFor(admin);
		const linked = await createLinkedStudent({ name: "RBAC Student" });
		const workplace = await prisma.workplace.create({
			data: { name: "RBAC Workplace", address: "Dhaka" },
		});
		const designation = await createDesignation(
			linked.trade.id,
			"Trainer",
		);

		const payload = {
			studentId: linked.student.id,
			photoUrl: "https://cdn.gs.test/rbac-holder.png",
			designationId: designation.id,
			workplaceId: workplace.id,
			salary: 9000,
		};

		const first = await withAuth(
			api().post("/api/v1/job-holders").send(payload),
			token,
		);
		const second = await withAuth(
			api().post("/api/v1/job-holders").send(payload),
			token,
		);

		expect(first.status).toBe(201);
		expect(second.status).toBe(409);
		expect(second.body.message).toBe(
			"এই স্টুডেন্টের জন্য ইতিমধ্যে একটি জব হোল্ডার রেকর্ড আছে",
		);
	});
});
