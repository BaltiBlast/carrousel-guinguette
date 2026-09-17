import assert from "node:assert/strict";
import test from "node:test";

import { EventMapper, ReservationMapper, UserMapper } from "../model/index.mapper.js";
import { createManualReservation, ReservationValidationError } from "../modules/admin/admin.services.js";

const authenticatedUser = { _id: "507f191e810c19729de860ea", role: "reservation_manager" };

test("une réservation administrateur est confirmée sans coordonnées obligatoires", async (context) => {
  const originalFindEventById = EventMapper.findEventById;
  const originalReserveSeats = EventMapper.reserveSeats;
  const originalCreateReservation = ReservationMapper.createReservation;
  const originalFindDuplicate = ReservationMapper.findReservationByEventAndEmail;
  const originalFindActiveAdministrators = UserMapper.findActiveAdministrators;
  let administratorLookupCount = 0;

  context.after(() => {
    EventMapper.findEventById = originalFindEventById;
    EventMapper.reserveSeats = originalReserveSeats;
    ReservationMapper.createReservation = originalCreateReservation;
    ReservationMapper.findReservationByEventAndEmail = originalFindDuplicate;
    UserMapper.findActiveAdministrators = originalFindActiveAdministrators;
  });

  EventMapper.findEventById = async () => ({
    _id: "507f1f77bcf86cd799439011",
    slug: "bal-du-samedi",
    endsAt: new Date(Date.now() + 60_000),
    capacity: 100,
    reservedSeats: 20,
  });
  EventMapper.reserveSeats = async () => ({ _id: "507f1f77bcf86cd799439011" });
  ReservationMapper.findReservationByEventAndEmail = async () => null;
  ReservationMapper.createReservation = async (data) => ({ toObject: () => ({ _id: "reservation-1", ...data }) });
  UserMapper.findActiveAdministrators = async () => {
    administratorLookupCount += 1;
    return [];
  };

  const reservation = await createManualReservation(
    {
      eventId: "507f1f77bcf86cd799439011",
      name: "Camille Martin",
      seats: "4",
      email: "",
      phone: "",
    },
    authenticatedUser,
  );

  assert.equal(reservation.status, "accepted");
  assert.equal(reservation.source, "admin");
  assert.equal(reservation.email, null);
  assert.equal(reservation.phone, null);
  assert.equal(reservation.seats, 4);
  assert.equal(reservation.createdByUserId, authenticatedUser._id);
  assert.equal(reservation.eventSlug, "bal-du-samedi");
  assert.equal(administratorLookupCount, 1);
});

test("une réservation administrateur est refusée lorsque la capacité est insuffisante", async (context) => {
  const originalFindEventById = EventMapper.findEventById;
  const originalReserveSeats = EventMapper.reserveSeats;

  context.after(() => {
    EventMapper.findEventById = originalFindEventById;
    EventMapper.reserveSeats = originalReserveSeats;
  });

  EventMapper.findEventById = async () => ({
    _id: "507f1f77bcf86cd799439011",
    slug: "bal-du-samedi",
    endsAt: new Date(Date.now() + 60_000),
    capacity: 30,
    reservedSeats: 28,
  });
  EventMapper.reserveSeats = async () => null;

  await assert.rejects(
    createManualReservation(
      {
        eventId: "507f1f77bcf86cd799439011",
        name: "Camille Martin",
        seats: "4",
      },
      authenticatedUser,
    ),
    (error) => error instanceof ReservationValidationError && error.statusCode === 409 && /2 places/.test(error.message),
  );
});

test("une réservation ajoutée par un admin ne déclenche pas de notification", async (context) => {
  const originalFindEventById = EventMapper.findEventById;
  const originalReserveSeats = EventMapper.reserveSeats;
  const originalCreateReservation = ReservationMapper.createReservation;
  const originalFindDuplicate = ReservationMapper.findReservationByEventAndEmail;
  const originalFindActiveAdministrators = UserMapper.findActiveAdministrators;
  let administratorLookupCount = 0;

  context.after(() => {
    EventMapper.findEventById = originalFindEventById;
    EventMapper.reserveSeats = originalReserveSeats;
    ReservationMapper.createReservation = originalCreateReservation;
    ReservationMapper.findReservationByEventAndEmail = originalFindDuplicate;
    UserMapper.findActiveAdministrators = originalFindActiveAdministrators;
  });

  EventMapper.findEventById = async () => ({
    _id: "507f1f77bcf86cd799439011",
    slug: "bal-du-samedi",
    endsAt: new Date(Date.now() + 60_000),
    capacity: 100,
    reservedSeats: 20,
  });
  EventMapper.reserveSeats = async () => ({ _id: "507f1f77bcf86cd799439011" });
  ReservationMapper.findReservationByEventAndEmail = async () => null;
  ReservationMapper.createReservation = async (data) => ({ toObject: () => ({ _id: "reservation-2", ...data }) });
  UserMapper.findActiveAdministrators = async () => {
    administratorLookupCount += 1;
    return [];
  };

  await createManualReservation(
    { eventId: "507f1f77bcf86cd799439011", name: "Camille Martin", seats: "2" },
    { _id: "507f191e810c19729de860eb", role: "admin" },
  );

  assert.equal(administratorLookupCount, 0);
});
