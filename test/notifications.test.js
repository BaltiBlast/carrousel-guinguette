import assert from "node:assert/strict";
import test from "node:test";

import { isReservationStatusTransitionAllowed } from "../modules/admin/admin.services.js";
import { buildNotificationPlan, NOTIFICATION_TYPES } from "../modules/notifications/notifications.registry.js";

const notificationData = {
  reservation: {
    _id: "reservation-1",
    name: "Camille & Co",
    email: "visiteur@example.com",
    seats: 3,
    createdAt: new Date("2026-09-01T10:00:00Z"),
    updatedAt: new Date("2026-09-02T10:00:00Z"),
  },
  event: {
    title: "Soirée <Jazz>",
    startsAt: new Date("2026-10-10T17:30:00Z"),
    endsAt: new Date("2026-10-10T21:00:00Z"),
    price: 12,
    priceDetails: "Boisson incluse",
  },
};

test("les transitions de réservation respectent le parcours métier", () => {
  assert.equal(isReservationStatusTransitionAllowed("pending", "accepted"), true);
  assert.equal(isReservationStatusTransitionAllowed("pending", "rejected"), true);
  assert.equal(isReservationStatusTransitionAllowed("accepted", "cancelled"), true);
  assert.equal(isReservationStatusTransitionAllowed("rejected", "pending"), true);
  assert.equal(isReservationStatusTransitionAllowed("cancelled", "pending"), true);
  assert.equal(isReservationStatusTransitionAllowed("pending", "cancelled"), false);
  assert.equal(isReservationStatusTransitionAllowed("accepted", "rejected"), false);
  assert.equal(isReservationStatusTransitionAllowed("cancelled", "accepted"), false);
});

test("les trois e-mails visiteur contiennent les coordonnées et aucun tiret cadratin", () => {
  for (const type of [
    NOTIFICATION_TYPES.RESERVATION_CREATED,
    NOTIFICATION_TYPES.RESERVATION_ACCEPTED,
    NOTIFICATION_TYPES.RESERVATION_CANCELLED,
  ]) {
    const email = buildNotificationPlan(type, notificationData).visitorEmails[0];

    assert.match(email.html, /06 81 08 20 64/);
    assert.match(email.html, /lecarrousel54@gmail\.com/);
    assert.match(email.text, /Heure d’arrivée/);
    assert.equal(JSON.stringify(email).includes(String.fromCodePoint(0x2014)), false);
    assert.match(email.html, /Camille &amp; Co/);
    assert.match(email.html, /Soirée &lt;Jazz&gt;/);
  }
});

test("l’e-mail d’annulation contient l’avertissement demandé", () => {
  const email = buildNotificationPlan(NOTIFICATION_TYPES.RESERVATION_CANCELLED, notificationData).visitorEmails[0];

  assert.match(email.subject, /^✅ Annulation confirmée/);
  assert.match(email.text, /n’êtes pas à l’origine/);
  assert.match(email.text, /places ont bien été libérées/);
  assert.match(email.text, /aucune autre démarche n’est nécessaire/);
});

test("une nouvelle transition produit une nouvelle clé d’envoi", () => {
  const firstEmail = buildNotificationPlan(NOTIFICATION_TYPES.RESERVATION_ACCEPTED, notificationData).visitorEmails[0];
  const secondEmail = buildNotificationPlan(NOTIFICATION_TYPES.RESERVATION_ACCEPTED, {
    ...notificationData,
    reservation: { ...notificationData.reservation, updatedAt: new Date("2026-09-03T10:00:00Z") },
  }).visitorEmails[0];

  assert.notEqual(firstEmail.idempotencyKey, secondEmail.idempotencyKey);
});
