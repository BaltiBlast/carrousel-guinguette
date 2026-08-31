import * as service from "./evenements.services.js";

export async function showEvents(req, res, next) {
  try {
    return res.render("evenements/index", await service.getEventsPageData());
  } catch (error) {
    return next(error);
  }
}

export async function showEvent(req, res, next) {
  try {
    const pageData = await service.getEventPageData(req.params.slug);

    if (!pageData) {
      return res.status(404).send("Événement introuvable");
    }

    return res.render("evenements/detail", pageData);
  } catch (error) {
    return next(error);
  }
}
