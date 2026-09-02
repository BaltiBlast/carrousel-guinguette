import mongoose from "mongoose";

import Event from "./event.mapper.js";
import MagicLinkToken from "./magic-link-token.mapper.js";
import NotificationDelivery from "./notification-delivery.mapper.js";
import PushSubscription from "./push-subscription.mapper.js";
import Review from "./review.mapper.js";
import Reservation from "./reservation.mapper.js";
import Session from "./session.mapper.js";
import User from "./user.mapper.js";

export const EventMapper = new Event(mongoose);
export const MagicLinkTokenMapper = new MagicLinkToken(mongoose);
export const NotificationDeliveryMapper = new NotificationDelivery(mongoose);
export const PushSubscriptionMapper = new PushSubscription(mongoose);
export const ReviewMapper = new Review(mongoose);
export const ReservationMapper = new Reservation(mongoose);
export const SessionMapper = new Session(mongoose);
export const UserMapper = new User(mongoose);
