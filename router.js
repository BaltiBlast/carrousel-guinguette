import { Router } from "express";
import * as adminRoute from "./modules/admin/admin.routes.js";
import * as homeRoute from "./modules/home/home.routes.js";

const router = Router();

router.use("/admin", adminRoute.router);
router.use("/", homeRoute.router);

export default router;
