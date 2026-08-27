import * as service from "./livre-d-or.services.js";

export async function showGuestbook(req, res, next) {
  try {
    res.render("livre-d-or/index", await service.getGuestbookPageData());
  } catch (error) {
    next(error);
  }
}

export function showReviewForm(req, res) {
  res.set("Cache-Control", "no-store");
  res.render(
    "livre-d-or/deposer",
    service.getReviewFormPageData({ success: req.query.envoye === "1" }),
  );
}

export async function submitReview(req, res, next) {
  try {
    await service.submitReview(req.body, req.ip);
    res.redirect(303, "/livre-d-or/deposer?envoye=1");
  } catch (error) {
    if (error instanceof service.ReviewSubmissionError) {
      return res.status(error.statusCode).render(
        "livre-d-or/deposer",
        service.getReviewFormPageData({
          error: error.message,
          formData: {
            author: req.body.author,
            email: req.body.email,
            visitDate: req.body.visitDate,
            rating: req.body.rating,
            comment: req.body.comment,
            realExperience: req.body.realExperience === "on",
            publicationRules: req.body.publicationRules === "on",
          },
        }),
      );
    }

    console.error("Échec de l'enregistrement d'un avis :", error.message);
    return res.status(503).render(
      "livre-d-or/deposer",
      service.getReviewFormPageData({
        error: "Le service est momentanément indisponible. Votre avis n’a pas été enregistré, veuillez réessayer.",
        formData: req.body,
      }),
    );
  }
}
