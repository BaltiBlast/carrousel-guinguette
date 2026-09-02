import { ORGANIZER_CONTACT } from "../../config/contact.js";

export const NOTIFICATION_TYPES = Object.freeze({
  REVIEW_CREATED: "review.created",
  RESERVATION_CREATED: "reservation.created",
  RESERVATION_ACCEPTED: "reservation.accepted",
  RESERVATION_CANCELLED: "reservation.cancelled",
});

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatEventDate(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(date));
}

function formatEventTime(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(date)).replace(":", " h ");
}

function formatAmount(amount) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

function getReservationNotificationVersion(reservation) {
  const updatedAt = new Date(reservation.updatedAt || reservation.createdAt || 0);
  return Number.isNaN(updatedAt.getTime()) ? String(reservation._id) : updatedAt.getTime();
}

function getReservationEmailDetails({ reservation, event }) {
  const seats = Number(reservation.seats);
  const price = Number(event.price);
  const total = price * seats;

  return {
    eventTitle: String(event.title).replace(/[\r\n]+/g, " ").trim(),
    eventDate: formatEventDate(event.startsAt),
    startTime: formatEventTime(event.startsAt),
    seatsLabel: `${seats} place${seats > 1 ? "s" : ""}`,
    priceLabel: price === 0 ? "Gratuit" : `${formatAmount(price)} par personne`,
    totalLabel: total === 0 ? "Gratuit" : formatAmount(total),
    priceDetails: event.priceDetails ? String(event.priceDetails) : "",
  };
}

