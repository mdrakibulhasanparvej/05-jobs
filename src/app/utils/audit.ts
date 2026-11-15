import { prisma } from "../../db/client";
import type { Prisma } from "../../generated/client";

/** D14 — the GS `audit_logs` row has `service` + `diff` and no actor snapshot. */
export interface IAuditActor {
	id: string;
}

export interface IRecordAuditInput {
	/** `null`/omitted = system action (webhook, fee-payment auto transition) */
	actor?: IAuditActor | null;
	/** owning service name, e.g. `identity`, `academy` */
	service: string;
	/** dotted verb, e.g. `student.status.update`, `payment.verified` */
	action: string;
	entity: string;
	entityId: string;
	diff?: Prisma.InputJsonValue;
}

/**
 * Single write path for the audit trail. Deliberately fire-and-forget: an audit
 * failure is logged and swallowed so it can never fail the business request
 * that triggered it. Called AFTER the business transaction commits.
 */
export const recordAudit = async (input: IRecordAuditInput): Promise<void> => {
	try {
		await prisma.auditLog.create({
			data: {
				actorId: input.actor?.id ?? null,
				service: input.service,
				action: input.action,
				entity: input.entity,
				entityId: input.entityId,
				...(input.diff === undefined ? {} : { diff: input.diff }),
			},
		});
	} catch (error) {
		console.log("Audit log could not be written", error);
	}
};

export default recordAudit;
