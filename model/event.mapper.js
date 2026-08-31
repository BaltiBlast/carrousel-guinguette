import eventSchema from "../schemas/event.schema.js";
import CoreMapper from "./core.mapper.js";

class Event extends CoreMapper {
  constructor(mongoose) {
    super(mongoose);

    this.model = this.mongoose.models.Event || this.mongoose.model("Event", eventSchema, "events");
  }

  createEvent(eventData) {
    return this.model.create(eventData);
  }

  findEventBySlug(slug) {
    return this.model.findOne({ slug }).lean();
  }

  findAllEvents() {
    return this.model.find().sort({ startsAt: 1 }).lean();
  }

  findUpcomingEvents(fromDate = new Date(), limit = null) {
    const query = this.model.find({ endsAt: { $gte: fromDate } }).sort({ startsAt: 1 });
    return (limit ? query.limit(limit) : query).lean();
  }

  findNextEvent(fromDate = new Date()) {
    return this.model.findOne({ startsAt: { $gte: fromDate } }).sort({ startsAt: 1 }).lean();
  }

  updateEventById(eventId, eventData) {
    return this.model.findByIdAndUpdate(eventId, eventData, {
      returnDocument: "after",
      runValidators: true,
    });
  }

  deleteEventById(eventId) {
    return this.model.findByIdAndDelete(eventId);
  }
}

export default Event;
