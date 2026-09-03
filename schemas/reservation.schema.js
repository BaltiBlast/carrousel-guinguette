import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: null },
    phone: { type: String, trim: true, maxlength: 30, default: null },
    seats: { type: Number, required: true, min: 1, max: 10000 },
    source: { type: String, enum: ["online", "admin"], default: "online", index: true },
    status: { type: String, enum: ["pending", "accepted", "rejected", "cancelled"], default: "pending", index: true },
    checkedIn: { type: Boolean, default: false },
    attendeeCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

export default reservationSchema;
