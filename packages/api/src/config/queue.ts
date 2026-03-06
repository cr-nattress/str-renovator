import { Queue } from "bullmq";
import { env } from "./env.js";

const connection = { url: env.redisUrl };

export const analysisQueue = new Queue("analysis", { connection });
export const renovationQueue = new Queue("renovation", { connection });
export const scrapeQueue = new Queue("scrape", { connection });

export const queueConnection = connection;
