import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    seats: { type: Number, required: true, min: 1, max: 10 },
    status: { type: String, enum: ["pending", "accepted", "rejected", "cancelled"], default: "pending", index: true },
    checkedIn: { type: Boolean, default: false },
    attendeeCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

reservationSchema.index({ eventId: 1, email: 1 }, { unique: true });

export default reservationSchema;
