import * as service from "./livre-d-or.services.js";

export function showGuestbook(req, res) {
  res.render("livre-d-or/index", service.getGuestbookPageData());
}

export function showReviewForm(req, res) {
  res.render("livre-d-or/deposer", service.getReviewFormPageData());
}
