import * as service from "./notifications.services.js";

export function getPublicKey(req, res, next) {
  try {
    return res.json({ publicKey: service.getPublicKey() });
  } catch (error) {
    return next(error);
  }
}

export async function getSubscriptionStatus(req, res, next) {
  try {
    return res.json(await service.getSubscriptionStatus(req.adminUser._id, req.query.endpoint));
  } catch (error) {
    if (error instanceof service.NotificationSubscriptionError) return res.status(422).json({ error: error.message });
    return next(error);
  }
}

export async function saveSubscription(req, res, next) {
  try {
    await service.saveSubscription(req.adminUser._id, req.body.subscription, req.get("user-agent"));
    return res.status(201).json({ subscribed: true });
  } catch (error) {
    if (error instanceof service.NotificationSubscriptionError) return res.status(422).json({ error: error.message });
    return next(error);
  }
}

export async function removeSubscription(req, res, next) {
  try {
    await service.removeSubscription(req.adminUser._id, req.body.endpoint);
    return res.json({ subscribed: false });
  } catch (error) {
    if (error instanceof service.NotificationSubscriptionError) return res.status(422).json({ error: error.message });
    return next(error);
  }
}
