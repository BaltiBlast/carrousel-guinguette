import notificationDeliverySchema from "../schemas/notification-delivery.schema.js";
import CoreMapper from "./core.mapper.js";

class NotificationDelivery extends CoreMapper {
  constructor(mongoose) {
    super(mongoose);
    this.model =
      this.mongoose.models.NotificationDelivery ||
      this.mongoose.model("NotificationDelivery", notificationDeliverySchema, "notification-deliveries");
  }

  async enqueue(delivery) {
    try {
      return await this.model.findOneAndUpdate(
        { idempotencyKey: delivery.idempotencyKey },
        { $setOnInsert: delivery },
        { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      if (error?.code === 11000) return this.model.findOne({ idempotencyKey: delivery.idempotencyKey });
      throw error;
    }
  }

  claimById(deliveryId, currentDate, leaseUntil) {
    return this.model.findOneAndUpdate(
      {
        _id: deliveryId,
        status: { $ne: "sent" },
        nextAttemptAt: { $lte: currentDate },
        $or: [{ status: { $ne: "processing" } }, { leaseUntil: { $lte: currentDate } }],
      },
      { $set: { status: "processing", leaseUntil }, $inc: { attempts: 1 } },
      { returnDocument: "after" },
    );
  }

  claimNextDue(currentDate, leaseUntil) {
    return this.model.findOneAndUpdate(
      {
        status: { $in: ["pending", "failed", "processing"] },
        nextAttemptAt: { $lte: currentDate },
        $or: [{ status: { $ne: "processing" } }, { leaseUntil: { $lte: currentDate } }],
      },
      { $set: { status: "processing", leaseUntil }, $inc: { attempts: 1 } },
      { returnDocument: "after", sort: { nextAttemptAt: 1, createdAt: 1 } },
    );
  }

  markSent(deliveryId, sentAt) {
    return this.model.updateOne(
      { _id: deliveryId, status: "processing" },
      { $set: { status: "sent", sentAt, leaseUntil: null, lastError: "" } },
    );
  }

  markFailed(deliveryId, errorMessage, nextAttemptAt) {
    return this.model.updateOne(
      { _id: deliveryId, status: "processing" },
      { $set: { status: "failed", lastError: errorMessage.slice(0, 2000), nextAttemptAt, leaseUntil: null } },
    );
  }
}

export default NotificationDelivery;
