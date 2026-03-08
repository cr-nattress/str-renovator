import { Router } from "express";
import { Webhook } from "svix";
import { env } from "../config/env.js";
import * as userRepo from "../repositories/user.repository.js";

const router = Router();

// POST /api/webhooks/clerk - Clerk webhook handler
router.post("/clerk", async (req, res, next) => {
  try {
    const payload = Buffer.isBuffer(req.body)
      ? req.body.toString("utf-8")
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body);

    const headers = {
      "svix-id": req.headers["svix-id"] as string,
      "svix-timestamp": req.headers["svix-timestamp"] as string,
      "svix-signature": req.headers["svix-signature"] as string,
    };

    const wh = new Webhook(env.clerkWebhookSecret);
    const event = wh.verify(payload, headers) as any;

    const { type, data } = event;

    if (type === "user.created") {
      await userRepo.create({
        clerk_id: data.id,
        email:
          data.email_addresses?.[0]?.email_address ?? "",
        name: [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
        avatar_url: data.image_url ?? null,
      });
    } else if (type === "user.updated") {
      await userRepo.updateByClerkId(data.id, {
        email:
          data.email_addresses?.[0]?.email_address ?? "",
        name: [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
        avatar_url: data.image_url ?? null,
      });
    } else if (type === "user.deleted") {
      await userRepo.removeByClerkId(data.id);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});

export default router;
