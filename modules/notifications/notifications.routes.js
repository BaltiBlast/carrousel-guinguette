import { Router, json } from "express";

import { requireAuthentication } from "../admin/admin.middlewares.js";
import * as controller from "./notifications.controllers.js";

const router = Router();
const parseJson = json({ limit: "10kb" });

router.get("/notifications/public-key", requireAuthentication, controller.getPublicKey);
router.get("/notifications/status", requireAuthentication, controller.getSubscriptionStatus);
router.post("/notifications/subscriptions", requireAuthentication, parseJson, controller.saveSubscription);
router.delete("/notifications/subscriptions", requireAuthentication, parseJson, controller.removeSubscription);

export { router };
