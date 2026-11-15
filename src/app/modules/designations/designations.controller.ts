import config from "../../config/index";
import {
	buildCacheKey,
	invalidateCachePrefix,
	readThroughCache,
} from "../../lib/cache";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
	designationParamsSchema,
	listDesignationsQuerySchema,
} from "./designations.schema";
import { DesignationService } from "./designations.service";

const CACHE_PREFIX = "cache:jobs:designations";

const listDesignations = catchAsync(async (req, res) => {
	const query = listDesignationsQuerySchema.parse(req.query);

	const result = await readThroughCache(
		buildCacheKey("jobs", "designations", req.query),
		config.cache_ttl_reference,
		() => DesignationService.listDesignations(query),
	);

	sendResponse(res, {
		message: "Designations fetched Successfully",
		data: result.data,
		meta: result.meta,
	});
});

const createDesignation = catchAsync(async (req, res) => {
	const actor = req.user as Express.User;

	const result = await DesignationService.createDesignation(actor, req.body);
	await invalidateCachePrefix(CACHE_PREFIX);

	sendResponse(res, {
		status: 201,
		message: "Designation created Successfully",
		data: result,
	});
});

const updateDesignation = catchAsync(async (req, res) => {
	const actor = req.user as Express.User;
	const params = designationParamsSchema.parse(req.params);

	const result = await DesignationService.updateDesignation(
		actor,
		params.id,
		req.body,
	);
	await invalidateCachePrefix(CACHE_PREFIX);

	sendResponse(res, {
		message: "Designation updated Successfully",
		data: result,
	});
});

const deleteDesignation = catchAsync(async (req, res) => {
	const actor = req.user as Express.User;
	const params = designationParamsSchema.parse(req.params);

	await DesignationService.deleteDesignation(actor, params.id);
	await invalidateCachePrefix(CACHE_PREFIX);

	sendResponse(res, { message: "Designation deleted Successfully" });
});

export const DesignationController = {
	listDesignations,
	createDesignation,
	updateDesignation,
	deleteDesignation,
};
