import pushSubscriptionSchema from "../schemas/push-subscription.schema.js";
import CoreMapper from "./core.mapper.js";

class PushSubscription extends CoreMapper {
  constructor(mongoose) {
    super(mongoose);

    this.model =
      this.mongoose.models.PushSubscription ||
      this.mongoose.model("PushSubscription", pushSubscriptionSchema, "push-subscriptions");
  }

  upsertSubscription(userId, subscription) {
    return this.model.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: {
          userId,
          keys: subscription.keys,
          userAgent: subscription.userAgent,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  findSubscriptionsByUser(userId) {
    return this.model.find({ userId });
  }

  findSubscriptionByUserAndEndpoint(userId, endpoint) {
    return this.model.findOne({ userId, endpoint });
  }

  deleteSubscriptionByUserAndEndpoint(userId, endpoint) {
    return this.model.findOneAndDelete({ userId, endpoint });
  }

  deleteSubscriptionByEndpoint(endpoint) {
    return this.model.findOneAndDelete({ endpoint });
  }
}

export default PushSubscription;
