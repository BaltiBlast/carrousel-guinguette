import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { EventMapper, MagicLinkTokenMapper, ReviewMapper, SessionMapper, UserMapper } from "../../model/index.mapper.js";
import { eventDescriptionToText, plainEventDescriptionToHtml, sanitizeEventDescription } from "../evenements/event-description.js";

const LOGIN_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_REQUEST_LIMIT = 5;
const loginRequests = new Map();

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`La variable d'environnement ${name} est requise.`);
  }

  return value;
}

function getPositiveIntegerEnvironmentVariable(name) {
  const value = Number(getRequiredEnvironmentVariable(name));

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`La variable d'environnement ${name} doit être un entier positif.`);
  }

  return value;
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken() {
  return randomBytes(32).toString("base64url");
}

function isLoginRequestAllowed(identifier, currentDate = new Date()) {
  const threshold = currentDate.getTime() - LOGIN_REQUEST_WINDOW_MS;
  const attempts = (loginRequests.get(identifier) || []).filter((attempt) => attempt > threshold);

  if (attempts.length >= LOGIN_REQUEST_LIMIT) {
    loginRequests.set(identifier, attempts);
    return false;
  }

  attempts.push(currentDate.getTime());
  loginRequests.set(identifier, attempts);
  return true;
}

function getAdministratorData() {
  return {
    email: normalizeEmail(getRequiredEnvironmentVariable("ADMIN_EMAIL")),
    displayName: "Jean-Philippe Fougeray",
    role: "admin",
    isActive: true,
  };
}

function getAppBaseUrl() {
  const value = getRequiredEnvironmentVariable("APP_BASE_URL");

  try {
    return new URL(value);
  } catch {
    throw new Error("La variable d'environnement APP_BASE_URL doit contenir une URL valide.");
  }
}

function getSessionDurationMilliseconds() {
  return getPositiveIntegerEnvironmentVariable("SESSION_TTL_DAYS") * 24 * 60 * 60 * 1000;
}

export function validateConfiguration() {
  getRequiredEnvironmentVariable("RESEND_API_KEY");
  getRequiredEnvironmentVariable("RESEND_FROM_EMAIL");
  getAdministratorData();
  getAppBaseUrl();
  getPositiveIntegerEnvironmentVariable("MAGIC_LINK_TTL_MINUTES");
  getPositiveIntegerEnvironmentVariable("SESSION_TTL_DAYS");

  const cookieName = getRequiredEnvironmentVariable("SESSION_COOKIE_NAME");

  if (!/^[A-Za-z0-9_-]+$/.test(cookieName)) {
    throw new Error("La variable d'environnement SESSION_COOKIE_NAME contient des caractères invalides.");
  }
}

export async function initializeAdministrator() {
  const administrator = getAdministratorData();
  const user = await UserMapper.upsertUserByEmail(administrator.email, administrator);

  await UserMapper.deleteUsersExcept(user._id);

  return user;
}

export function getLoginPageData() {
  return {
    layout: "layouts/admin",
    title: "Connexion | Administration du Carrousel",
    description: "Connexion à l’espace d’administration du Carrousel.",
    pageClass: "admin-page admin-page--login",
    message: null,
    error: null,
  };
}

export function getMagicLinkConfirmationPageData(token, error = null) {
  return {
    layout: "layouts/admin",
    title: "Confirmer la connexion | Administration du Carrousel",
    description: "Confirmation de la connexion à l’espace d’administration du Carrousel.",
    pageClass: "admin-page admin-page--login",
    token,
    error,
  };
}

