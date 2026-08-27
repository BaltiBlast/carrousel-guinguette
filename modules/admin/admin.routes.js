import { Router } from "express";
import * as controller from "./admin.controllers.js";
import * as middleware from "./admin.middlewares.js";

const router = Router();

router.get("/connexion", controller.showLogin);
router.post("/connexion", controller.sendMagicLink);
router.get("/connexion/lien", controller.showMagicLinkConfirmation);
router.post("/connexion/lien", controller.confirmMagicLink);
router.get("/tableau-de-bord", middleware.requireAuthentication, controller.showDashboard);
router.post("/deconnexion", middleware.requireAuthentication, controller.logout);

export { router };
