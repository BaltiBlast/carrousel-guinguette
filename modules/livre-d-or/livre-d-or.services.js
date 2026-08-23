const temporaryReviews = [
  {
    author: "Marie L.",
    initials: "ML",
    rating: 5,
    visitDate: "18 août 2026",
    comment:
      "Une très belle soirée dans un cadre chaleureux. L’orchestre nous a fait danser jusqu’au bout et l’accueil était formidable !",
  },
  {
    author: "Jean-Pierre",
    initials: "JP",
    rating: 4,
    visitDate: "11 août 2026",
    comment:
      "Nous avons retrouvé avec plaisir l’ambiance des bals d’autrefois. Un excellent après-midi passé en famille au bord des étangs.",
  },
  {
    author: "Claudine et Michel",
    initials: "CM",
    rating: 5,
    visitDate: "4 août 2026",
    comment:
      "Un lieu plein de charme, de la bonne musique et une équipe très accueillante. Nous reviendrons sans hésiter pour danser !",
  },
  {
    author: "Sophie R.",
    initials: "SR",
    rating: 5,
    visitDate: "28 juillet 2026",
    comment:
      "Une guinguette comme on les aime : conviviale, joyeuse et pleine de vie. La piste de danse est vraiment superbe.",
  },
  {
    author: "Alain",
    initials: "AL",
    rating: 4,
    visitDate: "21 juillet 2026",
    comment:
      "Très belle découverte aux Étangs du Longeau. Nous avons apprécié la musique, le repas et la bonne humeur générale.",
  },
  {
    author: "Nathalie et Pascal",
    initials: "NP",
    rating: 5,
    visitDate: "14 juillet 2026",
    comment:
      "Nous sommes venus entre amis et tout le monde est reparti enchanté. Une adresse que nous recommandons volontiers !",
  },
];

export function getPublishedReviews() {
  return temporaryReviews.map((review) => ({ ...review }));
}

export function getGuestbookPageData() {
  const reviews = getPublishedReviews();
  const averageRating = reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;

  return {
    title: "Livre d’or | Le Carrousel",
    description: "Découvrez les témoignages laissés par les visiteurs du Carrousel.",
    currentYear: new Date().getFullYear(),
    reviews,
    averageRating: averageRating.toFixed(1).replace(".", ","),
  };
}

export function getReviewFormPageData() {
  return {
    title: "Laisser un avis | Le Carrousel",
    description:
      "Partagez votre expérience au Carrousel et laissez un témoignage dans le livre d’or de la guinguette.",
    currentYear: new Date().getFullYear(),
  };
}
