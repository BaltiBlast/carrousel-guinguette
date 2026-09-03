import * as service from "./admin.services.js";
import { getSessionToken } from "./admin.middlewares.js";

export function showLogin(req, res) {
  res.set("Cache-Control", "no-store");
  res.render("admin/connexion", service.getLoginPageData());
}

export async function sendMagicLink(req, res, next) {
  try {
    await service.requestMagicLink(req.body.email, req.ip || "unknown");
    res.render("admin/connexion", {
      ...service.getLoginPageData(),
      message: "Si cette adresse correspond au compte administrateur, un lien de connexion vient d’être envoyé.",
    });
  } catch (error) {
    console.error("Échec de l'envoi du lien magique :", error.message);
    res.status(502).render("admin/connexion", {
      ...service.getLoginPageData(),
      error: "L’e-mail n’a pas pu être envoyé pour le moment. Veuillez réessayer dans quelques instants.",
    });
  }
}

export async function showMagicLinkConfirmation(req, res, next) {
  try {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const isValid = await service.validateMagicLink(token);

    res.status(isValid ? 200 : 400).render(
      "admin/confirmer-connexion",
      service.getMagicLinkConfirmationPageData(
        isValid ? token : "",
        isValid ? null : "Ce lien de connexion est invalide, a expiré ou a déjà été utilisé.",
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function confirmMagicLink(req, res, next) {
  try {
    const authentication = await service.createSessionFromMagicLink(req.body.token, req.get("user-agent"));

    if (!authentication) {
      return res.status(400).render(
        "admin/confirmer-connexion",
        service.getMagicLinkConfirmationPageData(
          "",
          "Ce lien de connexion est invalide, a expiré ou a déjà été utilisé.",
        ),
      );
    }

    res.cookie(
      service.getSessionCookieName(),
      authentication.sessionToken,
      service.getSessionCookieOptions(authentication.expiresAt),
    );
    return res.redirect("/admin/tableau-de-bord");
  } catch (error) {
    return next(error);
  }
}

export async function showDashboard(req, res, next) {
  try {
    const messages = {
      published: "L’avis a été publié.",
      rejected: "L’avis a été refusé.",
      unchanged: "Cet avis a déjà été traité ou n’existe plus.",
    };
    const actionMessage = typeof req.query.action === "string" ? messages[req.query.action] : null;

    res.render("admin/avis", await service.getDashboardPageData(req.adminUser, actionMessage));
  } catch (error) {
    next(error);
  }
}

async function updateReviewStatus(req, res, next, status) {
  try {
    const review = await service.moderateReview(req.params.reviewId, status);
    const action = review ? status : "unchanged";
    const allowedFilters = ["all", "pending", "published", "rejected"];
    const filter = allowedFilters.includes(req.body.filter) ? req.body.filter : "all";
    res.redirect(303, `/admin/tableau-de-bord?action=${action}&filter=${filter}#avis-livre-d-or`);
  } catch (error) {
    next(error);
  }
}

export function publishReview(req, res, next) {
  return updateReviewStatus(req, res, next, "published");
}

export function rejectReview(req, res, next) {
  return updateReviewStatus(req, res, next, "rejected");
}

const eventMessages = { created: "L’événement a été créé.", updated: "L’événement a été modifié.", deleted: "L’événement a été supprimé." };

export async function showEvents(req, res, next) {
  try {
    const message = typeof req.query.action === "string" ? eventMessages[req.query.action] : null;
    return res.render("admin/evenements", await service.getEventsAdminPageData(req.adminUser, message));
  } catch (error) { return next(error); }
}

export async function showReservations(req, res, next) {
  try {
    const message = req.query.action === "created" ? "La réservation a été ajoutée et confirmée." : null;
    return res.render("admin/reservations", await service.getReservationsAdminPageData(req.adminUser, { message }));
  } catch (error) { return next(error); }
}

export async function createReservation(req, res, next) {
  try {
    const reservation = await service.createManualReservation(req.body);
    return res.redirect(303, `/admin/reservations?action=created#reservations-${reservation.eventSlug}`);
  } catch (error) {
    if (error instanceof service.ReservationValidationError) {
      const pageData = await service.getReservationsAdminPageData(req.adminUser, {
        reservationForm: req.body,
        reservationError: error.message,
      });
      return res.status(error.statusCode).render("admin/reservations", pageData);
    }
    return next(error);
  }
}

export async function showPreferences(req, res, next) {
  try {
    return res.render("admin/preferences", await service.getPreferencesPageData(req.adminUser));
  } catch (error) {
    return next(error);
  }
}

export async function showCheckIn(req, res, next) {
  try {
    return res.render("admin/accueil-reservations", await service.getCheckInAdminPageData(req.adminUser, req.query.eventId));
  } catch (error) { return next(error); }
}

export async function updateReservationStatus(req, res, next) {
  try {
    const reservation = await service.updateReservationStatus(
      req.params.reservationId,
      req.body.status,
      req.body.allowOverflow === "true",
    );
    if (!reservation) return res.status(404).send("Réservation introuvable");
    return res.redirect(303, "/admin/reservations");
  } catch (error) {
    if (error instanceof service.EventValidationError) return res.status(409).send(error.message);
    return next(error);
  }
}

export async function updateReservationCheckIn(req, res, next) {
  try {
    const reservation = await service.updateReservationCheckIn(req.params.reservationId, req.body);
    if (!reservation) return res.status(422).send("Pointage invalide");
    return res.redirect(303, `/admin/reservations/accueil?eventId=${reservation.eventId}`);
  } catch (error) { return next(error); }
}

export function showCreateEvent(req, res) {
  return res.render("admin/evenement-form", service.getEventFormPageData(req.adminUser));
}

export async function optimizeEvent(req, res) {
  try {
    const suggestion = await service.optimizeEventWithGemini(req.body);
    return res.json(suggestion);
  } catch (error) {
    if (error instanceof service.EventValidationError) {
      return res.status(422).json({ error: error.message });
    }

    console.error("Échec de l’optimisation Gemini :", error.message);
    return res.status(502).json({ error: "Le service d’optimisation est momentanément indisponible. Réessayez dans quelques instants." });
  }
}

export async function createEvent(req, res, next) {
  try {
    await service.createEvent(req.body);
    return res.redirect(303, "/admin/evenements?action=created");
  } catch (error) {
    if (error instanceof service.EventValidationError) return res.status(422).render("admin/evenement-form", service.getEventFormPageData(req.adminUser, req.body, error.message));
    return next(error);
  }
}

export async function showEditEvent(req, res, next) {
  try {
    const event = await service.getEventForEdition(req.params.eventId);
    if (!event) return res.status(404).send("Événement introuvable");
    return res.render("admin/evenement-form", service.getEventFormPageData(req.adminUser, event));
  } catch (error) { return next(error); }
}

export async function updateEvent(req, res, next) {
  try {
    const event = await service.updateEvent(req.params.eventId, req.body);
    if (!event) return res.status(404).send("Événement introuvable");
    return res.redirect(303, "/admin/evenements?action=updated");
  } catch (error) {
    if (error instanceof service.EventValidationError) return res.status(422).render("admin/evenement-form", service.getEventFormPageData(req.adminUser, { ...req.body, id: req.params.eventId }, error.message));
    return next(error);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const event = await service.deleteEvent(req.params.eventId);
    if (!event) return res.status(404).send("Événement introuvable");
    return res.redirect(303, "/admin/evenements?action=deleted");
  } catch (error) { return next(error); }
}

export async function logout(req, res, next) {
  try {
    await service.deleteSession(getSessionToken(req));
    res.cookie(service.getSessionCookieName(), "", service.getExpiredSessionCookieOptions());
    res.redirect("/admin/connexion");
  } catch (error) {
    next(error);
  }
}
