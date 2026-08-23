import { Router } from "express";
import * as controller from "./home.controllers.js";

const router = Router();

router.get("/", controller.showHome);

export { router };
