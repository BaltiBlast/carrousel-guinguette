import * as guestbookService from "../livre-d-or/livre-d-or.services.js";
import * as eventService from "../evenements/evenements.services.js";

export async function getHomePageData() {
  const [events, nextEvent, guestbookReviews] = await Promise.all([
    eventService.getEvents(3),
    eventService.getNextEvent(),
    guestbookService.getPublishedReviews(6),
  ]);

  return {
    title: "Le Carrousel | Guinguette aux Étangs du Longeau",
    description:
      "Découvrez Le Carrousel, une guinguette et un authentique bal monté des années 70 aux Étangs du Longeau, dans la Meuse : événements, bals, concerts et privatisations.",
    currentYear: new Date().getFullYear(),
    events,
    nextEvent,
    guestbookReviews,
  };
}
