import { Router } from "express";
import * as homeRoute from "./modules/home/home.routes.js";

const router = Router();

router.use("/", homeRoute.router);

export default router;
