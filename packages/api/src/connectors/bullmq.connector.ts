/**
 * @module bullmq.connector
 * @capability BullMQ queue connector implementation
 * @layer Execution
 *
 * Wraps BullMQ behind the QueueConnector interface. Resolves queue
 * instances by name from the configured queue map, delegating job
 * dispatch to the underlying BullMQ Queue.
 *
 * @see queue.connector.ts — interface definition
 * @see config/queue.ts — queue instances and Redis connection
 */

import type { Queue } from "bullmq";
import {
  analysisQueue,
  renovationQueue,
  scrapeQueue,
  actionImageQueue,
  locationResearchQueue,
} from "../config/queue.js";
import type { QueueConnector, QueueJobOptions } from "./queue.connector.js";

const queueMap: Record<string, Queue> = {
  analysis: analysisQueue,
  renovation: renovationQueue,
  scrape: scrapeQueue,
  "action-image": actionImageQueue,
  "location-research": locationResearchQueue,
};

class BullMqConnector implements QueueConnector {
  async enqueue(
    queueName: string,
    jobName: string,
    data: unknown,
    options?: QueueJobOptions
  ): Promise<string> {
    const queue = queueMap[queueName];
    if (!queue) {
      throw new Error(`Unknown queue: ${queueName}`);
    }

    const job = await queue.add(jobName, data, options);
    return job.id ?? queueName;
  }
}

export const bullMqConnector: QueueConnector = new BullMqConnector();
