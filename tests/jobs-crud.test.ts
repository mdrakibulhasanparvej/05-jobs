import { prisma } from "../src/db/client";
import { beforeEach, describe, expect, it } from "vitest";
import {
	api,
	createDesignation,
	createLinkedStudent,
	createTrade,
	createUser,
	createWorkplace,
	resetDb,
	tokenFor,
	withAuth,
} from "./helpers";

let adminToken: string;

beforeEach(async () => {
	await resetDb();

	const admin = await createUser({ email: "crud-admin@gs.test" });
	adminToken = tokenFor(admin);
});

describe("trade-wise designations (case-insensitive uniqueness)", () => {
	it("rejects duplicate designations inside a trade, but not across trades", async () => {
		const first = await createTrade({ code: "first-trade" });
		const second = await createTrade({ code: "second-trade" });

		await withAuth(
			api()
				.post("/api/v1/designations")
				.send({ tradeId: first.id, name: "Trainer" }),
			adminToken,
		).expect(201);

		await withAuth(
			api()
				.post("/api/v1/designations")
				.send({ tradeId: first.id, name: "trainer" }),
			adminToken,
		).expect(409);

		// same name under another trade is fine
		await withAuth(
			api()
				.post("/api/v1/designations")
				.send({ tradeId: second.id, name: "Trainer" }),
			adminToken,
		).expect(201);
	});

	it("filters the designation list by trade", async () => {
		const first = await createTrade({ code: "filter-first" });
		const second = await createTrade({ code: "filter-second" });
		const firstDesignation = await createDesignation(first.id, "First Role");
		await createDesignation(second.id, "Second Role");

		const response = await api()
			.get(`/api/v1/designations?tradeId=${first.id}`)
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].id).toBe(firstDesignation.id);
		expect(response.body.data[0].trade.id).toBe(first.id);
	});

	it("paginates the designation list", async () => {
		const trade = await createTrade({ code: "paged-trade" });

		for (let index = 1; index <= 12; index += 1) {
			await createDesignation(trade.id, `Role ${index.toString().padStart(2, "0")}`);
		}

		const firstPage = await api()
			.get("/api/v1/designations?page=1&limit=10")
			.expect(200);

		expect(firstPage.body.data).toHaveLength(10);
		expect(firstPage.body.meta).toEqual({
			page: 1,
			limit: 10,
			dataCount: 12,
			totalPages: 2,
		});

		const secondPage = await api()
			.get("/api/v1/designations?page=2&limit=10")
			.expect(200);

		expect(secondPage.body.data).toHaveLength(2);
	});

	it("rejects duplicate workplace names case-insensitively", async () => {
		await withAuth(
			api()
				.post("/api/v1/workplaces")
				.send({ name: "Grameen Office", address: "Dhaka" }),
			adminToken,
		).expect(201);

		await withAuth(
			api()
				.post("/api/v1/workplaces")
				.send({ name: "grameen office", address: "Chattogram" }),
			adminToken,
		).expect(409);
	});
});

describe("delete integrity (gate 5)", () => {
	it("refuses to delete a designation or workplace used by a job holder", async () => {
		const linked = await createLinkedStudent();
		const designation = await createDesignation(linked.trade.id, "Trainer");
		const workplace = await createWorkplace("Office");

		await withAuth(
			api().post("/api/v1/job-holders").send({
				studentId: linked.student.id,
				photoUrl: "https://cdn.gs.test/holder.png",
				designationId: designation.id,
				workplaceId: workplace.id,
				salary: 10000,
			}),
			adminToken,
		).expect(201);

		const blockedDesignation = await withAuth(
			api().delete(`/api/v1/designations/${designation.id}`),
			adminToken,
		).expect(409);

		expect(blockedDesignation.body.message).toMatch(/job holders/i);

		const blockedWorkplace = await withAuth(
			api().delete(`/api/v1/workplaces/${workplace.id}`),
			adminToken,
		).expect(409);

		expect(blockedWorkplace.body.message).toMatch(/job holders/i);
	});

	it("deletes a designation that is no longer referenced by job holders", async () => {
		const trade = await createTrade({ code: "free-trade" });
		const designation = await createDesignation(trade.id, "Free Role");

		await withAuth(
			api().delete(`/api/v1/designations/${designation.id}`),
			adminToken,
		).expect(200);

		expect(
			await prisma.designation.count({ where: { id: designation.id } }),
		).toBe(0);
	});
});

describe("public reads (Q21)", () => {
	it("returns only active designations", async () => {
		const trade = await createTrade({ code: "active-trade" });
		const designation = await createDesignation(trade.id, "Active Role");

		await prisma.designation.update({
			where: { id: designation.id },
			data: { isActive: false },
		});

		const designations = await api().get("/api/v1/designations").expect(200);
		expect(
			designations.body.data.some(
				(row: { id: string }) => row.id === designation.id,
			),
		).toBe(false);
	});
});