export async function requestMagicLink(email, requestIdentifier) {
  const normalizedEmail = normalizeEmail(email);
  const identifier = `${requestIdentifier}:${normalizedEmail}`;

  if (!isLoginRequestAllowed(identifier)) {
    return;
  }

  const administratorEmail = normalizeEmail(getRequiredEnvironmentVariable("ADMIN_EMAIL"));

  if (!normalizedEmail || normalizedEmail !== administratorEmail) {
    return;
  }

  const user = await UserMapper.findUserByEmail(normalizedEmail);

  if (!user || !user.isActive || user.role !== "admin") {
    return;
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const currentDate = new Date();
  const timeToLive = getPositiveIntegerEnvironmentVariable("MAGIC_LINK_TTL_MINUTES");
  const expiresAt = new Date(currentDate.getTime() + timeToLive * 60 * 1000);

  await MagicLinkTokenMapper.deleteTokensByUserId(user._id);
  await MagicLinkTokenMapper.createToken({ userId: user._id, tokenHash, expiresAt });

  const confirmationUrl = new URL("/admin/connexion/lien", getAppBaseUrl());
  confirmationUrl.searchParams.set("token", token);

  const resend = new Resend(getRequiredEnvironmentVariable("RESEND_API_KEY"));
  const { error } = await resend.emails.send(
    {
      from: getRequiredEnvironmentVariable("RESEND_FROM_EMAIL"),
      to: [user.email],
      subject: "Votre lien de connexion au Carrousel",
      text: `Pour vous connecter à l'administration du Carrousel, ouvrez ce lien : ${confirmationUrl.toString()}\n\nCe lien est personnel, utilisable une seule fois et expire dans ${timeToLive} minutes.`,
      html: `<p>Bonjour ${user.displayName},</p><p>Utilisez le bouton ci-dessous pour vous connecter à l'administration du Carrousel.</p><p><a href="${confirmationUrl.toString()}">Confirmer ma connexion</a></p><p>Ce lien est personnel, utilisable une seule fois et expire dans ${timeToLive} minutes.</p>`,
    },
    { idempotencyKey: `magic-link/${tokenHash}` },
  );

  if (error) {
    await MagicLinkTokenMapper.deleteTokensByUserId(user._id);
    throw new Error(`Resend a refusé l'envoi : ${error.message}`);
  }
}

export async function validateMagicLink(token) {
  if (typeof token !== "string" || token.length < 32) {
    return false;
  }

  return Boolean(await MagicLinkTokenMapper.findValidTokenByHash(hashToken(token), new Date()));
}

export async function createSessionFromMagicLink(token, userAgent = "") {
  if (typeof token !== "string" || token.length < 32) {
    return null;
  }

  const currentDate = new Date();
  const consumedToken = await MagicLinkTokenMapper.consumeTokenByHash(hashToken(token), currentDate, currentDate);

  if (!consumedToken) {
    return null;
  }

  const user = await UserMapper.findUserById(consumedToken.userId);

  if (!user || !user.isActive || user.role !== "admin") {
    return null;
  }

  const sessionToken = generateToken();
  const expiresAt = new Date(currentDate.getTime() + getSessionDurationMilliseconds());

  await SessionMapper.createSession({
    userId: user._id,
    tokenHash: hashToken(sessionToken),
    expiresAt,
    lastUsedAt: currentDate,
    userAgent: String(userAgent).slice(0, 500),
  });
  await UserMapper.updateLastLoginAt(user._id, currentDate);

  return { sessionToken, expiresAt, user };
}

export async function findAuthenticatedUser(sessionToken) {
  if (typeof sessionToken !== "string" || sessionToken.length < 32) {
    return null;
  }

  const currentDate = new Date();
  const session = await SessionMapper.findValidSessionByHash(hashToken(sessionToken), currentDate);

  if (!session) {
    return null;
  }

  const user = await UserMapper.findUserById(session.userId);

  if (!user || !user.isActive || user.role !== "admin") {
    return null;
  }

  await SessionMapper.updateLastUsedAt(session._id, currentDate);
  return { session, user };
}

export async function deleteSession(sessionToken) {
  if (typeof sessionToken === "string" && sessionToken.length >= 32) {
    await SessionMapper.deleteSessionByHash(hashToken(sessionToken));
  }
}

export function getSessionCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: getAppBaseUrl().protocol === "https:",
    sameSite: "lax",
    path: "/admin",
    expires: expiresAt,
  };
}

export function getExpiredSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: getAppBaseUrl().protocol === "https:",
    sameSite: "lax",
    path: "/admin",
    expires: new Date(0),
  };
}

export function getSessionCookieName() {
  return getRequiredEnvironmentVariable("SESSION_COOKIE_NAME");
}