function buildReservationSummaryHtml(details, seatsHeading = "Places réservées") {
  const priceDetails = details.priceDetails
    ? `<p style="margin:6px 0 0;color:#5f665f;font-size:13px;">${escapeHtml(details.priceDetails)}</p>`
    : "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #d8d0bc;border-radius:10px;">
      <tr><td style="padding:11px 14px;border-bottom:1px solid #e7e1d2;color:#5f665f;">Événement</td><td align="right" style="padding:11px 14px;border-bottom:1px solid #e7e1d2;font-weight:700;">${escapeHtml(details.eventTitle)}</td></tr>
      <tr><td style="padding:11px 14px;border-bottom:1px solid #e7e1d2;color:#5f665f;">Date</td><td align="right" style="padding:11px 14px;border-bottom:1px solid #e7e1d2;font-weight:700;">${escapeHtml(details.eventDate)}</td></tr>
      <tr><td style="padding:11px 14px;border-bottom:1px solid #e7e1d2;color:#5f665f;">Heure d’arrivée</td><td align="right" style="padding:11px 14px;border-bottom:1px solid #e7e1d2;font-weight:700;">${escapeHtml(details.startTime)}</td></tr>
      <tr><td style="padding:11px 14px;border-bottom:1px solid #e7e1d2;color:#5f665f;">${escapeHtml(seatsHeading)}</td><td align="right" style="padding:11px 14px;border-bottom:1px solid #e7e1d2;font-weight:700;">${escapeHtml(details.seatsLabel)}</td></tr>
      <tr><td style="padding:11px 14px;border-bottom:1px solid #e7e1d2;color:#5f665f;">Tarif</td><td align="right" style="padding:11px 14px;border-bottom:1px solid #e7e1d2;font-weight:700;">${escapeHtml(details.priceLabel)}${priceDetails}</td></tr>
      <tr><td style="padding:13px 14px;color:#07572f;font-weight:700;">Total à régler à l’arrivée</td><td align="right" style="padding:13px 14px;color:#07572f;font-size:19px;font-weight:700;">${escapeHtml(details.totalLabel)}</td></tr>
    </table>`;
}

function buildReservationSummaryText(details, seatsHeading = "Places réservées") {
  return [
    `Événement : ${details.eventTitle}`,
    `Date : ${details.eventDate}`,
    `Heure d’arrivée : ${details.startTime}`,
    `${seatsHeading} : ${details.seatsLabel}`,
    `Tarif : ${details.priceLabel}${details.priceDetails ? ` (${details.priceDetails})` : ""}`,
    `Total à régler à l’arrivée : ${details.totalLabel}`,
  ];
}

function buildOrganizerContactHtml({ cancellationWarning = false } = {}) {
  const introduction = cancellationWarning
    ? "Si vous n’êtes pas à l’origine de cette demande d’annulation, contactez rapidement les organisateurs."
    : "Une question ou un besoin particulier ? Contactez les organisateurs :";

  return `
    <div style="margin-top:22px;padding:16px;border-radius:8px;background:#f3efe3;color:#5f665f;">
      <strong style="display:block;margin-bottom:7px;color:#253127;">Contacter les organisateurs</strong>
      <p style="margin:0 0 8px;">${introduction}</p>
      <p style="margin:0;"><a href="tel:${ORGANIZER_CONTACT.phoneHref}" style="color:#07572f;">${ORGANIZER_CONTACT.phoneLabel}</a><br /><a href="mailto:${ORGANIZER_CONTACT.email}" style="color:#07572f;">${ORGANIZER_CONTACT.email}</a></p>
    </div>`;
}

function buildOrganizerContactText({ cancellationWarning = false } = {}) {
  return [
    cancellationWarning
      ? "Si vous n’êtes pas à l’origine de cette demande d’annulation, contactez rapidement les organisateurs."
      : "Une question ou un besoin particulier ? Contactez les organisateurs :",
    `Téléphone : ${ORGANIZER_CONTACT.phoneLabel}`,
    `E-mail : ${ORGANIZER_CONTACT.email}`,
  ];
}

function buildReservationAcknowledgementEmail({ reservation, event }) {
  const details = getReservationEmailDetails({ reservation, event });
  const { eventTitle, totalLabel } = details;

  const html = `
    <div style="margin:0;padding:24px;background:#f8f3e5;color:#253127;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
      <div style="max-width:620px;margin:0 auto;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Votre demande pour ${escapeHtml(eventTitle)} est en attente de confirmation.</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid #d8d0bc;border-radius:16px;background:#fffdf7;">
          <tr><td style="padding:20px 26px;border-bottom:1px solid #d8d0bc;"><strong style="color:#07572f;font-family:Georgia,serif;font-size:22px;">❧ Le Carrousel ❧</strong></td></tr>
          <tr><td style="padding:28px 26px 12px;">
            <p style="margin:0 0 8px;color:#07572f;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Demande reçue</p>
            <h1 style="margin:0;color:#253127;font-family:Georgia,serif;font-size:28px;line-height:1.25;">Bonjour ${escapeHtml(reservation.name)},</h1>
            <p style="margin:14px 0 0;color:#5f665f;font-size:16px;">Nous avons bien reçu votre demande de réservation.</p>
          </td></tr>
          <tr><td style="padding:16px 26px;">
            <div style="padding:18px;border-left:4px solid #c79332;border-radius:8px;background:#fff7df;">
              <strong style="display:block;color:#6d4b0d;font-size:17px;">Votre demande est en attente</strong>
              <p style="margin:6px 0 0;color:#5f4a22;">Vos places ne sont pas encore confirmées. Ne considérez pas cette réservation comme acquise avant d’avoir reçu notre e-mail de confirmation.</p>
            </div>
          </td></tr>
          <tr><td style="padding:12px 26px 4px;">
            <h2 style="margin:0 0 14px;color:#253127;font-family:Georgia,serif;font-size:21px;">Récapitulatif de votre demande</h2>
            ${buildReservationSummaryHtml(details, "Places demandées")}
          </td></tr>
          <tr><td style="padding:24px 26px 30px;">
            <h2 style="margin:0 0 10px;color:#253127;font-family:Georgia,serif;font-size:21px;">Modalités importantes</h2>
            <ul style="margin:0;padding-left:20px;color:#5f665f;">
              <li style="margin-bottom:8px;">Le règlement de <strong>${escapeHtml(totalLabel)}</strong> s’effectuera à votre arrivée.</li>
              <li style="margin-bottom:8px;">En cas d’empêchement, prévenez-nous dès que possible afin que nous puissions proposer les places à d’autres personnes.</li>
              <li style="margin-bottom:8px;">Des absences répétées sans avertissement pourront nous conduire à refuser de futures demandes de réservation.</li>
              <li>Surveillez également le dossier des courriers indésirables de votre messagerie pour ne pas manquer notre confirmation.</li>
            </ul>
            ${buildOrganizerContactHtml()}
          </td></tr>
        </table>
        <p style="margin:18px 0 0;color:#72786f;font-size:13px;text-align:center;">Le Carrousel · Les Étangs du Longeau · 55210 Hannonville-sous-les-Côtes</p>
      </div>
    </div>
  `;

  const text = [
    `Bonjour ${reservation.name},`,
    "",
    "Nous avons bien reçu votre demande de réservation.",
    "IMPORTANT : votre demande est en attente. Vos places ne sont pas encore confirmées. Attendez notre e-mail de confirmation avant de considérer votre réservation comme acquise.",
    "",
    ...buildReservationSummaryText(details, "Places demandées"),
    "",
    "Le règlement s’effectuera à votre arrivée.",
    "En cas d’empêchement, prévenez-nous dès que possible afin que nous puissions proposer les places à d’autres personnes.",
    "Des absences répétées sans avertissement pourront nous conduire à refuser de futures demandes de réservation.",
    "Pensez à vérifier le dossier des courriers indésirables pour ne pas manquer notre confirmation.",
    "",
    ...buildOrganizerContactText(),
    "",
    "Le Carrousel",
  ].join("\n");

  return {
    to: reservation.email,
    subject: `📩 Demande de réservation reçue : ${eventTitle}`,
    html,
    text,
    idempotencyKey: `reservation-received/${reservation._id}`,
  };
}

function buildReservationConfirmationEmail({ reservation, event }) {
  const details = getReservationEmailDetails({ reservation, event });

  const html = `
    <div style="margin:0;padding:24px;background:#f8f3e5;color:#253127;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
      <div style="max-width:620px;margin:0 auto;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Votre réservation pour ${escapeHtml(details.eventTitle)} est confirmée.</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid #d8d0bc;border-radius:16px;background:#fffdf7;">
          <tr><td style="padding:20px 26px;border-bottom:1px solid #d8d0bc;"><strong style="color:#07572f;font-family:Georgia,serif;font-size:22px;">❧ Le Carrousel ❧</strong></td></tr>
          <tr><td style="padding:28px 26px 12px;">
            <p style="margin:0 0 8px;color:#07572f;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Réservation confirmée</p>
            <h1 style="margin:0;color:#253127;font-family:Georgia,serif;font-size:28px;line-height:1.25;">Bonjour ${escapeHtml(reservation.name)},</h1>
            <p style="margin:14px 0 0;color:#5f665f;font-size:16px;">Bonne nouvelle : votre demande a été acceptée et vos places sont désormais réservées.</p>
          </td></tr>
          <tr><td style="padding:16px 26px;">
            <div style="padding:18px;border-left:4px solid #07572f;border-radius:8px;background:#edf7ef;">
              <strong style="display:block;color:#07572f;font-size:17px;">À votre arrivée</strong>
              <ul style="margin:8px 0 0;padding-left:20px;color:#405044;">
                <li style="margin-bottom:8px;">Présentez-vous à l’accueil au nom de <strong>${escapeHtml(reservation.name)}</strong>.</li>
                <li>Arrivez pour <strong>${escapeHtml(details.startTime)}</strong> afin de faciliter votre accueil.</li>
              </ul>
            </div>
          </td></tr>
          <tr><td style="padding:12px 26px 4px;">
            <h2 style="margin:0 0 14px;color:#253127;font-family:Georgia,serif;font-size:21px;">Récapitulatif de votre réservation</h2>
            ${buildReservationSummaryHtml(details)}
          </td></tr>
          <tr><td style="padding:24px 26px 30px;color:#5f665f;">
            <p style="margin:0;">En cas d’empêchement, prévenez-nous dès que possible afin que vos places puissent être proposées à d’autres personnes.</p>
            ${buildOrganizerContactHtml()}
          </td></tr>
        </table>
        <p style="margin:18px 0 0;color:#72786f;font-size:13px;text-align:center;">Le Carrousel · Les Étangs du Longeau · 55210 Hannonville-sous-les-Côtes</p>
      </div>
    </div>
  `;

  const text = [
    `Bonjour ${reservation.name},`,
    "",
    "Bonne nouvelle : votre demande a été acceptée et vos places sont désormais réservées.",
    "",
    "À votre arrivée :",
    `- Présentez-vous à l’accueil au nom de ${reservation.name}.`,
    `- Arrivez pour ${details.startTime} afin de faciliter votre accueil.`,
    "",
    "Récapitulatif de votre réservation :",
    ...buildReservationSummaryText(details),
    "",
    "En cas d’empêchement, prévenez-nous dès que possible afin que vos places puissent être proposées à d’autres personnes.",
    "",
    ...buildOrganizerContactText(),
    "",
    "Le Carrousel · Les Étangs du Longeau · 55210 Hannonville-sous-les-Côtes",
  ].join("\n");

  return {
    to: reservation.email,
    subject: `✅ Réservation confirmée : ${details.eventTitle}`,
    html,
    text,
    idempotencyKey: `reservation-accepted/${reservation._id}/${getReservationNotificationVersion(reservation)}`,
  };
}

function buildReservationCancellationEmail({ reservation, event }) {
  const details = getReservationEmailDetails({ reservation, event });

  const html = `
    <div style="margin:0;padding:24px;background:#f8f3e5;color:#253127;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
      <div style="max-width:620px;margin:0 auto;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">L’annulation de votre réservation pour ${escapeHtml(details.eventTitle)} est confirmée.</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid #d8d0bc;border-radius:16px;background:#fffdf7;">
          <tr><td style="padding:20px 26px;border-bottom:1px solid #d8d0bc;"><strong style="color:#07572f;font-family:Georgia,serif;font-size:22px;">❧ Le Carrousel ❧</strong></td></tr>
          <tr><td style="padding:28px 26px 12px;">
            <p style="margin:0 0 8px;color:#07572f;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Annulation confirmée</p>
            <h1 style="margin:0;color:#253127;font-family:Georgia,serif;font-size:28px;line-height:1.25;">Bonjour ${escapeHtml(reservation.name)},</h1>
            <p style="margin:14px 0 0;color:#5f665f;font-size:16px;">Nous vous confirmons l’annulation de votre réservation. Les places ont bien été libérées et aucune autre démarche n’est nécessaire.</p>
          </td></tr>
          <tr><td style="padding:16px 26px 8px;">
            <h2 style="margin:0 0 14px;color:#253127;font-family:Georgia,serif;font-size:21px;">Réservation annulée</h2>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #d8d0bc;border-radius:10px;">
              <tr><td style="padding:11px 14px;border-bottom:1px solid #e7e1d2;color:#5f665f;">Événement</td><td align="right" style="padding:11px 14px;border-bottom:1px solid #e7e1d2;font-weight:700;">${escapeHtml(details.eventTitle)}</td></tr>
              <tr><td style="padding:11px 14px;border-bottom:1px solid #e7e1d2;color:#5f665f;">Date</td><td align="right" style="padding:11px 14px;border-bottom:1px solid #e7e1d2;font-weight:700;">${escapeHtml(details.eventDate)}</td></tr>
              <tr><td style="padding:11px 14px;border-bottom:1px solid #e7e1d2;color:#5f665f;">Heure d’arrivée prévue</td><td align="right" style="padding:11px 14px;border-bottom:1px solid #e7e1d2;font-weight:700;">${escapeHtml(details.startTime)}</td></tr>
              <tr><td style="padding:11px 14px;color:#5f665f;">Places libérées</td><td align="right" style="padding:11px 14px;font-weight:700;">${escapeHtml(details.seatsLabel)}</td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:22px 26px 30px;color:#5f665f;"><p style="margin:0;">Merci de nous avoir prévenus. Nous espérons vous accueillir prochainement au Carrousel.</p>${buildOrganizerContactHtml({ cancellationWarning: true })}</td></tr>
        </table>
        <p style="margin:18px 0 0;color:#72786f;font-size:13px;text-align:center;">Le Carrousel · Les Étangs du Longeau · 55210 Hannonville-sous-les-Côtes</p>
      </div>
    </div>
  `;

  const text = [
    `Bonjour ${reservation.name},`,
    "",
    "Nous vous confirmons l’annulation de votre réservation. Les places ont bien été libérées et aucune autre démarche n’est nécessaire.",
    "",
    `Événement : ${details.eventTitle}`,
    `Date : ${details.eventDate}`,
    `Heure d’arrivée prévue : ${details.startTime}`,
    `Places libérées : ${details.seatsLabel}`,
    "",
    "Merci de nous avoir prévenus. Nous espérons vous accueillir prochainement au Carrousel.",
    "",
    ...buildOrganizerContactText({ cancellationWarning: true }),
    "",
    "Le Carrousel · Les Étangs du Longeau · 55210 Hannonville-sous-les-Côtes",
  ].join("\n");

  return {
    to: reservation.email,
    subject: `✅ Annulation confirmée : ${details.eventTitle}`,
    html,
    text,
    idempotencyKey: `reservation-cancelled/${reservation._id}/${getReservationNotificationVersion(reservation)}`,
  };
}

const notificationBuilders = {
  [NOTIFICATION_TYPES.REVIEW_CREATED]({ review }) {
    const rating = Number(review.rating);
    const ratingLabel = Number.isInteger(rating) ? ` (${rating}/5)` : "";

    return {
      administratorPush: {
        title: "Nouvel avis dans le livre d’or",
        body: `${review.author} a déposé un nouvel avis${ratingLabel} à modérer.`,
        url: "/admin/tableau-de-bord?filter=pending#avis-livre-d-or",
        tag: `new-review-${review._id}`,
      },
    };
  },

  [NOTIFICATION_TYPES.RESERVATION_CREATED](data) {
    const { reservation, event } = data;
    const seats = Number(reservation.seats);
    const seatsLabel = Number.isInteger(seats)
      ? `${seats} place${seats > 1 ? "s" : ""}`
      : "une ou plusieurs places";

    return {
      administratorPush: {
        title: "Nouvelle demande de réservation",
        body: `${reservation.name} demande ${seatsLabel} pour « ${event.title} ».`,
        url: `/admin/reservations#reservations-${event.slug}`,
        tag: `new-reservation-${reservation._id}`,
      },
      visitorEmails: [buildReservationAcknowledgementEmail(data)],
    };
  },

  [NOTIFICATION_TYPES.RESERVATION_ACCEPTED](data) {
    return {
      visitorEmails: [buildReservationConfirmationEmail(data)],
    };
  },

  [NOTIFICATION_TYPES.RESERVATION_CANCELLED](data) {
    return {
      visitorEmails: [buildReservationCancellationEmail(data)],
    };
  },
};

export function buildNotificationPlan(type, data) {
  const builder = notificationBuilders[type];

  if (!builder) throw new Error(`Type de notification inconnu : ${type}`);
  return builder(data);
}
