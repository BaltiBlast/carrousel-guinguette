import { Router } from "express";
import * as controller from "./evenements.controllers.js";

const router = Router();

router.get("/", controller.showEvents);
router.get("/:slug", controller.showEvent);

export { router };
