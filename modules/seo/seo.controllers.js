import * as service from "./seo.services.js";

export function showRobots(request, response) {
  response.type("text/plain").send(service.getRobotsText());
}

export async function showSitemap(request, response, next) {
  try {
    response.type("application/xml").send(await service.getSitemapXml());
  } catch (error) {
    next(error);
  }
}
