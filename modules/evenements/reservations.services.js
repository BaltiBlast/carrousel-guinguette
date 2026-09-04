import { EventMapper, ReservationMapper } from "../../model/index.mapper.js";
import { dispatchNotification, NOTIFICATION_TYPES } from "../notifications/notifications.services.js";

const SUBMISSION_WINDOW_MS = 15 * 60 * 1000;
const SUBMISSION_LIMIT = 5;
const submissionAttempts = new Map();

export class ReservationSubmissionError extends Error {
  constructor(message, statusCode = 422) {
    super(message);
    this.name = "ReservationSubmissionError";
    this.statusCode = statusCode;
  }
}

function normalizeInput(input) {
  return {
    name: typeof input.name === "string" ? input.name.trim() : "",
    email: typeof input.email === "string" ? input.email.trim().toLowerCase() : "",
    phone: typeof input.phone === "string" ? input.phone.trim() : "",
    seats: Number(input.seats),
    privacyAccepted: input.privacyAccepted === "on",
    website: typeof input.website === "string" ? input.website.trim() : "",
  };
}

function validateInput(reservation) {
  if (reservation.name.length < 2 || reservation.name.length > 100) throw new ReservationSubmissionError("Le nom doit contenir entre 2 et 100 caractères.");
  if (reservation.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reservation.email)) throw new ReservationSubmissionError("L’adresse e-mail saisie n’est pas valide.");
  if (reservation.phone.length < 6 || reservation.phone.length > 30 || !/^[+\d\s().-]+$/.test(reservation.phone)) throw new ReservationSubmissionError("Le numéro de téléphone saisi n’est pas valide.");
  if (!Number.isInteger(reservation.seats) || reservation.seats < 1 || reservation.seats > 20) throw new ReservationSubmissionError("Vous pouvez réserver entre 1 et 20 places.");
  if (!reservation.privacyAccepted) throw new ReservationSubmissionError("Vous devez accepter l’utilisation de vos données pour traiter la réservation.");
}

function recordAttempt(identifier, now = Date.now()) {
  const threshold = now - SUBMISSION_WINDOW_MS;
  const attempts = (submissionAttempts.get(identifier) || []).filter((attempt) => attempt > threshold);
  if (attempts.length >= SUBMISSION_LIMIT) throw new ReservationSubmissionError("Trop de tentatives ont été effectuées. Veuillez réessayer dans quelques minutes.", 429);
  submissionAttempts.set(identifier, [...attempts, now]);
}

export async function submitReservation(slug, input, remoteIp) {
  const reservation = normalizeInput(input);
  if (reservation.website) return { suspectedBot: true };
  recordAttempt(remoteIp || "unknown");
  validateInput(reservation);

  const event = await EventMapper.findEventBySlug(slug);
  if (!event) throw new ReservationSubmissionError("Événement introuvable.", 404);
  if (event.endsAt < new Date()) throw new ReservationSubmissionError("Les réservations pour cet événement sont fermées.", 409);
  if (await ReservationMapper.findReservationByEventAndEmail(event._id, reservation.email)) {
    throw new ReservationSubmissionError("Une réservation existe déjà pour cet événement avec cette adresse e-mail.", 409);
  }

  const eventWithReservedSeats = await EventMapper.reserveSeats(event._id, reservation.seats);
  if (!eventWithReservedSeats) {
    const reservedSeats = await ReservationMapper.getReservedSeatCount(event._id);
    const remainingSeats = Math.max(0, (event.capacity ?? 100) - reservedSeats);
    throw new ReservationSubmissionError(remainingSeats ? `Il ne reste que ${remainingSeats} place${remainingSeats > 1 ? "s" : ""}.` : "Cet événement est complet.", 409);
  }

  let createdReservation;

  try {
    createdReservation = await ReservationMapper.createReservation({
      eventId: event._id,
      name: reservation.name,
      email: reservation.email,
      phone: reservation.phone,
      seats: reservation.seats,
      status: "pending",
    });
  } catch (error) {
    await EventMapper.releaseSeats(event._id, reservation.seats);
    if (error?.code === 11000) throw new ReservationSubmissionError("Une réservation existe déjà pour cet événement avec cette adresse e-mail.", 409);
    throw error;
  }

  try {
    await dispatchNotification(NOTIFICATION_TYPES.RESERVATION_CREATED, {
      reservation: createdReservation,
      event,
    });
  } catch (error) {
    console.error("Échec de la notification de la nouvelle réservation :", error.message);
  }

  return createdReservation;
}
