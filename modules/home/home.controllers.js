import * as service from "./home.services.js";

export async function showHome(req, res, next) {
  try {
    const pageData = await service.getHomePageData();
    res.render("home/home", pageData);
  } catch (error) {
    next(error);
  }
}
