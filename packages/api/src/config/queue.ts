import { Queue } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { env } from "./env.js";

function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username || undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

export const queueConnection = parseRedisUrl(env.redisUrl);

export const analysisQueue = new Queue("analysis", { connection: queueConnection });
export const renovationQueue = new Queue("renovation", { connection: queueConnection });
export const scrapeQueue = new Queue("scrape", { connection: queueConnection });
export const actionImageQueue = new Queue("action-image", { connection: queueConnection });
export const locationResearchQueue = new Queue("location-research", { connection: queueConnection });

// Dead-letter queues for failed jobs that have exhausted all retries
export const analysisDlqQueue = new Queue("analysis:failed", { connection: queueConnection });
export const renovationDlqQueue = new Queue("renovation:failed", { connection: queueConnection });
export const scrapeDlqQueue = new Queue("scrape:failed", { connection: queueConnection });
export const actionImageDlqQueue = new Queue("action-image:failed", { connection: queueConnection });
export const locationResearchDlqQueue = new Queue("location-research:failed", { connection: queueConnection });
