import "dotenv/config";
import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { startWorkers } from "./jobs/worker.js";
import { registerEventHandlers } from "./events/register.js";

app.listen(env.port, () => {
  logger.info("API running on port %d", env.port);
  registerEventHandlers();
  startWorkers();
});
