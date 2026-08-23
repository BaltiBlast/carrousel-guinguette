import { Router } from "express";
import * as controller from "./admin.controllers.js";

const router = Router();

router.get("/connexion", controller.showLogin);
router.get("/tableau-de-bord", controller.showDashboard);

export { router };
