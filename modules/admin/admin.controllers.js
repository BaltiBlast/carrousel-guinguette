import * as service from "./admin.services.js";

export function showLogin(req, res) {
  res.render("admin/connexion", service.getLoginPageData());
}

export function showDashboard(req, res) {
  res.render("admin/avis", service.getDashboardPageData());
}
