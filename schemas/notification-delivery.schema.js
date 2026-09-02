import mongoose from "mongoose";

const notificationDeliverySchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true, maxlength: 100, index: true },
    channel: { type: String, enum: ["administrator-push", "visitor-email"], required: true, index: true },
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    idempotencyKey: { type: String, required: true, unique: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ["pending", "processing", "sent", "failed"], default: "pending", index: true },
    attempts: { type: Number, min: 0, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    leaseUntil: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: "", maxlength: 2000 },
  },
  { timestamps: true, versionKey: false },
);

notificationDeliverySchema.index({ status: 1, nextAttemptAt: 1, leaseUntil: 1 });

export default notificationDeliverySchema;
