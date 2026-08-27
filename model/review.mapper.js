import reviewSchema from "../schemas/review.schema.js";
import CoreMapper from "./core.mapper.js";

class Review extends CoreMapper {
  constructor(mongoose) {
    super(mongoose);

    this.model = this.mongoose.models.Review || this.mongoose.model("Review", reviewSchema, "reviews");
  }

  createReview(reviewData) {
    return this.model.create(reviewData);
  }

  findReviewByEmail(email) {
    return this.model.findOne({ email }).select("_id").lean();
  }

  findPublishedReviews(limit = null) {
    const query = this.model.find({ status: "published" }).sort({ createdAt: -1 });
    return (limit ? query.limit(limit) : query).lean();
  }

  findAllReviews() {
    return this.model.find().sort({ createdAt: -1 }).lean();
  }

  updateReviewStatusById(reviewId, status, moderatedAt) {
    return this.model.findOneAndUpdate(
      { _id: reviewId, status: { $ne: status } },
      { status, moderatedAt },
      { returnDocument: "after", runValidators: true },
    );
  }
}

export default Review;
