import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    descriptionHtml: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    startsAt: {
      type: Date,
      required: true,
      index: true,
    },
    endsAt: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.startsAt || value > this.startsAt;
        },
        message: "L’heure de fin doit être postérieure à l’heure de début.",
      },
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    priceDetails: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 10000,
      default: 100,
    },
    reservedSeats: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default eventSchema;
