import * as service from "./evenements.services.js";
import * as reservationService from "./reservations.services.js";

export async function showEvents(req, res, next) {
  try {
    return res.render("evenements/index", await service.getEventsPageData());
  } catch (error) {
    return next(error);
  }
}

export async function submitReservation(req, res, next) {
  try {
    await reservationService.submitReservation(req.params.slug, req.body, req.ip);
    return res.redirect(303, `/evenements/${encodeURIComponent(req.params.slug)}?reservation=envoyee#reservation`);
  } catch (error) {
    if (error instanceof reservationService.ReservationSubmissionError) {
      const pageData = await service.getEventPageData(req.params.slug, {
        reservationError: error.message,
        formData: {
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          seats: req.body.seats,
          privacyAccepted: req.body.privacyAccepted === "on",
        },
      });
      if (!pageData) return res.status(404).send("Événement introuvable");
      return res.status(error.statusCode).render("evenements/detail", pageData);
    }
    return next(error);
  }
}

export async function showEvent(req, res, next) {
  try {
    const pageData = await service.getEventPageData(req.params.slug, {
      reservationSuccess: req.query.reservation === "envoyee",
    });

    if (!pageData) {
      return res.status(404).send("Événement introuvable");
    }

    return res.render("evenements/detail", pageData);
  } catch (error) {
    return next(error);
  }
}
