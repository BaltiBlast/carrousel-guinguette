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

export function showDashboard(req, res) {
  res.render("admin/avis", service.getDashboardPageData(req.adminUser));
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
