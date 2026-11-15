import status from "http-status";
import { prisma } from "../../../db/client";
import type { IMeta } from "../../types/index";
import AppError from "../../utils/appError";
import { recordAudit } from "../../utils/audit";
import uploadImage from "../../utils/uploadImage";
import type {
	TCreateJobHolderPayload,
	TListJobHoldersQuery,
	TUpdateJobHolderPayload,
} from "./job-holders.schema";

type Actor = { id: string; role: Express.User["role"] };

interface IViewRow {
	id: string;
	student_id: string;
	mr_no: string | null;
	name: string;
	gender: string | null;
	trade_id: string | null;
	trade: string | null;
	photo_url: string | null;
	designation_id: string | null;
	designation: string | null;
	workplace_id: string | null;
	workplace: string | null;
	address: string | null;
	salary: string | null;
	donor_id: string | null;
}

const mapViewRow = (row: IViewRow) => ({
	id: row.id,
	studentId: row.student_id,
	mrNo: row.mr_no,
	name: row.name,
	gender: row.gender,
	tradeId: row.trade_id,
	trade: row.trade,
	photoUrl: row.photo_url,
	designationId: row.designation_id,
	designation: row.designation,
	workplaceId: row.workplace_id,
	workplace: row.workplace,
	address: row.address,
	salary: row.salary === null ? null : Number(row.salary),
	donorId: row.donor_id,
});

const findJobHolderOrThrow = async (id: string) => {
	const holder = await prisma.jobHolder.findUnique({ where: { id } });

	if (!holder) {
		throw new AppError(status.NOT_FOUND, "Job holder not found");
	}

	return holder;
};

const assertRelated = async (input: {
	studentId?: string | null;
	designationId?: string | null;
	workplaceId?: string | null;
}) => {
	if (input.studentId) {
		const student = await prisma.studentInformation.findFirst({
			where: { id: input.studentId, deletedAt: null },
			select: { id: true },
		});

		if (!student) {
			throw new AppError(status.BAD_REQUEST, "Student not found");
		}
	}

	if (input.designationId) {
		const designation = await prisma.designation.findUnique({
			where: { id: input.designationId },
			select: { id: true, tradeId: true },
		});

		if (!designation) {
			throw new AppError(status.BAD_REQUEST, "Designation not found");
		}

		// The create form only offers designations for the student's trade.
		if (input.studentId) {
			const trades = await prisma.studentTrade.findMany({
				where: { studentId: input.studentId },
				select: { tradeId: true },
			});

			if (trades.length === 0) {
				throw new AppError(
					status.BAD_REQUEST,
					"Student has no enrolled trade; add a trade before creating a job holder",
				);
			}

			if (!trades.some((row) => row.tradeId === designation.tradeId)) {
				throw new AppError(
					status.BAD_REQUEST,
					"Designation does not belong to the student's trade",
				);
			}
		}
	}

	if (input.workplaceId) {
		const workplace = await prisma.workplace.findUnique({
			where: { id: input.workplaceId },
			select: { id: true },
		});

		if (!workplace) {
			throw new AppError(status.BAD_REQUEST, "Workplace not found");
		}
	}
};

/**
 * `student_id` is the only unique constraint on `job_holders`, so a P2002 from
 * either write below is always "this student already has a holder".
 */
const isUniqueViolation = (error: unknown): boolean =>
	typeof error === "object" &&
	error !== null &&
	(error as { code?: unknown }).code === "P2002";

const duplicateStudentHolder = () =>
	new AppError(
		status.CONFLICT,
		"এই স্টুডেন্টের জন্য ইতিমধ্যে একটি জব হোল্ডার রেকর্ড আছে",
	);

const readViewRow = async (id: string) => {
	const rows = await prisma.$queryRaw<IViewRow[]>`
		SELECT * FROM jobs.v_job_holders WHERE id = ${id}::uuid
	`;

	const row = rows[0];

	if (!row) {
		throw new AppError(status.NOT_FOUND, "Job holder not found");
	}

	return mapViewRow(row);
};

/** public read model — every person/workplace value is joined, never copied */
const listJobHolders = async (query: TListJobHoldersQuery) => {
	const page = Math.max(query.page ?? 1, 1);
	const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);
	const skip = (page - 1) * limit;

	const tradeId = query.tradeId ?? null;
	const workplaceId = query.workplaceId ?? null;
	const search = query.search ? `%${query.search}%` : null;

	const [rows, countRows] = await Promise.all([
		prisma.$queryRaw<IViewRow[]>`
			SELECT * FROM jobs.v_job_holders v
			WHERE (${tradeId}::uuid IS NULL OR v.trade_id = ${tradeId}::uuid)
				AND (${workplaceId}::uuid IS NULL OR v.workplace_id = ${workplaceId}::uuid)
				AND (${search}::text IS NULL OR v.name ILIKE ${search} OR v.mr_no ILIKE ${search}
					OR v.workplace ILIKE ${search} OR v.address ILIKE ${search}
					OR v.designation ILIKE ${search})
			ORDER BY v.name ASC
			LIMIT ${limit} OFFSET ${skip}
		`,
		prisma.$queryRaw<Array<{ count: bigint }>>`
			SELECT count(*)::bigint AS count FROM jobs.v_job_holders v
			WHERE (${tradeId}::uuid IS NULL OR v.trade_id = ${tradeId}::uuid)
				AND (${workplaceId}::uuid IS NULL OR v.workplace_id = ${workplaceId}::uuid)
				AND (${search}::text IS NULL OR v.name ILIKE ${search} OR v.mr_no ILIKE ${search}
					OR v.workplace ILIKE ${search} OR v.address ILIKE ${search}
					OR v.designation ILIKE ${search})
		`,
	]);

	const total = Number(countRows[0]?.count ?? 0);

	const meta: IMeta = {
		page,
		limit,
		dataCount: total,
		totalPages: Math.ceil(total / limit) || 1,
	};

	return { data: rows.map(mapViewRow), meta };
};

