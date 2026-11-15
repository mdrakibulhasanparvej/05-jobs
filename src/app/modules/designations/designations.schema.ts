import z from "zod";

export const createDesignationSchema = z.object({
	tradeId: z.uuid("Invalid trade id"),
	name: z.string("Name is required").trim().min(1).max(120),
});

export const updateDesignationSchema = z.object({
	name: z.string("Name must be string").trim().min(1).max(120).optional(),
	isActive: z.boolean("isActive must be boolean").optional(),
});

export const designationParamsSchema = z.object({
	id: z.uuid("Invalid designation id"),
});

export const listDesignationsQuerySchema = z.object({
	page: z.coerce.number().int().optional(),
	limit: z.coerce.number().int().optional(),
	tradeId: z.uuid("Invalid trade id").optional(),
});

export type TCreateDesignationPayload = z.infer<typeof createDesignationSchema>;
export type TUpdateDesignationPayload = z.infer<typeof updateDesignationSchema>;
export type TListDesignationsQuery = z.infer<
	typeof listDesignationsQuerySchema
>;
