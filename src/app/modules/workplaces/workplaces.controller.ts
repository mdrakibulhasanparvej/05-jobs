import config from "../../config/index";
import {
	buildCacheKey,
	invalidateCachePrefix,
	readThroughCache,
} from "../../lib/cache";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
	listWorkplacesQuerySchema,
	workplaceParamsSchema,
} from "./workplaces.schema";
import { WorkplaceService } from "./workplaces.service";

const CACHE_PREFIX = "cache:jobs:workplaces";

const listWorkplaces = catchAsync(async (req, res) => {
	const query = listWorkplacesQuerySchema.parse(req.query);

	const result = await readThroughCache(
		buildCacheKey("jobs", "workplaces", req.query),
		config.cache_ttl_reference,
		() => WorkplaceService.listWorkplaces(query),
	);

	sendResponse(res, {
		message: "Workplaces fetched Successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getWorkplace = catchAsync(async (req, res) => {
	const params = workplaceParamsSchema.parse(req.params);

	const result = await readThroughCache(
		buildCacheKey("jobs", "workplace", { id: params.id }),
		config.cache_ttl_reference,
		() => WorkplaceService.getWorkplace(params.id),
	);

	sendResponse(res, {
		message: "Workplace fetched Successfully",
		data: result,
	});
});

const createWorkplace = catchAsync(async (req, res) => {
	const actor = req.user as Express.User;

	const result = await WorkplaceService.createWorkplace(actor, req.body);
	await invalidateCachePrefix(CACHE_PREFIX);

	sendResponse(res, {
		status: 201,
		message: "Workplace created Successfully",
		data: result,
	});
});

const updateWorkplace = catchAsync(async (req, res) => {
	const actor = req.user as Express.User;
	const params = workplaceParamsSchema.parse(req.params);

	const result = await WorkplaceService.updateWorkplace(
		actor,
		params.id,
		req.body,
	);
	await invalidateCachePrefix(CACHE_PREFIX);

	sendResponse(res, {
		message: "Workplace updated Successfully",
		data: result,
	});
});

const deleteWorkplace = catchAsync(async (req, res) => {
	const actor = req.user as Express.User;
	const params = workplaceParamsSchema.parse(req.params);

	await WorkplaceService.deleteWorkplace(actor, params.id);
	await invalidateCachePrefix(CACHE_PREFIX);

	sendResponse(res, { message: "Workplace deleted Successfully" });
});

export const WorkplaceController = {
	listWorkplaces,
	getWorkplace,
	createWorkplace,
	updateWorkplace,
	deleteWorkplace,
};
