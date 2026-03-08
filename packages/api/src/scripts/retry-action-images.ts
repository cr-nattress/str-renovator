import "dotenv/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

import { Queue } from "bullmq";
import * as journeyRepo from "../repositories/design-journey.repository.js";
import * as analysisRepo from "../repositories/analysis.repository.js";

function parseRedisUrl(url: string) {
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

const connection = parseRedisUrl(process.env.REDIS_URL ?? "redis://localhost:6379");
const actionImageQueue = new Queue("action-image", { connection });

async function main() {
  // Find failed journey items that have a source photo
  const allFailed = await journeyRepo.listFailed();
  const failedItems = allFailed.filter((item) => item.source_photo_id != null);

  if (failedItems.length === 0) {
    console.log("No failed journey items found.");
    process.exit(0);
  }

  console.log(`Found ${failedItems.length} failed journey items. Retrying...`);

  for (const item of failedItems) {
    // Get the style_direction from the analysis
    const analysis = item.analysis_id
      ? await analysisRepo.findByIdAndUser(item.analysis_id, item.user_id)
      : null;

    const styleDirection = analysis?.style_direction ?? "";
    const room = item.rooms_affected?.[0] ?? "Room";

    // Reset status to pending
    await journeyRepo.updateById(item.id, { image_status: "pending" });

    // Enqueue new job
    await actionImageQueue.add("action-image", {
      journeyItemId: item.id,
      sourcePhotoId: item.source_photo_id,
      userId: item.user_id,
      propertyId: item.property_id,
      actionItemTitle: item.title,
      room,
      styleDirection,
      quality: "low",
      size: "1024x1024",
    });

    console.log(`  Enqueued: "${item.title}"`);
  }

  console.log("Done! All failed items re-enqueued.");
  await actionImageQueue.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
