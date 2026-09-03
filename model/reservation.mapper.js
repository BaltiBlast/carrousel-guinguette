import reservationSchema from "../schemas/reservation.schema.js";
import CoreMapper from "./core.mapper.js";

class Reservation extends CoreMapper {
  constructor(mongoose) {
    super(mongoose);
    this.model = this.mongoose.models.Reservation || this.mongoose.model("Reservation", reservationSchema, "reservations");
  }

  createReservation(reservationData) {
    return this.model.create(reservationData);
  }

  findReservationByEventAndEmail(eventId, email) {
    return this.model.findOne({ eventId, email }).lean();
  }

  findAllReservations() {
    return this.model.find().sort({ createdAt: -1 }).lean();
  }

  findReservationById(reservationId) {
    return this.model.findById(reservationId).lean();
  }

  countReservationsByStatus(status) {
    return this.model.countDocuments({ status });
  }

  async synchronizeEmailIndex() {
    const indexName = "eventId_1_email_1";
    const indexes = await this.model.collection.indexes();
    const emailIndex = indexes.find(({ name }) => name === indexName);
    const hasExpectedFilter = emailIndex?.unique && emailIndex.partialFilterExpression?.email?.$type === "string";

    if (emailIndex && !hasExpectedFilter) await this.model.collection.dropIndex(indexName);
    if (!hasExpectedFilter) {
      await this.model.collection.createIndex(
        { eventId: 1, email: 1 },
        { name: indexName, unique: true, partialFilterExpression: { email: { $type: "string" } } },
      );
    }
  }

  updateReservationStatusById(reservationId, currentStatus, status) {
    return this.model.findOneAndUpdate(
      { _id: reservationId, status: currentStatus },
      { status, ...(["rejected", "cancelled"].includes(status) ? { checkedIn: false, attendeeCount: 0 } : {}) },
      { returnDocument: "after", runValidators: true },
    );
  }

  updateCheckInById(reservationId, checkedIn, attendeeCount) {
    return this.model.findOneAndUpdate(
      { _id: reservationId, status: "accepted", seats: { $gte: attendeeCount } },
      { checkedIn, attendeeCount: checkedIn ? attendeeCount : 0 },
      { returnDocument: "after", runValidators: true },
    );
  }

  deleteReservationsByEventId(eventId) {
    return this.model.deleteMany({ eventId });
  }

  async synchronizeEventReservedSeats(eventModel) {
    const totals = await this.model.aggregate([
      { $match: { status: { $in: ["pending", "accepted"] } } },
      { $group: { _id: "$eventId", reservedSeats: { $sum: "$seats" } } },
    ]);
    await eventModel.updateMany({ reservedSeats: { $exists: false } }, { $set: { reservedSeats: 0 } });
    if (!totals.length) return;
    await eventModel.bulkWrite(totals.map(({ _id, reservedSeats }) => ({
      updateOne: { filter: { _id }, update: { $set: { reservedSeats } } },
    })));
  }

  getReservedSeatCount(eventId) {
    return this.model.aggregate([
      { $match: { eventId: new this.mongoose.Types.ObjectId(eventId), status: { $in: ["pending", "accepted"] } } },
      { $group: { _id: null, total: { $sum: "$seats" } } },
    ]).then(([result]) => result?.total || 0);
  }
}

export default Reservation;
