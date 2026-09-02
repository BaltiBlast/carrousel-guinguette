import webpush from "web-push";

import { NotificationDeliveryMapper, PushSubscriptionMapper, UserMapper } from "../../model/index.mapper.js";
import { sendTransactionalEmail, validateEmailConfiguration } from "./email.transport.js";
import { buildNotificationPlan, NOTIFICATION_TYPES } from "./notifications.registry.js";

export { NOTIFICATION_TYPES };

let isWebPushConfigured = false;
let notificationWorker;

const DELIVERY_LEASE_MS = 2 * 60 * 1000;
const WORKER_INTERVAL_MS = 30 * 1000;
const WORKER_BATCH_SIZE = 20;
const MAX_RETRY_DELAY_MS = 6 * 60 * 60 * 1000;

export class NotificationSubscriptionError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotificationSubscriptionError";
  }
}

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`La variable d’environnement ${name} est requise.`);
  }

  return value;
}

function configureWebPush() {
  if (isWebPushConfigured) return;

  webpush.setVapidDetails(
    getRequiredEnvironmentVariable("WEB_PUSH_SUBJECT"),
    getRequiredEnvironmentVariable("WEB_PUSH_PUBLIC_KEY"),
    getRequiredEnvironmentVariable("WEB_PUSH_PRIVATE_KEY"),
  );
  isWebPushConfigured = true;
}

function normalizeEndpoint(value) {
  const endpoint = typeof value === "string" ? value.trim() : "";

  if (!endpoint || endpoint.length > 2048) {
    throw new NotificationSubscriptionError("L’abonnement push est invalide.");
  }

  try {
    if (new URL(endpoint).protocol !== "https:") throw new Error();
  } catch {
    throw new NotificationSubscriptionError("L’endpoint push doit être une URL HTTPS valide.");
  }

  return endpoint;
}

function normalizeSubscription(subscription) {
  const endpoint = normalizeEndpoint(subscription?.endpoint);
  const p256dh = typeof subscription?.keys?.p256dh === "string" ? subscription.keys.p256dh.trim() : "";
  const auth = typeof subscription?.keys?.auth === "string" ? subscription.keys.auth.trim() : "";

  if (!p256dh || !auth || p256dh.length > 512 || auth.length > 512) {
    throw new NotificationSubscriptionError("Les clés de l’abonnement push sont invalides.");
  }

  return { endpoint, keys: { p256dh, auth } };
}

function isExpiredSubscriptionError(error) {
  return (
    error?.statusCode === 404 ||
    error?.statusCode === 410 ||
    (error?.statusCode === 401 && String(error?.body || "").includes("VAPID public key mismatch"))
  );
}

async function sendPushNotificationToUser(userId, notification) {
  configureWebPush();
  const subscriptions = await PushSubscriptionMapper.findSubscriptionsByUser(userId);
  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          JSON.stringify({
            ...notification,
            icon: "/assets/icons/icon-192.png",
            badge: "/assets/icons/favicon-32.png",
          }),
        );
      } catch (error) {
        if (isExpiredSubscriptionError(error)) {
          await PushSubscriptionMapper.deleteSubscriptionByEndpoint(subscription.endpoint);
        }
        throw error;
      }
    }),
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Échec de l’envoi d’une notification Web Push :", {
        statusCode: result.reason?.statusCode,
        message: result.reason?.message || String(result.reason),
        response: result.reason?.body,
      });
    }
  });

  return {
    subscriptionCount: subscriptions.length,
    sentCount: results.filter((result) => result.status === "fulfilled").length,
    failedCount: results.filter((result) => result.status === "rejected").length,
  };
}

async function sendEmailNotification(email) {
  return sendTransactionalEmail({
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    idempotencyKey: email.idempotencyKey,
  });
}

function getRetryDelayMilliseconds(attempts) {
  return Math.min(30 * 1000 * (2 ** Math.max(0, attempts - 1)), MAX_RETRY_DELAY_MS);
}

async function executeDelivery(delivery) {
  if (delivery.channel === "administrator-push") {
    return sendPushNotificationToUser(delivery.recipientUserId, delivery.payload);
  }

  if (delivery.channel === "visitor-email") {
    return sendEmailNotification(delivery.payload);
  }

  throw new Error(`Canal de notification inconnu : ${delivery.channel}`);
}

