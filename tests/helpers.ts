import crypto from "node:crypto";
import config from "../src/app/config/index";
import { signToken } from "../src/app/utils/jwt";
import { prisma } from "../src/db/client";
import type { Role } from "../src/generated/enums";
import request from "supertest";
import app from "../src/app";

export const api = () => request(app);

export const resetDb = async () => {
	await prisma.$executeRawUnsafe("TRUNCATE TABLE identity.users CASCADE");
	await prisma.$executeRawUnsafe("TRUNCATE TABLE academy.trades CASCADE");
	await prisma.$executeRawUnsafe("TRUNCATE TABLE academy.donors CASCADE");
	await prisma.$executeRawUnsafe("TRUNCATE TABLE jobs.job_holders CASCADE");
	await prisma.$executeRawUnsafe("TRUNCATE TABLE jobs.designations CASCADE");
	await prisma.$executeRawUnsafe("TRUNCATE TABLE jobs.workplaces CASCADE");
	await prisma.$executeRawUnsafe(
		"TRUNCATE TABLE identity.audit_logs RESTART IDENTITY",
	);
};

export const createUser = async (input: {
	email: string;
	role?: Role;
	name?: string;
	avatarUrl?: string;
}) =>
	prisma.user.create({
		data: {
			email: input.email,
			name: input.name ?? "Jobs User",
			role: input.role ?? "ADMIN",
			status: "ACTIVE",
			emailVerifiedAt: new Date(),
			...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
		},
	});

export const tokenFor = (user: {
	id: string;
	role: Role;
	status: "PENDING" | "ACTIVE" | "REJECTED" | "BLOCKED";
}) =>
	signToken(
		{ sub: user.id, role: user.role, status: user.status },
		config.jwt_private_key,
		{
			algorithm: "ES256",
			expiresIn: "15m",
			issuer: config.jwt_issuer,
			audience: config.jwt_audience,
		},
	);

export const withAuth = (req: request.Test, token: string) =>
	req.set("Authorization", `Bearer ${token}`);

export const createTrade = async (input?: { code?: string }) =>
	prisma.trade.create({
		data: {
			code: input?.code ?? `job-trade-${crypto.randomUUID().slice(0, 8)}`,
			nameEn: "Jobs Trade",
			nameBn: "ট্রেড",
		},
	});

export const createDonor = async (
	name = `Donor ${crypto.randomUUID().slice(0, 6)}`,
) => prisma.donor.create({ data: { name } });

/** student + enrolment + batch + trade for the view resolution */
export const createLinkedStudent = async (input?: {
	name?: string;
	avatarUrl?: string;
	tradeCode?: string;
	donorId?: string;
}) => {
	const trade = await createTrade({ code: input?.tradeCode });
	const suffix = crypto.randomUUID().slice(0, 8);

	const batch = await prisma.batch.create({
		data: {
			tradeId: trade.id,
			batchNumber: "1",
			batchCode: `JB-${suffix}`,
			...(input?.donorId ? { donorId: input.donorId } : {}),
		},
	});

	const shift = await prisma.tradeShift.create({
		data: { tradeId: trade.id, code: "A", startTime: "09:00", endTime: "13:00" },
	});

	await prisma.batchShift.create({
		data: { batchId: batch.id, tradeShiftId: shift.id },
	});

	const student = await prisma.studentInformation.create({
		data: {
			formNo: `JOB-${suffix}`,
			mrNo: `MR-${suffix}`,
			name: input?.name ?? "Linked Student",
			gender: "MALE",
			phone: `017${suffix.slice(0, 8)}`,
			nidOrBirthNo: `NID-${suffix}`,
			birthDate: new Date("2000-01-01"),
		},
	});

	await prisma.studentTrade.create({
		data: {
			studentId: student.id,
			tradeId: trade.id,
			batchId: batch.id,
			tradeShiftId: shift.id,
			status: "APPROVED",
		},
	});

	return { trade, batch, shift, student };
};

export const createDesignation = async (
	tradeId: string,
	name = "Designation",
) => prisma.designation.create({ data: { tradeId, name } });

export const createWorkplace = async (name = "Workplace") =>
	prisma.workplace.create({
		data: { name, address: "Dhaka" },
	});
