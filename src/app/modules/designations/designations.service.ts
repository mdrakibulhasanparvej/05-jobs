import AppError from "../../utils/appError";
import { recordAudit } from "../../utils/audit";
import { prisma } from "../../../db/client";
import status from "http-status";
import type { IMeta } from "../../types/index";
import type {
	TCreateDesignationPayload,
	TListDesignationsQuery,
	TUpdateDesignationPayload,
} from "./designations.schema";

type Actor = { id: string; role: Express.User["role"] };

const tradeSelect = {
	id: true,
	code: true,
	nameBn: true,
	nameEn: true,
} as const;

const findDesignationOrThrow = async (id: string) => {
	const designation = await prisma.designation.findUnique({ where: { id } });

	if (!designation) {
		throw new AppError(status.NOT_FOUND, "Designation not found");
	}

	return designation;
};

const listDesignations = async (query: TListDesignationsQuery) => {
	const page = Math.max(query.page ?? 1, 1);
	const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);
	const skip = (page - 1) * limit;

	const where = {
		isActive: true,
		...(query.tradeId ? { tradeId: query.tradeId } : {}),
	};

	const [designations, total] = await Promise.all([
		prisma.designation.findMany({
			where,
			select: {
				id: true,
				name: true,
				isActive: true,
				tradeId: true,
				trade: { select: tradeSelect },
			},
			orderBy: { name: "asc" },
			skip,
			take: limit,
		}),
		prisma.designation.count({ where }),
	]);

	const meta: IMeta = {
		page,
		limit,
		dataCount: total,
		totalPages: Math.ceil(total / limit) || 1,
	};

	return { data: designations, meta };
};

const createDesignation = async (
	actor: Actor,
	payload: TCreateDesignationPayload,
) => {
	const trade = await prisma.trade.findUnique({
		where: { id: payload.tradeId },
		select: { id: true },
	});

	if (!trade) {
		throw new AppError(status.BAD_REQUEST, "Trade not found");
	}

	// (tradeId, lower(name)) unique index → P2002 → 409
	const designation = await prisma.designation.create({
		data: {
			tradeId: payload.tradeId,
			name: payload.name,
			createdById: actor.id,
		},
		include: { trade: { select: tradeSelect } },
	});

	await recordAudit({
		actor,
		service: "jobs",
		action: "jobs.created",
		entity: "designation",
		entityId: designation.id,
		diff: { name: designation.name, tradeId: designation.tradeId },
	});

	return designation;
};

const updateDesignation = async (
	actor: Actor,
	id: string,
	payload: TUpdateDesignationPayload,
) => {
	await findDesignationOrThrow(id);

	const designation = await prisma.designation.update({
		where: { id },
		data: {
			...(payload.name === undefined ? {} : { name: payload.name }),
			...(payload.isActive === undefined ? {} : { isActive: payload.isActive }),
		},
		include: { trade: { select: tradeSelect } },
	});

	await recordAudit({
		actor,
		service: "jobs",
		action: "jobs.updated",
		entity: "designation",
		entityId: id,
		diff: { fields: Object.keys(payload) },
	});

	return designation;
};

const deleteDesignation = async (actor: Actor, id: string) => {
	const designation = await findDesignationOrThrow(id);

	const holders = await prisma.jobHolder.count({
		where: { designationId: id },
	});

	if (holders > 0) {
		throw new AppError(
			status.CONFLICT,
			"Designation is used by job holders and cannot be deleted",
		);
	}

	await prisma.designation.delete({ where: { id } });

	await recordAudit({
		actor,
		service: "jobs",
		action: "jobs.deleted",
		entity: "designation",
		entityId: id,
		diff: { name: designation.name },
	});
};

export const DesignationService = {
	listDesignations,
	createDesignation,
	updateDesignation,
	deleteDesignation,
};
