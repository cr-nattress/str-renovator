import { Router } from "express";
import type { Queue } from "bullmq";
import {
  analysisDlqQueue,
  renovationDlqQueue,
  scrapeDlqQueue,
  actionImageDlqQueue,
  locationResearchDlqQueue,
} from "../config/queue.js";

const router = Router();

const dlqQueues: Record<string, Queue> = {
  analysis: analysisDlqQueue,
  renovation: renovationDlqQueue,
  scrape: scrapeDlqQueue,
  "action-image": actionImageDlqQueue,
  "location-research": locationResearchDlqQueue,
};

// List all DLQ counts
router.get("/admin/dlq", async (_req, res, next) => {
  try {
    const counts: Record<string, number> = {};
    for (const [name, queue] of Object.entries(dlqQueues)) {
      const waiting = await queue.getWaitingCount();
      counts[name] = waiting;
    }
    res.json(counts);
  } catch (err) {
    next(err);
  }
});

// List DLQ jobs for a specific queue
router.get("/admin/dlq/:queueName", async (req, res, next) => {
  try {
    const queue = dlqQueues[req.params.queueName];
    if (!queue) {
      return res.status(404).json({ error: `Unknown queue: ${req.params.queueName}` });
    }
    const jobs = await queue.getJobs(["waiting", "delayed", "completed", "failed"], 0, 50);
    res.json(jobs.map((j) => ({ id: j.id, data: j.data, timestamp: j.timestamp })));
  } catch (err) {
    next(err);
  }
});

export default router;
