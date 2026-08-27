import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      select: false,
    },
    visitDate: {
      type: Date,
      default: null,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 800,
    },
    status: {
      type: String,
      enum: ["pending", "published", "rejected"],
      default: "pending",
      required: true,
      index: true,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default reviewSchema;
