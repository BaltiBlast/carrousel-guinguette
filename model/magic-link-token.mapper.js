import magicLinkTokenSchema from "../schemas/magic-link-token.schema.js";
import CoreMapper from "./core.mapper.js";

class MagicLinkToken extends CoreMapper {
  constructor(mongoose) {
    super(mongoose);

    this.model =
      this.mongoose.models.MagicLinkToken ||
      this.mongoose.model("MagicLinkToken", magicLinkTokenSchema, "magic_link_tokens");
  }

  createToken(tokenData) {
    return this.model.create(tokenData);
  }

  findValidTokenByHash(tokenHash, currentDate) {
    return this.model.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: currentDate },
    });
  }

  consumeTokenByHash(tokenHash, currentDate, usedAt) {
    return this.model.findOneAndUpdate(
      {
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: currentDate },
      },
      { usedAt },
      { returnDocument: "after" },
    );
  }

  deleteTokensByUserId(userId) {
    return this.model.deleteMany({ userId });
  }
}

export default MagicLinkToken;
