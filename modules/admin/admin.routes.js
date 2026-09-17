import { Router, json } from "express";
import * as controller from "./admin.controllers.js";
import * as middleware from "./admin.middlewares.js";
import { ADMIN_PERMISSIONS } from "./admin.permissions.js";

const router = Router();

router.get("/", middleware.requireAuthentication, controller.showAdminHome);
router.get("/connexion", controller.showLogin);
router.post("/connexion", controller.sendMagicLink);
router.get("/connexion/lien", controller.showMagicLinkConfirmation);
router.post("/connexion/lien", controller.confirmMagicLink);
router.get("/tableau-de-bord", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_REVIEWS), controller.showDashboard);
router.get("/evenements", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_EVENTS), controller.showEvents);
router.get("/reservations", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_RESERVATIONS), controller.showReservations);
router.post("/reservations", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_RESERVATIONS), controller.createReservation);
router.get("/preferences", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_PREFERENCES), controller.showPreferences);
router.get("/reservations/accueil", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_RESERVATIONS), controller.showCheckIn);
router.post("/reservations/:reservationId/statut", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_RESERVATIONS), controller.updateReservationStatus);
router.post("/reservations/:reservationId/accueil", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_RESERVATIONS), controller.updateReservationCheckIn);
router.get("/evenements/nouveau", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_EVENTS), controller.showCreateEvent);
router.post("/evenements/optimiser", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_EVENTS), json({ limit: "20kb" }), controller.optimizeEvent);
router.post("/evenements", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_EVENTS), controller.createEvent);
router.get("/evenements/:eventId/modifier", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_EVENTS), controller.showEditEvent);
router.post("/evenements/:eventId", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_EVENTS), controller.updateEvent);
router.post("/evenements/:eventId/supprimer", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_EVENTS), controller.deleteEvent);
router.post("/avis/:reviewId/publier", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_REVIEWS), controller.publishReview);
router.post("/avis/:reviewId/refuser", middleware.requireAuthentication, middleware.requirePermission(ADMIN_PERMISSIONS.MANAGE_REVIEWS), controller.rejectReview);
router.post("/deconnexion", middleware.requireAuthentication, controller.logout);

export { router };
