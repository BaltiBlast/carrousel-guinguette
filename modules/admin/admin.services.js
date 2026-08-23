const temporaryReviews = [
  {
    id: 1,
    author: "Marie L.",
    initials: "ML",
    rating: 5,
    visitDate: "18 août 2026",
    submittedAt: "Aujourd’hui à 09 h 42",
    status: "pending",
    statusLabel: "En attente",
    comment:
      "Une très belle soirée, une ambiance chaleureuse et un orchestre qui nous a fait danser jusqu’au bout. Nous reviendrons avec plaisir !",
  },
  {
    id: 2,
    author: "Jean-Pierre",
    initials: "JP",
    rating: 4,
    visitDate: "11 août 2026",
    submittedAt: "Hier à 18 h 16",
    status: "pending",
    statusLabel: "En attente",
    comment:
      "Le cadre au bord des étangs est vraiment agréable. Nous avons passé un excellent après-midi en famille.",
  },
  {
    id: 3,
    author: "Claudine et Michel",
    initials: "CM",
    rating: 5,
    visitDate: "4 août 2026",
    submittedAt: "20 août 2026 à 14 h 05",
    status: "published",
    statusLabel: "Publié",
    comment: "Quel bonheur de retrouver l’esprit des bals d’autrefois ! Merci à toute l’équipe pour son accueil.",
  },
  {
    id: 4,
    author: "Visiteur anonyme",
    initials: "VA",
    rating: 2,
    visitDate: "3 août 2026",
    submittedAt: "19 août 2026 à 11 h 27",
    status: "rejected",
    statusLabel: "Refusé",
    comment: "Message temporaire utilisé pour présenter l’état d’un avis refusé dans le dashboard.",
  },
];

export function getLoginPageData() {
  return {
    layout: "layouts/admin",
    title: "Connexion | Administration du Carrousel",
    description: "Connexion à l’espace d’administration du Carrousel.",
    pageClass: "admin-page admin-page--login",
  };
}

export function getDashboardPageData() {
  const counts = temporaryReviews.reduce(
    (totals, review) => ({ ...totals, [review.status]: totals[review.status] + 1 }),
    { pending: 0, published: 0, rejected: 0 },
  );

  return {
    layout: "layouts/admin",
    title: "Tableau de bord | Administration du Carrousel",
    description: "Tableau de bord de l’administration du Carrousel.",
    pageClass: "admin-page",
    reviews: temporaryReviews,
    counts,
  };
}
