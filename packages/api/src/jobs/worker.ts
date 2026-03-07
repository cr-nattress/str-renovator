import { Worker } from "bullmq";
import { queueConnection } from "../config/queue.js";
import { processAnalysisJob } from "./analyze.job.js";
import { processRenovationJob } from "./renovate.job.js";
import { processScrapeJob } from "./scrape.job.js";
import { processActionImageJob } from "./action-image.job.js";
import { CONCURRENCY } from "@str-renovator/shared";

export function startWorkers(): void {
  const analysisWorker = new Worker("analysis", processAnalysisJob, {
    connection: queueConnection,
    concurrency: CONCURRENCY.analyses,
  });

  const renovationWorker = new Worker("renovation", processRenovationJob, {
    connection: queueConnection,
    concurrency: CONCURRENCY.imageGeneration,
  });

  const scrapeWorker = new Worker("scrape", processScrapeJob, {
    connection: queueConnection,
    concurrency: 1,
  });

  const actionImageWorker = new Worker("action-image", processActionImageJob, {
    connection: queueConnection,
    concurrency: CONCURRENCY.actionImageGeneration,
  });

  for (const worker of [analysisWorker, renovationWorker, scrapeWorker, actionImageWorker]) {
    worker.on("failed", (job, err) => {
      console.error(`[worker] Job ${job?.id} failed:`, err.message);
    });
    worker.on("completed", (job) => {
      console.log(`[worker] Job ${job.id} completed`);
    });
  }

  console.log("[worker] All workers started");
}