function getReviewInitials(author) {
  return author
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatReviewDate(date, fallback) {
  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(date).replace(",", " à");
}

export async function moderateReview(reviewId, status) {
  if (!/^[a-f\d]{24}$/i.test(reviewId) || !["published", "rejected"].includes(status)) {
    return null;
  }

  return ReviewMapper.updateReviewStatusById(reviewId, status, new Date());
}

export async function getDashboardPageData(user, actionMessage = null) {
  const storedReviews = await ReviewMapper.findAllReviews();
  const statusLabels = { pending: "En attente", published: "Publié", rejected: "Refusé" };
  const reviews = storedReviews.map((review) => ({
    id: review._id.toString(),
    author: review.author,
    initials: getReviewInitials(review.author),
    rating: review.rating,
    visitDate: review.visitDate
      ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
          review.visitDate,
        )
      : "date non renseignée",
    submittedAt: formatReviewDate(review.createdAt, "date inconnue"),
    status: review.status,
    statusLabel: statusLabels[review.status],
    comment: review.comment,
  }));
  const counts = reviews.reduce(
    (totals, review) => ({ ...totals, [review.status]: totals[review.status] + 1 }),
    { pending: 0, published: 0, rejected: 0 },
  );

  return {
    layout: "layouts/admin",
    title: "Livre d’or | Administration du Carrousel",
    description: "Gestion des avis du livre d’or du Carrousel.",
    pageClass: "admin-page",
    reviews,
    counts,
    user,
    actionMessage,
  };
}

export class EventValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "EventValidationError";
  }
}

const EVENT_TIME_ZONE = "Europe/Paris";

function formatEventDate(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: EVENT_TIME_ZONE,
  }).format(date);
}

function formatDateTimeLocal(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
      hourCycle: "h23", timeZone: EVENT_TIME_ZONE,
    }).formatToParts(date).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function parseDateTimeLocal(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const [year, month, day, hour, minute] = value.match(/\d+/g).map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23", timeZone: EVENT_TIME_ZONE,
  }).formatToParts(new Date(guess)).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
  const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  const date = new Date(guess - (represented - guess));
  return Number.isNaN(date.getTime()) || formatDateTimeLocal(date) !== value ? null : date;
}

function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function normalizeEventInput(input) {
  const descriptionHtml = sanitizeEventDescription(input.descriptionHtml);
  const event = {
    title: typeof input.title === "string" ? input.title.trim() : "",
    description: eventDescriptionToText(descriptionHtml),
    descriptionHtml,
    startsAt: parseDateTimeLocal(input.startsAt),
    endsAt: parseDateTimeLocal(input.endsAt),
    price: Number(input.price),
    priceDetails: typeof input.priceDetails === "string" ? input.priceDetails.trim() || null : null,
  };
  if (event.title.length < 3 || event.title.length > 150) throw new EventValidationError("Le titre doit contenir entre 3 et 150 caractères.");
  if (event.description.length < 20 || event.description.length > 5000) throw new EventValidationError("La description doit contenir entre 20 et 5 000 caractères.");
  if (!event.startsAt || !event.endsAt) throw new EventValidationError("Les dates de début et de fin sont requises.");
  if (event.endsAt <= event.startsAt) throw new EventValidationError("La fin doit être postérieure au début de l’événement.");
  if (!Number.isFinite(event.price) || event.price < 0 || event.price > 10000) throw new EventValidationError("Le tarif saisi n’est pas valide.");
  if (event.priceDetails && event.priceDetails.length > 500) throw new EventValidationError("La précision tarifaire ne peut pas dépasser 500 caractères.");
  return event;
}

function presentAdminEvent(event) {
  return {
    id: event._id.toString(), slug: event.slug, title: event.title, description: event.description,
    descriptionHtml: event.descriptionHtml || plainEventDescriptionToHtml(event.description),
    startsAt: formatDateTimeLocal(event.startsAt), endsAt: formatDateTimeLocal(event.endsAt),
    formattedStart: formatEventDate(event.startsAt), formattedEnd: formatEventDate(event.endsAt),
    price: event.price, priceDetails: event.priceDetails || "",
  };
}

function getAdminBaseData(user) {
  return { layout: "layouts/admin", pageClass: "admin-page", user };
}

export async function getEventsAdminPageData(user, actionMessage = null) {
  const events = (await EventMapper.findAllEvents()).map(presentAdminEvent);
  const now = new Date();
  return {
    ...getAdminBaseData(user), title: "Événements | Administration du Carrousel",
    description: "Gestion des événements du Carrousel.", actionMessage,
    upcomingEvents: events.filter((event) => new Date(event.endsAt) >= now),
    pastEvents: events.filter((event) => new Date(event.endsAt) < now).reverse(),
  };
}

export function getEventFormPageData(user, event = {}, error = null) {
  return {
    ...getAdminBaseData(user), title: `${event.id ? "Modifier" : "Créer"} un événement | Administration`,
    description: "Formulaire de gestion d’un événement.", event, error,
  };
}

async function createUniqueSlug(title) {
  const base = slugify(title) || "evenement";
  let slug = base;
  let suffix = 2;
  while (await EventMapper.findEventBySlug(slug)) slug = `${base}-${suffix++}`;
  return slug;
}

