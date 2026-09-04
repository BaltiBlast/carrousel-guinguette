import { Router } from "express";
import * as controller from "./seo.controllers.js";

export const router = Router();

router.get("/robots.txt", controller.showRobots);
router.get("/sitemap.xml", controller.showSitemap);