async function processClaimedDelivery(delivery) {
  try {
    const result = await executeDelivery(delivery);
    await NotificationDeliveryMapper.markSent(delivery._id, new Date());
    return result;
  } catch (error) {
    const nextAttemptAt = new Date(Date.now() + getRetryDelayMilliseconds(delivery.attempts));
    await NotificationDeliveryMapper.markFailed(delivery._id, error?.message || String(error), nextAttemptAt);
    throw error;
  }
}

async function processDeliveryById(deliveryId) {
  const currentDate = new Date();
  const delivery = await NotificationDeliveryMapper.claimById(
    deliveryId,
    currentDate,
    new Date(currentDate.getTime() + DELIVERY_LEASE_MS),
  );

  if (!delivery) return { skipped: true };
  return processClaimedDelivery(delivery);
}

export async function processPendingNotifications(limit = WORKER_BATCH_SIZE) {
  let processed = 0;

  while (processed < limit) {
    const currentDate = new Date();
    const delivery = await NotificationDeliveryMapper.claimNextDue(
      currentDate,
      new Date(currentDate.getTime() + DELIVERY_LEASE_MS),
    );
    if (!delivery) break;

    try {
      await processClaimedDelivery(delivery);
    } catch (error) {
      console.error(`Nouvelle tentative de notification échouée (${delivery.channel}) :`, error?.message || error);
    }
    processed += 1;
  }

  return processed;
}

export function startNotificationWorker() {
  if (notificationWorker) return notificationWorker;

  const run = () => processPendingNotifications().catch((error) => {
    console.error("Échec du traitement de la file de notifications :", error?.message || error);
  });

  void run();
  notificationWorker = setInterval(run, WORKER_INTERVAL_MS);
  notificationWorker.unref?.();
  return notificationWorker;
}

export function validateNotificationConfiguration() {
  configureWebPush();
  validateEmailConfiguration();
}

export function getPublicKey() {
  return getRequiredEnvironmentVariable("WEB_PUSH_PUBLIC_KEY");
}

export function saveSubscription(userId, subscription, userAgent) {
  return PushSubscriptionMapper.upsertSubscription(userId, {
    ...normalizeSubscription(subscription),
    userAgent: String(userAgent || "").slice(0, 500),
  });
}

export async function getSubscriptionStatus(userId, endpoint) {
  if (!endpoint) return { subscribed: false };

  const subscription = await PushSubscriptionMapper.findSubscriptionByUserAndEndpoint(
    userId,
    normalizeEndpoint(endpoint),
  );
  return { subscribed: Boolean(subscription) };
}

export function removeSubscription(userId, endpoint) {
  return PushSubscriptionMapper.deleteSubscriptionByUserAndEndpoint(userId, normalizeEndpoint(endpoint));
}

export async function dispatchNotification(type, data) {
  const plan = buildNotificationPlan(type, data);
  const deliveries = [];

  if (plan.administratorPush) {
    const administrators = await UserMapper.findActiveAdministrators();
    deliveries.push(
      ...administrators.map((administrator) => ({
        channel: "administrator-push",
        recipientUserId: administrator._id,
        payload: plan.administratorPush,
        idempotencyKey: `administrator-push/${type}/${plan.administratorPush.tag}/${administrator._id}`,
      })),
    );
  }

  deliveries.push(
    ...(plan.visitorEmails || []).map((email) => ({
      channel: "visitor-email",
      payload: email,
      idempotencyKey: email.idempotencyKey,
    })),
  );

  const queuedDeliveries = await Promise.all(deliveries.map((delivery) => NotificationDeliveryMapper.enqueue({
    type,
    ...delivery,
  })));
  const results = await Promise.allSettled(queuedDeliveries.map((delivery) => processDeliveryById(delivery._id)));
  const report = results.map((result, index) => ({
    channel: queuedDeliveries[index].channel,
    status: result.status,
    value: result.status === "fulfilled" ? result.value : undefined,
    reason: result.status === "rejected" ? result.reason : undefined,
  }));

  report.forEach((delivery) => {
    if (delivery.status === "rejected") {
      console.error(`Échec de la notification (${delivery.channel}) :`, delivery.reason?.message || delivery.reason);
    }
  });

  const failures = report.filter(({ status }) => status === "rejected");
  if (failures.length) {
    throw new AggregateError(failures.map(({ reason }) => reason), `${failures.length} notification(s) placée(s) en attente de nouvelle tentative.`);
  }

  return report;
}
