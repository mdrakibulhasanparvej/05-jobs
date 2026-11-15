import { prisma } from "../src/db/client";
import { beforeEach, describe, expect, it } from "vitest";
import {
	api,
	createDesignation,
	createDonor,
	createLinkedStudent,
	createUser,
	createWorkplace,
	resetDb,
	tokenFor,
	withAuth,
} from "./helpers";

let adminToken: string;

const holderPayload = (
	studentId: string,
	designationId: string,
	workplaceId: string,
) => ({
	studentId,
	photoUrl: "https://cdn.gs.test/holder-photo.png",
	designationId,
	workplaceId,
	salary: 12000,
});

beforeEach(async () => {
	await resetDb();

	const admin = await createUser({ email: "holders-admin@gs.test" });
	adminToken = tokenFor(admin);
});

describe("job holder reads are joined from the student", () => {
	it("resolves name, trade, designation and donor through the view", async () => {
		const donor = await createDonor("View Donor");
		const linked = await createLinkedStudent({
			name: "Graduated Student",
			tradeCode: "view-trade",
			donorId: donor.id,
		});
		const designation = await createDesignation(
			linked.trade.id,
			"Junior Trainer",
		);
		const workplace = await createWorkplace("View Workplace");

		const created = await withAuth(
			api()
				.post("/api/v1/job-holders")
				.send(
					holderPayload(linked.student.id, designation.id, workplace.id),
				),
			adminToken,
		).expect(201);

		expect(created.body.data.name).toBe("Graduated Student");
		expect(created.body.data.mrNo).toBe(linked.student.mrNo);
		// the job holder's own photo is the one printed on the card
		expect(created.body.data.photoUrl).toBe(
			"https://cdn.gs.test/holder-photo.png",
		);
		expect(created.body.data.tradeId).toBe(linked.trade.id);
		expect(created.body.data.trade).toBe("Jobs Trade");
		expect(created.body.data.donorId).toBe(donor.id);
		expect(created.body.data.designationId).toBe(designation.id);
		expect(created.body.data.designation).toBe("Junior Trainer");
		expect(created.body.data.workplace).toBe("View Workplace");
		expect(created.body.data.address).toBe("Dhaka");
		expect(created.body.data.salary).toBe(12000);

		// DB row carries the employment fields only
		const row = await prisma.jobHolder.findUniqueOrThrow({
			where: { id: created.body.data.id },
		});

		expect(row.studentId).toBe(linked.student.id);
		expect(row.photoUrl).toBe("https://cdn.gs.test/holder-photo.png");
		expect(row.designationId).toBe(designation.id);
		expect(row.workplaceId).toBe(workplace.id);
		expect(Number(row.salary)).toBe(12000);

		// the staff list reads the same resolved values
		const list = await withAuth(
			api().get("/api/v1/job-holders"),
			adminToken,
		).expect(200);
		const listed = list.body.data.find(
			(entry: { id: string }) => entry.id === created.body.data.id,
		);

		expect(listed.name).toBe("Graduated Student");
		expect(listed.trade).toBe("Jobs Trade");
		expect(listed.designation).toBe("Junior Trainer");

		// detail is a view row too
		const detail = await withAuth(
			api().get(`/api/v1/job-holders/${created.body.data.id}`),
			adminToken,
		).expect(200);

		expect(detail.body.data.designation).toBe("Junior Trainer");
		expect(detail.body.data.workplaceId).toBe(workplace.id);
	});

	it("filters by trade, workplace and search", async () => {
		const linked = await createLinkedStudent({ name: "Searchable Holder" });
		const designation = await createDesignation(
			linked.trade.id,
			"Search Role",
		);
		const workplace = await createWorkplace("Search Workplace");

		await withAuth(
			api()
				.post("/api/v1/job-holders")
				.send(
					holderPayload(linked.student.id, designation.id, workplace.id),
				),
			adminToken,
		).expect(201);

		const byTrade = await withAuth(
			api().get(`/api/v1/job-holders?tradeId=${linked.trade.id}`),
			adminToken,
		).expect(200);
		expect(byTrade.body.data).toHaveLength(1);

		const byWorkplace = await withAuth(
			api().get(`/api/v1/job-holders?workplaceId=${workplace.id}`),
			adminToken,
		).expect(200);
		expect(byWorkplace.body.data).toHaveLength(1);

		const search = await withAuth(
			api().get("/api/v1/job-holders?search=searchable"),
			adminToken,
		).expect(200);
		expect(search.body.data).toHaveLength(1);

		const byMr = await withAuth(
			api().get(`/api/v1/job-holders?search=${linked.student.mrNo}`),
			adminToken,
		).expect(200);
		expect(byMr.body.data).toHaveLength(1);

		const miss = await withAuth(
			api().get("/api/v1/job-holders?search=nobody"),
			adminToken,
		).expect(200);
		expect(miss.body.data).toHaveLength(0);
	});
});

