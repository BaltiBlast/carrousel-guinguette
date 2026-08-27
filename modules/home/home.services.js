import * as guestbookService from "../livre-d-or/livre-d-or.services.js";

export async function getHomePageData() {
  return {
    title: "Le Carrousel | Guinguette aux Étangs du Longeau",
    description:
      "Découvrez Le Carrousel, une guinguette et un authentique bal monté des années 70 aux Étangs du Longeau, dans la Meuse : événements, bals, concerts et privatisations.",
    currentYear: new Date().getFullYear(),
    guestbookReviews: await guestbookService.getPublishedReviews(6),
  };
}