const getJobHolder = async (id: string) => readViewRow(id);

const createJobHolder = async (
	actor: Actor,
	payload: TCreateJobHolderPayload,
) => {
	await assertRelated({
		studentId: payload.studentId,
		designationId: payload.designationId,
		workplaceId: payload.workplaceId,
	});

	let holder: { id: string; studentId: string };

	try {
		holder = await prisma.jobHolder.create({
			data: {
				studentId: payload.studentId,
				photoUrl: payload.photoUrl,
				designationId: payload.designationId,
				workplaceId: payload.workplaceId,
				salary: payload.salary,
				createdById: actor.id,
			},
		});
	} catch (error) {
		// P2002 on student_id — that student already has a holder record
		if (isUniqueViolation(error)) {
			throw duplicateStudentHolder();
		}
		throw error;
	}

	await recordAudit({
		actor,
		service: "jobs",
		action: "jobs.created",
		entity: "job_holder",
		entityId: holder.id,
		diff: { studentId: holder.studentId },
	});

	return readViewRow(holder.id);
};

const updateJobHolder = async (
	actor: Actor,
	id: string,
	payload: TUpdateJobHolderPayload,
) => {
	const existing = await findJobHolderOrThrow(id);

	// A salary/workplace-only edit must not re-check an old student that may have
	// been soft-deleted. Changing either side of the student ↔ designation link
	// validates the resulting pair as a unit.
	const effectiveStudentId =
		payload.studentId === undefined ? existing.studentId : payload.studentId;
	const effectiveDesignationId =
		payload.designationId === undefined
			? existing.designationId
			: payload.designationId;
	const linkChanged =
		payload.studentId !== undefined || payload.designationId !== undefined;

	await assertRelated({
		...(payload.studentId === undefined
			? {}
			: { studentId: payload.studentId }),
		...(linkChanged && effectiveStudentId && effectiveDesignationId
			? {
					studentId: effectiveStudentId,
					designationId: effectiveDesignationId,
				}
			: {}),
		workplaceId:
			payload.workplaceId === undefined
				? existing.workplaceId
				: payload.workplaceId,
	});

	let holder: { id: string };

	try {
		holder = await prisma.jobHolder.update({
			where: { id },
			data: {
				...(payload.studentId === undefined
					? {}
					: { studentId: payload.studentId }),
				...(payload.photoUrl === undefined
					? {}
					: { photoUrl: payload.photoUrl }),
				...(payload.designationId === undefined
					? {}
					: { designationId: payload.designationId }),
				...(payload.workplaceId === undefined
					? {}
					: { workplaceId: payload.workplaceId }),
				...(payload.salary === undefined ? {} : { salary: payload.salary }),
			},
		});
	} catch (error) {
		// linking a student who already has a holder record
		if (isUniqueViolation(error)) {
			throw duplicateStudentHolder();
		}
		throw error;
	}

	await recordAudit({
		actor,
		service: "jobs",
		action: "jobs.updated",
		entity: "job_holder",
		entityId: id,
		diff: { fields: Object.keys(payload) },
	});

	return readViewRow(holder.id);
};

/* ─────────────────────────── job holder photo ─────────────────────────── */

/** Cloudinary upload only — the caller passes `url` as `photoUrl` on create/update. */
const uploadJobHolderPhoto = async (file?: Express.Multer.File) => {
	if (!file) {
		throw new AppError(status.BAD_REQUEST, "Job holder photo is required");
	}

	const result = await uploadImage(file.buffer, { folder: "job holder" });

	if (!result) {
		throw new AppError(status.BAD_REQUEST, "Job holder photo upload failed");
	}

	return { url: result.secure_url, publicId: result.public_id };
};

const deleteJobHolder = async (actor: Actor, id: string) => {
	const holder = await findJobHolderOrThrow(id);

	await prisma.jobHolder.delete({ where: { id } });

	await recordAudit({
		actor,
		service: "jobs",
		action: "jobs.deleted",
		entity: "job_holder",
		entityId: id,
		diff: { studentId: holder.studentId },
	});
};

export const JobHolderService = {
	listJobHolders,
	getJobHolder,
	createJobHolder,
	updateJobHolder,
	uploadJobHolderPhoto,
	deleteJobHolder,
};
