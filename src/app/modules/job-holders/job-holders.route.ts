import { Router } from "express";
import { Role } from "../../../generated/enums";
import auth, { requireActive } from "../../auth/auth";
import { uploadSingle } from "../../lib/multer";
import validateRequest from "../../middleware/validateRequest";
import { JobHolderController } from "./job-holders.controller";
import {
	createJobHolderSchema,
	updateJobHolderSchema,
} from "./job-holders.schema";

const router = Router();

router.get(
	"/",
	auth(Role.ADMIN, Role.MODERATOR),
	requireActive(),
	JobHolderController.listJobHolders,
);
router.get(
	"/:id",
	auth(Role.ADMIN, Role.MODERATOR),
	requireActive(),
	JobHolderController.getJobHolder,
);

router.post(
	"/photo",
	auth(Role.ADMIN, Role.MODERATOR),
	requireActive(),
	uploadSingle("photo"),
	JobHolderController.uploadJobHolderPhoto,
);

router.post(
	"/",
	auth(Role.ADMIN, Role.MODERATOR),
	requireActive(),
	validateRequest(createJobHolderSchema),
	JobHolderController.createJobHolder,
);

router.patch(
	"/:id",
	auth(Role.ADMIN, Role.MODERATOR),
	requireActive(),
	validateRequest(updateJobHolderSchema),
	JobHolderController.updateJobHolder,
);

router.delete(
	"/:id",
	auth(Role.ADMIN),
	requireActive(),
	JobHolderController.deleteJobHolder,
);

export const JobHolderRoutes = router;
