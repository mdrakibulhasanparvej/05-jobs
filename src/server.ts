import config from "./app/config/index";
import redisClient from "./app/lib/redis";
import { prisma } from "./db/client";
import app from "./app";

const port = config.port;

if (!port) {
	throw new Error("port is missing in env");
}

const main = async () => {
	try {
		await prisma.$connect();
		console.log("Connected to database successfully");

		// Redis is a cache/denylist/rate-limit store and must never block or
		// crash the API. Connect in the background: the client's keep-alive
		// ping and reconnect strategy restore the link on their own, and
		// Redis-backed features degrade gracefully while it is unavailable.
		redisClient
			.connect()
			.then(() => {
				console.log("Redis connected successfully");
			})
			.catch((error: unknown) => {
				console.error(
					"Redis initial connection failed; retrying in the background",
					error,
				);
			});

		app.listen(port, () => {
			console.log(
				`${config.service_name ?? "gs-service"} is running on port: ${port}`,
			);
		});
	} catch (error) {
		console.log(`Failed to start the server`, error);
		prisma.$disconnect();
		process.exit(1);
	}
};

main();
