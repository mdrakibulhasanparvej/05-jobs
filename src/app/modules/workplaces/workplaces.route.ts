import auth, { requireActive } from "../../auth/auth";
import validateRequest from "../../middleware/validateRequest";
import { Role } from "../../../generated/enums";
import { Router } from "express";
import { WorkplaceController } from "./workplaces.controller";
import {
	createWorkplaceSchema,
	updateWorkplaceSchema,
} from "./workplaces.schema";

const router = Router();

router.get("/", WorkplaceController.listWorkplaces);
router.get("/:id", WorkplaceController.getWorkplace);

router.post(
	"/",
	auth(Role.ADMIN, Role.MODERATOR),
	requireActive(),
	validateRequest(createWorkplaceSchema),
	WorkplaceController.createWorkplace,
);

router.patch(
	"/:id",
	auth(Role.ADMIN, Role.MODERATOR),
	requireActive(),
	validateRequest(updateWorkplaceSchema),
	WorkplaceController.updateWorkplace,
);

router.delete(
	"/:id",
	auth(Role.ADMIN),
	requireActive(),
	WorkplaceController.deleteWorkplace,
);

export const WorkplaceRoutes = router;
