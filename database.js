import "dotenv/config";
import mongoose from "mongoose";

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("La variable d’environnement MONGODB_URI est requise.");
  }

  await mongoose.connect(mongoUri);
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

  return mongoose.connection;
}
