import config from "./app/config/index";
import errorHandler from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { rateLimit } from "./app/middleware/rateLimit";
import { requestLogger } from "./app/middleware/requestLogger";
import { securityHeaders } from "./app/middleware/security";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import { DesignationRoutes } from "./app/modules/designations/designations.route";
import { HealthRoutes } from "./app/modules/health/health.route";
import { JobHolderRoutes } from "./app/modules/job-holders/job-holders.route";
import { WorkplaceRoutes } from "./app/modules/workplaces/workplaces.route";

const app: Application = express();

if (config.trust_proxy) {
	app.set(
		"trust proxy",
		config.trust_proxy === "true"
			? 1
			: Number(config.trust_proxy) || config.trust_proxy,
	);
}

app.use(securityHeaders());
app.use(requestLogger());

app.use(
	cors({
		origin: config.frontend_urls,
		credentials: true,
	}),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.use(
	rateLimit({
		prefix: "global",
		windowSeconds: 60,
		max: config.rate_limit_global_max,
	}),
);

app.use(HealthRoutes);

app.use("/api/v1/designations", DesignationRoutes);
app.use("/api/v1/workplaces", WorkplaceRoutes);
app.use("/api/v1/job-holders", JobHolderRoutes);

app.get("/", async (_: Request, res: Response) => {
	res.status(200).json({
		success: true,
		message: "Server is running",
	});
});

app.use(errorHandler);
app.use(notFound);

export default app;
