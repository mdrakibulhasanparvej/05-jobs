import z from "zod";

export const createWorkplaceSchema = z.object({
	name: z.string("Name is required").trim().min(1).max(160),
	address: z.string("Address is required").trim().min(1).max(500),
	contact: z.string("Contact must be string").trim().max(60).optional(),
});

/** strict: the legacy endpoint allowed overwriting created_at (§7.9) */
export const updateWorkplaceSchema = z.strictObject({
	name: z.string("Name must be string").trim().min(1).max(160).optional(),
	address: z.string("Address must be string").trim().min(1).max(500).optional(),
	contact: z.union([z.string().trim().max(60), z.null()]).optional(),
});

export const workplaceParamsSchema = z.object({
	id: z.uuid("Invalid workplace id"),
});

export const listWorkplacesQuerySchema = z.object({
	page: z.coerce.number().int().optional(),
	limit: z.coerce.number().int().optional(),
	search: z.string().trim().optional(),
});

export type TCreateWorkplacePayload = z.infer<typeof createWorkplaceSchema>;
export type TUpdateWorkplacePayload = z.infer<typeof updateWorkplaceSchema>;
export type TListWorkplacesQuery = z.infer<typeof listWorkplacesQuerySchema>;
