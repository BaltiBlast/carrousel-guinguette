import { Router } from "express";
import * as adminRoute from "./modules/admin/admin.routes.js";
import * as homeRoute from "./modules/home/home.routes.js";
import * as guestbookRoute from "./modules/livre-d-or/livre-d-or.routes.js";
import * as eventRoute from "./modules/evenements/evenements.routes.js";

const router = Router();

router.use("/admin", adminRoute.router);
router.use("/livre-d-or", guestbookRoute.router);
router.use("/evenements", eventRoute.router);
router.use("/", homeRoute.router);

export default router;
