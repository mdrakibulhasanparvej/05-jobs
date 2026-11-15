import type { IMeta } from "../../types/index";
import AppError from "../../utils/appError";
import { recordAudit } from "../../utils/audit";
import { prisma } from "../../../db/client";
import type { Prisma } from "../../../generated/client";
import status from "http-status";
import type {
	TCreateWorkplacePayload,
	TListWorkplacesQuery,
	TUpdateWorkplacePayload,
} from "./workplaces.schema";

type Actor = { id: string; role: Express.User["role"] };

const findWorkplaceOrThrow = async (id: string) => {
	const workplace = await prisma.workplace.findUnique({ where: { id } });

	if (!workplace) {
		throw new AppError(status.NOT_FOUND, "Workplace not found");
	}

	return workplace;
};

const listWorkplaces = async (query: TListWorkplacesQuery) => {
	const page = Math.max(query.page ?? 1, 1);
	const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);
	const skip = (page - 1) * limit;

	const where: Prisma.WorkplaceWhereInput = query.search
		? {
				OR: [
					{ name: { contains: query.search, mode: "insensitive" } },
					{ address: { contains: query.search, mode: "insensitive" } },
				],
			}
		: {};

	const [workplaces, total] = await Promise.all([
		prisma.workplace.findMany({
			where,
			orderBy: { name: "asc" },
			skip,
			take: limit,
		}),
		prisma.workplace.count({ where }),
	]);

	const meta: IMeta = {
		page,
		limit,
		dataCount: total,
		totalPages: Math.ceil(total / limit) || 1,
	};

	return { data: workplaces, meta };
};

const getWorkplace = async (id: string) => findWorkplaceOrThrow(id);

const createWorkplace = async (
	actor: Actor,
	payload: TCreateWorkplacePayload,
) => {
	// lower(name) unique index → P2002 → 409
	const workplace = await prisma.workplace.create({
		data: {
			name: payload.name,
			address: payload.address,
			...(payload.contact ? { contact: payload.contact } : {}),
			createdById: actor.id,
		},
	});

	await recordAudit({
		actor,
		service: "jobs",
		action: "jobs.created",
		entity: "workplace",
		entityId: workplace.id,
		diff: { name: workplace.name },
	});

	return workplace;
};

const updateWorkplace = async (
	actor: Actor,
	id: string,
	payload: TUpdateWorkplacePayload,
) => {
	await findWorkplaceOrThrow(id);

	const workplace = await prisma.workplace.update({
		where: { id },
		data: {
			...(payload.name === undefined ? {} : { name: payload.name }),
			...(payload.address === undefined ? {} : { address: payload.address }),
			...(payload.contact === undefined ? {} : { contact: payload.contact }),
		},
	});

	await recordAudit({
		actor,
		service: "jobs",
		action: "jobs.updated",
		entity: "workplace",
		entityId: id,
		diff: { fields: Object.keys(payload) },
	});

	return workplace;
};

const deleteWorkplace = async (actor: Actor, id: string) => {
	const workplace = await findWorkplaceOrThrow(id);

	const holders = await prisma.jobHolder.count({ where: { workplaceId: id } });

	if (holders > 0) {
		throw new AppError(
			status.CONFLICT,
			"Workplace is used by job holders and cannot be deleted",
		);
	}

	await prisma.workplace.delete({ where: { id } });

	await recordAudit({
		actor,
		service: "jobs",
		action: "jobs.deleted",
		entity: "workplace",
		entityId: id,
		diff: { name: workplace.name },
	});
};

export const WorkplaceService = {
	listWorkplaces,
	getWorkplace,
	createWorkplace,
	updateWorkplace,
	deleteWorkplace,
};
