const events = [
  {
    slug: "apres-midi-musette",
    title: "Après-midi musette",
    date: "2026-08-25",
    day: "25",
    month: "août",
    year: 2026,
    formattedDate: "25 août 2026",
    time: "14:30",
    formattedTime: "14 h 30",
    endTime: "18:30",
    formattedEndTime: "18 h 30",
    price: 12,
    priceLabel: "12 € par personne",
    priceDetails: "Goûter offert.",
    description:
      "Retrouvez l’ambiance chaleureuse des bals d’autrefois lors d’un après-midi consacré au musette. Accordéon, valses, tangos et grands classiques vous attendent sur la piste du Carrousel.",
    icon: "/assets/img/icons/accordion-vintage.png",
  },
  {
    slug: "annees-70-80",
    title: "Les années 70–80",
    date: "2026-09-01",
    day: "1er",
    month: "septembre",
    year: 2026,
    formattedDate: "1er septembre 2026",
    time: "14:30",
    formattedTime: "14 h 30",
    endTime: "19:00",
    formattedEndTime: "19 h",
    price: 12,
    priceLabel: "12 € par personne",
    priceDetails: "Première boisson comprise dans le tarif.",
    description:
      "Remontez le temps au son des incontournables des années 70 et 80. Une sélection festive, des refrains que tout le monde connaît et une piste de danse prête à vibrer tout l’après-midi.",
    icon: "/assets/img/icons/vinyle-vintage.png",
  },
  {
    slug: "reprises-80-2000",
    title: "Reprises 80–2000",
    date: "2026-09-08",
    day: "8",
    month: "septembre",
    year: 2026,
    formattedDate: "8 septembre 2026",
    time: "14:30",
    formattedTime: "14 h 30",
    endTime: "20:00",
    formattedEndTime: "20 h",
    price: 12,
    priceLabel: "12 € par personne",
    priceDetails: "Entrée, vestiaire et une boisson sans alcool compris. Une petite restauration sera proposée sur place en supplément.",
    description:
      "Chantez et dansez sur les titres marquants des années 80 aux années 2000. Cette rencontre réunit les tubes pop, rock et variété qui ont accompagné plusieurs générations.",
    icon: "/assets/img/icons/microphone-vintage.png",
  },
];

const venue = {
  name: "Le Carrousel",
  address: "Les Étangs du Longeau",
  postalCode: "55210",
  city: "Hannonville-sous-les-Côtes",
};

export function getEvents() {
  return events;
}

export function getEventBySlug(slug) {
  return events.find((event) => event.slug === slug) || null;
}

export function getEventPageData(slug) {
  const event = getEventBySlug(slug);

  if (!event) {
    return null;
  }

  return {
    title: `${event.title} | Le Carrousel`,
    description: event.description,
    currentYear: new Date().getFullYear(),
    event,
    venue,
  };
}
