import { Worker, type Queue } from "bullmq";
import {
  queueConnection,
  analysisDlqQueue,
  renovationDlqQueue,
  scrapeDlqQueue,
  actionImageDlqQueue,
  locationResearchDlqQueue,
} from "../config/queue.js";
import { logger } from "../config/logger.js";
import { processAnalysisJob } from "./analyze.job.js";
import { processRenovationJob } from "./renovate.job.js";
import { processScrapeJob } from "./scrape.job.js";
import { processActionImageJob } from "./action-image.job.js";
import { processLocationResearchJob } from "./location-research.job.js";
import { CONCURRENCY } from "@str-renovator/shared";
import type { RenovationFailedEvent } from "@str-renovator/shared";
import { publishEvents } from "../events/event-bus.js";

/** Maps worker name to its dead-letter queue */
const dlqMap: Record<string, Queue> = {
  analysis: analysisDlqQueue,
  renovation: renovationDlqQueue,
  scrape: scrapeDlqQueue,
  "action-image": actionImageDlqQueue,
  "location-research": locationResearchDlqQueue,
};

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

  const locationResearchWorker = new Worker("location-research", processLocationResearchJob, {
    connection: queueConnection,
    concurrency: 2,
  });

  for (const worker of [analysisWorker, renovationWorker, scrapeWorker, actionImageWorker, locationResearchWorker]) {
    worker.on("failed", async (job, err) => {
      if (!job) return;
      logger.error({ jobId: job.id, queue: worker.name, err: err.message }, "job failed");

      // Move to DLQ when all retries are exhausted
      const maxAttempts = job.opts.attempts ?? 1;
      if (job.attemptsMade >= maxAttempts) {
        const dlqQueue = dlqMap[worker.name];
        if (dlqQueue) {
          await dlqQueue.add("failed-job", {
            originalJobId: job.id,
            originalJobName: job.name,
            data: job.data,
            failedAt: new Date().toISOString(),
            error: err.message,
            attemptsMade: job.attemptsMade,
          });
          logger.error({ jobId: job.id, queue: `${worker.name}-dlq` }, "job moved to DLQ");
        }

        // Publish RenovationFailed event — analysis-finalizer handler manages counter/status
        const renovationData = worker.name === "renovation" ? (job.data as any) : null;
        if (renovationData?.analysisPhotoId) {
          try {
            const failedEvents: RenovationFailedEvent[] = [
              {
                type: "RenovationFailed",
                entityId: renovationData.renovationId ?? job.id ?? "unknown",
                entityType: "Renovation",
                userId: renovationData.userId ?? "unknown",
                timestamp: new Date().toISOString(),
                data: {
                  renovationId: renovationData.renovationId ?? job.id ?? "unknown",
                  analysisPhotoId: renovationData.analysisPhotoId,
                  userId: renovationData.userId ?? "unknown",
                  error: err.message,
                },
              },
            ];
            await publishEvents(failedEvents);
          } catch (eventErr) {
            logger.error({ jobId: job.id, err: eventErr instanceof Error ? eventErr.message : eventErr }, "failed to publish RenovationFailed event");
          }
        }
      }
    });
    worker.on("completed", (job) => {
      logger.info({ jobId: job.id, queue: worker.name }, "job completed");
    });
  }

  logger.info("all workers started");
}