describe("job holder write validation", () => {
	it("requires a student link, designation and the employment fields", async () => {
		const response = await withAuth(
			api().post("/api/v1/job-holders").send({}),
			adminToken,
		).expect(400);

		expect(response.body.message).toBeTruthy();
	});

	it("rejects a designation from a different trade", async () => {
		const linked = await createLinkedStudent();
		const otherTrade = await createLinkedStudent({ name: "Other Trade" });
		const foreignDesignation = await createDesignation(
			otherTrade.trade.id,
			"Foreign Role",
		);
		const workplace = await createWorkplace("Foreign Workplace");

		await withAuth(
			api()
				.post("/api/v1/job-holders")
				.send(
					holderPayload(
						linked.student.id,
						foreignDesignation.id,
						workplace.id,
					),
				),
			adminToken,
		).expect(400);
	});

	it("rejects a formatted salary string instead of coercing it", async () => {
		const linked = await createLinkedStudent();
		const designation = await createDesignation(linked.trade.id, "Salary Role");
		const workplace = await createWorkplace("Salary Workplace");

		await withAuth(
			api()
				.post("/api/v1/job-holders")
				.send({
					...holderPayload(
						linked.student.id,
						designation.id,
						workplace.id,
					),
					salary: "12,000",
				}),
			adminToken,
		).expect(400);

		const numeric = await withAuth(
			api()
				.post("/api/v1/job-holders")
				.send({
					...holderPayload(
						linked.student.id,
						designation.id,
						workplace.id,
					),
					salary: 12000,
				}),
			adminToken,
		).expect(201);

		expect(numeric.body.data.salary).toBe(12000);
		expect(typeof numeric.body.data.salary).toBe("number");
	});

	it("rejects unknown fields on PATCH (strict)", async () => {
		const linked = await createLinkedStudent({ name: "Strict Holder" });
		const designation = await createDesignation(linked.trade.id, "Strict Role");
		const workplace = await createWorkplace("Strict Workplace");

		const created = await withAuth(
			api()
				.post("/api/v1/job-holders")
				.send(
					holderPayload(linked.student.id, designation.id, workplace.id),
				),
			adminToken,
		).expect(201);

		await withAuth(
			api()
				.patch(`/api/v1/job-holders/${created.body.data.id}`)
				.send({ designationId: designation.id, hacked: true }),
			adminToken,
		).expect(400);
	});

	it("switches the linked student and trade-wise designation, but never clears the student", async () => {
		const first = await createLinkedStudent({ name: "First Student" });
		const second = await createLinkedStudent({ name: "Second Student" });
		const firstDesignation = await createDesignation(
			first.trade.id,
			"First Role",
		);
		const secondDesignation = await createDesignation(
			second.trade.id,
			"Second Role",
		);
		const workplace = await createWorkplace("Switch Workplace");

		const created = await withAuth(
			api()
				.post("/api/v1/job-holders")
				.send(
					holderPayload(
						first.student.id,
						firstDesignation.id,
						workplace.id,
					),
				),
			adminToken,
		).expect(201);

		const switched = await withAuth(
			api()
				.patch(`/api/v1/job-holders/${created.body.data.id}`)
				.send({
					studentId: second.student.id,
					designationId: secondDesignation.id,
				}),
			adminToken,
		).expect(200);

		expect(switched.body.data.name).toBe("Second Student");
		expect(switched.body.data.studentId).toBe(second.student.id);
		expect(switched.body.data.designation).toBe("Second Role");
		expect(switched.body.data.tradeId).toBe(second.trade.id);

		await withAuth(
			api()
				.patch(`/api/v1/job-holders/${created.body.data.id}`)
				.send({ studentId: null }),
			adminToken,
		).expect(400);

		// the same student cannot be linked twice (@unique)
		await withAuth(
			api()
				.post("/api/v1/job-holders")
				.send(
					holderPayload(
						second.student.id,
						secondDesignation.id,
						workplace.id,
					),
				),
			adminToken,
		).expect(409);
	});

	it("deletes a job holder", async () => {
		const linked = await createLinkedStudent({ name: "Delete Holder" });
		const designation = await createDesignation(linked.trade.id, "Delete Role");
		const workplace = await createWorkplace("Delete Workplace");

		const created = await withAuth(
			api()
				.post("/api/v1/job-holders")
				.send(
					holderPayload(linked.student.id, designation.id, workplace.id),
				),
			adminToken,
		).expect(201);

		await withAuth(
			api().delete(`/api/v1/job-holders/${created.body.data.id}`),
			adminToken,
		).expect(200);

		expect(
			await prisma.jobHolder.count({ where: { id: created.body.data.id } }),
		).toBe(0);
	});

	it("audits every write", async () => {
		const linked = await createLinkedStudent({ name: "Audited Holder" });
		const designation = await createDesignation(linked.trade.id, "Audit Role");
		const workplace = await createWorkplace("Audit Workplace");

		const created = await withAuth(
			api()
				.post("/api/v1/job-holders")
				.send(
					holderPayload(linked.student.id, designation.id, workplace.id),
				),
			adminToken,
		).expect(201);

		await withAuth(
			api()
				.patch(`/api/v1/job-holders/${created.body.data.id}`)
				.send({ salary: 5000 }),
			adminToken,
		).expect(200);

		await withAuth(
			api().delete(`/api/v1/job-holders/${created.body.data.id}`),
			adminToken,
		).expect(200);

		const audits = await prisma.auditLog.findMany({
			where: { entity: "job_holder", entityId: created.body.data.id },
			orderBy: { createdAt: "asc" },
		});

		expect(audits.map((row) => row.action)).toEqual([
			"jobs.created",
			"jobs.updated",
			"jobs.deleted",
		]);
	});
});
