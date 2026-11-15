import z from "zod";

/** `salary` is numeric: "12,000" must be rejected, never silently coerced */
const salaryField = z.coerce
	.number("Salary must be a number")
	.nonnegative("Salary can't be negative")
	.max(9999999999.99, "Salary is too large");

/**
 * A job holder row only carries employment data. Person data (name, gender,
 * trade, donor, student photo) is resolved from the linked student; the
 * workplace address comes from the workplace table.
 */
export const createJobHolderSchema = z.object({
	studentId: z.uuid("Invalid student id"),
	photoUrl: z.url("Invalid photo URL").max(500),
	designationId: z.uuid("Invalid designation id"),
	workplaceId: z.uuid("Invalid workplace id"),
	salary: salaryField,
});

/** strict: unknown fields are rejected (§7.9 legacy $set bug) */
export const updateJobHolderSchema = z.strictObject({
	studentId: z.uuid("Invalid student id").optional(),
	photoUrl: z.union([z.url("Invalid photo URL").max(500), z.null()]).optional(),
	designationId: z
		.union([z.uuid("Invalid designation id"), z.null()])
		.optional(),
	workplaceId: z.union([z.uuid("Invalid workplace id"), z.null()]).optional(),
	salary: z.union([salaryField, z.null()]).optional(),
});

export const jobHolderParamsSchema = z.object({
	id: z.uuid("Invalid job holder id"),
});

export const listJobHoldersQuerySchema = z.object({
	page: z.coerce.number().int().optional(),
	limit: z.coerce.number().int().optional(),
	tradeId: z.uuid("Invalid trade id").optional(),
	workplaceId: z.uuid("Invalid workplace id").optional(),
	search: z.string().trim().optional(),
});

export type TCreateJobHolderPayload = z.infer<typeof createJobHolderSchema>;
export type TUpdateJobHolderPayload = z.infer<typeof updateJobHolderSchema>;
export type TListJobHoldersQuery = z.infer<typeof listJobHoldersQuerySchema>;
