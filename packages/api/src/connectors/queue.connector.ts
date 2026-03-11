/**
 * @module queue.connector
 * @capability Queue connector interface
 * @layer Execution
 *
 * Defines the contract for job queue operations. Implementations wrap
 * specific providers (BullMQ, SQS, etc.) behind this interface for
 * testability and swappability.
 *
 * @see bullmq.connector.ts — BullMQ implementation
 */

export interface QueueJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: { type: string; delay: number };
}

export interface QueueConnector {
  enqueue(
    queueName: string,
    jobName: string,
    data: unknown,
    options?: QueueJobOptions
  ): Promise<string>;
}
