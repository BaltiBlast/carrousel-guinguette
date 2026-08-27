import * as service from "./admin.services.js";

function readCookie(request, name) {
  const cookies = request.headers.cookie?.split(";") || [];

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    const cookieName = cookie.slice(0, separatorIndex).trim();

    if (cookieName === name) {
      try {
        return decodeURIComponent(cookie.slice(separatorIndex + 1));
      } catch {
        return null;
      }
    }
  }

  return null;
}

export async function requireAuthentication(request, response, next) {
  try {
    const cookieName = service.getSessionCookieName();
    const sessionToken = readCookie(request, cookieName);
    const authentication = await service.findAuthenticatedUser(sessionToken);

    if (!authentication) {
      response.cookie(cookieName, "", service.getExpiredSessionCookieOptions());
      return response.redirect("/admin/connexion");
    }

    request.adminUser = authentication.user;
    request.adminSession = authentication.session;
    request.adminSessionToken = sessionToken;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function getSessionToken(request) {
  return readCookie(request, service.getSessionCookieName());
}
