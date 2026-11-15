import config from "../../config/index";
import {
	buildCacheKey,
	invalidateCachePrefix,
	readThroughCache,
} from "../../lib/cache";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
	jobHolderParamsSchema,
	listJobHoldersQuerySchema,
} from "./job-holders.schema";
import { JobHolderService } from "./job-holders.service";

const CACHE_PREFIX = "cache:jobs:job-holders";

const listJobHolders = catchAsync(async (req, res) => {
	const query = listJobHoldersQuerySchema.parse(req.query);

	const result = await readThroughCache(
		buildCacheKey("jobs", "job-holders", req.query),
		config.cache_ttl_reference,
		() => JobHolderService.listJobHolders(query),
	);

	sendResponse(res, {
		message: "Job holders fetched Successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getJobHolder = catchAsync(async (req, res) => {
	const params = jobHolderParamsSchema.parse(req.params);

	const result = await readThroughCache(
		buildCacheKey("jobs", "job-holder", { id: params.id }),
		config.cache_ttl_reference,
		() => JobHolderService.getJobHolder(params.id),
	);

	sendResponse(res, {
		message: "Job holder fetched Successfully",
		data: result,
	});
});

const createJobHolder = catchAsync(async (req, res) => {
	const actor = req.user as Express.User;

	const result = await JobHolderService.createJobHolder(actor, req.body);
	await invalidateCachePrefix(CACHE_PREFIX);

	sendResponse(res, {
		status: 201,
		message: "Job holder created Successfully",
		data: result,
	});
});

const updateJobHolder = catchAsync(async (req, res) => {
	const actor = req.user as Express.User;
	const params = jobHolderParamsSchema.parse(req.params);

	const result = await JobHolderService.updateJobHolder(
		actor,
		params.id,
		req.body,
	);
	await invalidateCachePrefix(CACHE_PREFIX);

	sendResponse(res, {
		message: "Job holder updated Successfully",
		data: result,
	});
});

const uploadJobHolderPhoto = catchAsync(async (req, res) => {
	const result = await JobHolderService.uploadJobHolderPhoto(req.file);

	sendResponse(res, {
		status: 201,
		message: "Job holder photo uploaded Successfully",
		data: result,
	});
});

const deleteJobHolder = catchAsync(async (req, res) => {
	const actor = req.user as Express.User;
	const params = jobHolderParamsSchema.parse(req.params);

	await JobHolderService.deleteJobHolder(actor, params.id);
	await invalidateCachePrefix(CACHE_PREFIX);

	sendResponse(res, { message: "Job holder deleted Successfully" });
});

export const JobHolderController = {
	listJobHolders,
	getJobHolder,
	createJobHolder,
	updateJobHolder,
	uploadJobHolderPhoto,
	deleteJobHolder,
};
