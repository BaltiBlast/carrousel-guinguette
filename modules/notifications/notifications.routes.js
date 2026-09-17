import { Router, json } from "express";

import { requireAuthentication, requirePermission } from "../admin/admin.middlewares.js";
import { ADMIN_PERMISSIONS } from "../admin/admin.permissions.js";
import * as controller from "./notifications.controllers.js";

const router = Router();
const parseJson = json({ limit: "10kb" });

router.get("/notifications/public-key", requireAuthentication, requirePermission(ADMIN_PERMISSIONS.MANAGE_PREFERENCES), controller.getPublicKey);
router.get("/notifications/status", requireAuthentication, requirePermission(ADMIN_PERMISSIONS.MANAGE_PREFERENCES), controller.getSubscriptionStatus);
router.post("/notifications/subscriptions", requireAuthentication, requirePermission(ADMIN_PERMISSIONS.MANAGE_PREFERENCES), parseJson, controller.saveSubscription);
router.delete("/notifications/subscriptions", requireAuthentication, requirePermission(ADMIN_PERMISSIONS.MANAGE_PREFERENCES), parseJson, controller.removeSubscription);

export { router };
