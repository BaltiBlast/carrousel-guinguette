import { Router, json } from "express";
import * as controller from "./admin.controllers.js";
import * as middleware from "./admin.middlewares.js";

const router = Router();

router.get("/connexion", controller.showLogin);
router.post("/connexion", controller.sendMagicLink);
router.get("/connexion/lien", controller.showMagicLinkConfirmation);
router.post("/connexion/lien", controller.confirmMagicLink);
router.get("/tableau-de-bord", middleware.requireAuthentication, controller.showDashboard);
router.get("/evenements", middleware.requireAuthentication, controller.showEvents);
router.get("/reservations", middleware.requireAuthentication, controller.showReservations);
router.get("/preferences", middleware.requireAuthentication, controller.showPreferences);
router.get("/reservations/accueil", middleware.requireAuthentication, controller.showCheckIn);
router.post("/reservations/:reservationId/statut", middleware.requireAuthentication, controller.updateReservationStatus);
router.post("/reservations/:reservationId/accueil", middleware.requireAuthentication, controller.updateReservationCheckIn);
router.get("/evenements/nouveau", middleware.requireAuthentication, controller.showCreateEvent);
router.post("/evenements/optimiser", middleware.requireAuthentication, json({ limit: "20kb" }), controller.optimizeEvent);
router.post("/evenements", middleware.requireAuthentication, controller.createEvent);
router.get("/evenements/:eventId/modifier", middleware.requireAuthentication, controller.showEditEvent);
router.post("/evenements/:eventId", middleware.requireAuthentication, controller.updateEvent);
router.post("/evenements/:eventId/supprimer", middleware.requireAuthentication, controller.deleteEvent);
router.post("/avis/:reviewId/publier", middleware.requireAuthentication, controller.publishReview);
router.post("/avis/:reviewId/refuser", middleware.requireAuthentication, controller.rejectReview);
router.post("/deconnexion", middleware.requireAuthentication, controller.logout);

export { router };
