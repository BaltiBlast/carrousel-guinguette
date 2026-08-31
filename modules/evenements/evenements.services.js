import { EventMapper } from "../../model/index.mapper.js";
import { plainEventDescriptionToHtml, sanitizeEventDescription } from "./event-description.js";

const EVENT_TIME_ZONE = "Europe/Paris";

const venue = {
  name: "Le Carrousel",
  address: "Les Étangs du Longeau",
  postalCode: "55210",
  city: "Hannonville-sous-les-Côtes",
};

function getDateParts(date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: EVENT_TIME_ZONE,
    })
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
}

function getTimeParts(date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: EVENT_TIME_ZONE,
    })
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
}

function formatTime(date) {
  const parts = getTimeParts(date);
  return parts.minute === "00" ? `${Number(parts.hour)} h` : `${Number(parts.hour)} h ${parts.minute}`;
}

function formatDateAttribute(date) {
  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: EVENT_TIME_ZONE,
  }).format(date);
}

function formatTimeAttribute(date) {
  const parts = getTimeParts(date);
  return `${parts.hour}:${parts.minute}`;
}

function presentEvent(event) {
  const dateParts = getDateParts(event.startsAt);
  const day = dateParts.day === "1" ? "1er" : dateParts.day;

  return {
    slug: event.slug,
    title: event.title,
    description: event.description,
    descriptionHtml: event.descriptionHtml
      ? sanitizeEventDescription(event.descriptionHtml)
      : plainEventDescriptionToHtml(event.description),
    date: formatDateAttribute(event.startsAt),
    day,
    month: dateParts.month,
    year: dateParts.year,
    formattedDate: `${day} ${dateParts.month} ${dateParts.year}`,
    time: formatTimeAttribute(event.startsAt),
    formattedTime: formatTime(event.startsAt),
    endTime: formatTimeAttribute(event.endsAt),
    formattedEndTime: formatTime(event.endsAt),
    price: event.price,
    priceLabel: `${event.price} € par personne`,
    priceDetails: event.priceDetails,
  };
}

export async function getEvents(limit = null) {
  const events = await EventMapper.findUpcomingEvents(new Date(), limit);
  return events.map(presentEvent);
}

export async function getNextEvent(fromDate = new Date()) {
  const event = await EventMapper.findNextEvent(fromDate);
  return event ? presentEvent(event) : null;
}

function groupEventsByYearAndMonth(events, currentDate = new Date()) {
  const currentDateParts = getDateParts(currentDate);
  const years = [];

  for (const event of events) {
    let yearGroup = years.find(({ year }) => year === event.year);

    if (!yearGroup) {
      yearGroup = { year: event.year, months: [] };
      years.push(yearGroup);
    }

    let monthGroup = yearGroup.months.find(({ month }) => month === event.month);

    if (!monthGroup) {
      monthGroup = {
        month: event.month,
        isCurrentMonth: event.year === currentDateParts.year && event.month === currentDateParts.month,
        events: [],
      };
      yearGroup.months.push(monthGroup);
    }

    monthGroup.events.push(event);
  }

  return years;
}

export async function getEventsPageData() {
  const events = await getEvents();

  return {
    title: "Événements à venir | Le Carrousel",
    description: "Consultez tous les prochains bals, concerts et rendez-vous du Carrousel.",
    currentYear: new Date().getFullYear(),
    eventYears: groupEventsByYearAndMonth(events),
  };
}

export async function getEventPageData(slug) {
  const storedEvent = await EventMapper.findEventBySlug(slug);

  if (!storedEvent) {
    return null;
  }

  const event = presentEvent(storedEvent);

  return {
    title: `${event.title} | Le Carrousel`,
    description: event.description,
    currentYear: new Date().getFullYear(),
    event,
    venue,
  };
}
