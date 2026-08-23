import * as service from "./home.services.js";

export function showHome(req, res) {
  const pageData = service.getHomePageData();

  res.render("home/home", pageData);
}
