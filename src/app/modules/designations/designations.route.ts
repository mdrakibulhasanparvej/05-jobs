import auth, { requireActive } from "../../auth/auth";
import validateRequest from "../../middleware/validateRequest";
import { Role } from "../../../generated/enums";
import { Router } from "express";
import { DesignationController } from "./designations.controller";
import {
	createDesignationSchema,
	updateDesignationSchema,
} from "./designations.schema";

const router = Router();

router.get("/", DesignationController.listDesignations);

router.post(
	"/",
	auth(Role.ADMIN, Role.MODERATOR),
	requireActive(),
	validateRequest(createDesignationSchema),
	DesignationController.createDesignation,
);

router.patch(
	"/:id",
	auth(Role.ADMIN, Role.MODERATOR),
	requireActive(),
	validateRequest(updateDesignationSchema),
	DesignationController.updateDesignation,
);

router.delete(
	"/:id",
	auth(Role.ADMIN),
	requireActive(),
	DesignationController.deleteDesignation,
);

export const DesignationRoutes = router;
