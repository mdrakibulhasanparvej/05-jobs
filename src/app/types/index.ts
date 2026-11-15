import type { Role, UserStatus } from "../../generated/enums";

export interface IMeta {
	limit: number;
	page: number;
	totalPages: number;
	dataCount: number;
}

export interface IResponsePayload<T = unknown> {
	status?: number;
	success?: boolean;
	message: string;
	data?: T;
	meta?: IMeta;
}

/** ES256 access-token claims — design §7.3 (D12): `{sub, role, status}`, no email */
export interface IJwtPayload {
	sub: string;
	role: Role;
	status: UserStatus;
}

/** `req.user` — attached by `auth()` from the verified token, no DB read (D12) */
export interface RequestUser {
	id: string;
	role: Role;
	status: UserStatus;
}

/** attached by `serviceAuth()` for `aud=internal` service tokens (D19) */
export interface RequestService {
	service: string;
}

export interface IQuery {
	searchTerm?: string;
	page?: string;
	limit?: string;
	sortOrder?: "asc" | "desc";
	sortBy?: string;

	// biome-ignore lint/suspicious/noExplicitAny: <flexible query params>
	[key: string]: any;
}