export async function createEvent(input) {
  const event = normalizeEventInput(input);
  return EventMapper.createEvent({ ...event, slug: await createUniqueSlug(event.title) });
}

export async function getEventForEdition(eventId) {
  if (!/^[a-f\d]{24}$/i.test(eventId)) return null;
  const event = await EventMapper.findEventById(eventId);
  return event ? presentAdminEvent(event) : null;
}

export async function updateEvent(eventId, input) {
  if (!/^[a-f\d]{24}$/i.test(eventId)) return null;
  return EventMapper.updateEventById(eventId, normalizeEventInput(input));
}

export async function deleteEvent(eventId) {
  if (!/^[a-f\d]{24}$/i.test(eventId)) return null;
  return EventMapper.deleteEventById(eventId);
}

function getGeminiConfiguration() {
  return {
    apiKey: getRequiredEnvironmentVariable("GEMINI_API_KEY"),
    model: getRequiredEnvironmentVariable("GEMINI_MODEL"),
  };
}

export async function optimizeEventWithGemini(input) {
  const descriptionHtml = sanitizeEventDescription(input.descriptionHtml);
  const description = eventDescriptionToText(descriptionHtml);
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const priceDetails = typeof input.priceDetails === "string" ? input.priceDetails.trim() : "";

  if (title.length < 3 || title.length > 150) throw new EventValidationError("Renseignez un titre valide avant de lancer l’optimisation.");
  if (description.length < 20 || description.length > 5000) throw new EventValidationError("Renseignez une description d’au moins 20 caractères avant de lancer l’optimisation.");

  const { apiKey, model } = getGeminiConfiguration();
  const prompt = `Tu es un assistant éditorial francophone pour Le Carrousel, une guinguette située à Hannonville-sous-les-Côtes.
Corrige et optimise les informations de cet événement pour une lecture naturelle et un référencement local pertinent.
Ne modifie aucune donnée factuelle, n’invente aucune prestation, aucun horaire, aucun prix et aucune information absente.
Conserve le ton chaleureux du texte. Le titre doit rester concis et descriptif.
La description doit être précise, structurée avec des titres et des paragraphes, et proche de la longueur d’origine : ne la résume pas excessivement.
Dans descriptionHtml, utilise uniquement les balises <p>, <br>, <h2>, <h3>, <strong>, <em>, <u>, <s>, <blockquote>, <ol>, <ul>, <li> et <a href="https://…">.
Structure le contenu avec des titres de niveau 2 ou 3 lorsque sa longueur le justifie. Utilise le gras avec parcimonie pour les informations réellement importantes, et les listes lorsqu’elles améliorent vraiment la lecture.
N’ajoute aucun lien qui n’était pas déjà présent dans le texte fourni.
Dans priceDetails, corrige uniquement ce qui est compris dans le tarif sans répéter le montant du prix.

Informations fournies :
${JSON.stringify({
    title,
    descriptionHtml,
    startsAt: input.startsAt || "",
    endsAt: input.endsAt || "",
    price: input.price || "",
    priceDetails,
  })}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        thinkingConfig: { thinkingLevel: "minimal" },
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            descriptionHtml: { type: "STRING" },
            priceDetails: { type: "STRING" },
          },
          required: ["title", "descriptionHtml", "priceDetails"],
        },
      },
    }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) throw new Error(`Gemini a répondu avec le statut ${response.status}: ${payload?.error?.message || "réponse inconnue"}`);

  const responseText = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
  if (!responseText) throw new Error("Gemini n’a retourné aucune suggestion.");

  const suggestion = JSON.parse(responseText);
  const optimizedTitle = typeof suggestion.title === "string" ? suggestion.title.trim().slice(0, 150) : title;
  const optimizedDescriptionHtml = sanitizeEventDescription(suggestion.descriptionHtml);
  const optimizedDescription = eventDescriptionToText(optimizedDescriptionHtml);
  const optimizedPriceDetails = typeof suggestion.priceDetails === "string" ? suggestion.priceDetails.trim().slice(0, 500) : priceDetails;

  if (optimizedTitle.length < 3 || optimizedDescription.length < 20 || optimizedDescription.length > 5000) {
    throw new Error("La suggestion retournée par Gemini n’est pas exploitable.");
  }

  return { title: optimizedTitle, descriptionHtml: optimizedDescriptionHtml, priceDetails: optimizedPriceDetails };
}
