import sessionSchema from "../schemas/session.schema.js";
import CoreMapper from "./core.mapper.js";

class Session extends CoreMapper {
  constructor(mongoose) {
    super(mongoose);

    this.model = this.mongoose.models.Session || this.mongoose.model("Session", sessionSchema, "sessions");
  }

  createSession(sessionData) {
    return this.model.create(sessionData);
  }

  findValidSessionByHash(tokenHash, currentDate) {
    return this.model.findOne({
      tokenHash,
      expiresAt: { $gt: currentDate },
    });
  }

  updateLastUsedAt(sessionId, lastUsedAt) {
    return this.model.findByIdAndUpdate(sessionId, { lastUsedAt }, { returnDocument: "after" });
  }

  deleteSessionByHash(tokenHash) {
    return this.model.deleteOne({ tokenHash });
  }

  deleteSessionsByUserId(userId) {
    return this.model.deleteMany({ userId });
  }
}

export default Session;
