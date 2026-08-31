import * as service from "./evenements.services.js";

export function showEvent(req, res) {
  const pageData = service.getEventPageData(req.params.slug);

  if (!pageData) {
    return res.status(404).send("Événement introuvable");
  }

  return res.render("evenements/detail", pageData);
}
