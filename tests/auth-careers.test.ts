import { beforeEach, describe, it } from "vitest";
import {
	api,
	createDesignation,
	createTrade,
	createUser,
	createWorkplace,
	resetDb,
	tokenFor,
	withAuth,
} from "./helpers";

let adminToken: string;
let studentToken: string;

beforeEach(async () => {
	await resetDb();

	const admin = await createUser({ email: "jobs-admin@gs.test" });
	const student = await createUser({
		email: "jobs-student@gs.test",
		role: "STUDENT",
	});

	adminToken = tokenFor(admin);
	studentToken = tokenFor(student);
});

describe("writes require staff auth (gate 1)", () => {
	it("rejects anonymous writes with 401 and students with 403", async () => {
		const trade = await createTrade({ code: "auth-trade" });
		const designation = await createDesignation(trade.id, "Auth Designation");
		const workplace = await createWorkplace("Auth Workplace");

		const writes: Array<{
			method: "post" | "patch" | "delete";
			path: string;
			body?: Record<string, unknown>;
		}> = [
			{
				method: "post",
				path: "/api/v1/designations",
				body: { tradeId: trade.id, name: "X" },
			},
			{
				method: "patch",
				path: `/api/v1/designations/${designation.id}`,
				body: { name: "Y" },
			},
			{ method: "delete", path: `/api/v1/designations/${designation.id}` },
			{
				method: "post",
				path: "/api/v1/workplaces",
				body: { name: "X", address: "Y" },
			},
			{
				method: "patch",
				path: `/api/v1/workplaces/${workplace.id}`,
				body: { name: "Y" },
			},
			{ method: "delete", path: `/api/v1/workplaces/${workplace.id}` },
			{
				method: "post",
				path: "/api/v1/job-holders",
				body: { studentId: "00000000-0000-7000-8000-000000000000" },
			},
		];

		for (const write of writes) {
			const anonymous =
				write.method === "post"
					? api().post(write.path).send(write.body)
					: write.method === "patch"
						? api().patch(write.path).send(write.body)
						: api().delete(write.path);

			await anonymous.expect(401);

			const asStudent =
				write.method === "post"
					? withAuth(api().post(write.path).send(write.body), studentToken)
					: write.method === "patch"
						? withAuth(api().patch(write.path).send(write.body), studentToken)
						: withAuth(api().delete(write.path), studentToken);

			await asStudent.expect(403);
		}
	});

	it("lets staff write", async () => {
		const trade = await createTrade({ code: "staff-trade" });

		await withAuth(
			api()
				.post("/api/v1/designations")
				.send({ tradeId: trade.id, name: "Staff Designation" }),
			adminToken,
		).expect(201);
	});
});
