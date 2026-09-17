import assert from "node:assert/strict";
import test from "node:test";

import webpush from "web-push";

import { PushSubscriptionMapper, UserMapper } from "../model/index.mapper.js";
import { dispatchNotification, NOTIFICATION_TYPES } from "../modules/notifications/notifications.services.js";

const notificationData = {
  reservation: { _id: "reservation-1", name: "Camille Martin", seats: 3 },
  event: { title: "Soirée Jazz", slug: "soiree-jazz" },
  actor: { displayName: "Christelle et Marjorie" },
};

function configurePushTest(context) {
  const originals = {
    findActiveAdministrators: UserMapper.findActiveAdministrators,
    findSubscriptionsByUser: PushSubscriptionMapper.findSubscriptionsByUser,
    deleteSubscriptionByEndpoint: PushSubscriptionMapper.deleteSubscriptionByEndpoint,
    setVapidDetails: webpush.setVapidDetails,
    sendNotification: webpush.sendNotification,
  };

  process.env.WEB_PUSH_SUBJECT = "mailto:test@example.com";
  process.env.WEB_PUSH_PUBLIC_KEY = "test-public-key";
  process.env.WEB_PUSH_PRIVATE_KEY = "test-private-key";
  webpush.setVapidDetails = () => {};

  context.after(() => {
    UserMapper.findActiveAdministrators = originals.findActiveAdministrators;
    PushSubscriptionMapper.findSubscriptionsByUser = originals.findSubscriptionsByUser;
    PushSubscriptionMapper.deleteSubscriptionByEndpoint = originals.deleteSubscriptionByEndpoint;
    webpush.setVapidDetails = originals.setVapidDetails;
    webpush.sendNotification = originals.sendNotification;
  });
}

test("le push est envoyé uniquement aux appareils abonnés des administrateurs", async (context) => {
  configurePushTest(context);
  const sentEndpoints = [];

  UserMapper.findActiveAdministrators = async () => [{ _id: "admin-without-push" }, { _id: "admin-with-push" }];
  PushSubscriptionMapper.findSubscriptionsByUser = async (userId) =>
    userId === "admin-with-push"
      ? [
          { endpoint: "https://push.example/device-1", keys: { p256dh: "key-1", auth: "auth-1" } },
          { endpoint: "https://push.example/device-2", keys: { p256dh: "key-2", auth: "auth-2" } },
        ]
      : [];
  webpush.sendNotification = async ({ endpoint }) => {
    sentEndpoints.push(endpoint);
  };

  const report = await dispatchNotification(NOTIFICATION_TYPES.RESERVATION_CREATED_BY_NON_ADMIN, notificationData);

  assert.deepEqual(sentEndpoints, ["https://push.example/device-1", "https://push.example/device-2"]);
  assert.deepEqual(report.map(({ value }) => value.subscriptionCount), [0, 2]);
});

test("un abonnement push expiré est supprimé après l’échec d’envoi", async (context) => {
  configurePushTest(context);
  const deletedEndpoints = [];

  UserMapper.findActiveAdministrators = async () => [{ _id: "admin-with-expired-push" }];
  PushSubscriptionMapper.findSubscriptionsByUser = async () => [
    { endpoint: "https://push.example/expired", keys: { p256dh: "key", auth: "auth" } },
  ];
  PushSubscriptionMapper.deleteSubscriptionByEndpoint = async (endpoint) => {
    deletedEndpoints.push(endpoint);
  };
  webpush.sendNotification = async () => {
    const error = new Error("Subscription expired");
    error.statusCode = 410;
    throw error;
  };

  const report = await dispatchNotification(NOTIFICATION_TYPES.RESERVATION_CREATED_BY_NON_ADMIN, notificationData);

  assert.equal(report[0].value.failedCount, 1);
  assert.equal(report[0].value.sentCount, 0);
  assert.deepEqual(deletedEndpoints, ["https://push.example/expired"]);
});
