import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 2048,
    },
    keys: {
      p256dh: { type: String, required: true, trim: true, maxlength: 512 },
      auth: { type: String, required: true, trim: true, maxlength: 512 },
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true, versionKey: false },
);

export default pushSubscriptionSchema;
