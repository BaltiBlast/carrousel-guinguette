import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { MagicLinkTokenMapper, ReviewMapper, SessionMapper, UserMapper } from "../../model/index.mapper.js";

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
    title: "Tableau de bord | Administration du Carrousel",
    description: "Tableau de bord de l’administration du Carrousel.",
    pageClass: "admin-page",
    reviews,
    counts,
    user,
    actionMessage,
  };
}
