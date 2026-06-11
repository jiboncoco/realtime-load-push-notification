// Routes Web Push (customer-facing, PUBLIK). Mount di app.ts via app.route("/", …).
import { Hono } from "hono";
import { z } from "zod";
import { jsonBody } from "../lib/validate.ts";
import { rateLimit } from "../lib/rateLimit.ts";
import { subscribePush, vapidPublicKey } from "./push.handler.ts";

// Bentuk PushSubscription.toJSON() dari browser.
const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(200),
  }),
});

export const pushRoutes = new Hono();

pushRoutes.get("/push/vapid-public-key", vapidPublicKey);
pushRoutes.post(
  "/tickets/:id/push-subscribe",
  rateLimit({ name: "push-sub", windowMs: 60_000, max: 20 }),
  jsonBody(subscribeSchema),
  subscribePush,
);
