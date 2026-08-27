import { ReviewMapper } from "../../model/index.mapper.js";

const SUBMISSION_WINDOW_MS = 15 * 60 * 1000;
const SUBMISSION_LIMIT = 5;
const TURNSTILE_ACTION = "guestbook-review";
const submissionAttempts = new Map();

export class ReviewSubmissionError extends Error {
  constructor(message, statusCode = 422) {
    super(message);
    this.name = "ReviewSubmissionError";
    this.statusCode = statusCode;
  }
}

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`La variable d'environnement ${name} est requise.`);
  }

  return value;
}

function normalizeReviewInput(input) {
  return {
    author: typeof input.author === "string" ? input.author.trim() : "",
    email: typeof input.email === "string" ? input.email.trim().toLowerCase() : "",
    visitDate: typeof input.visitDate === "string" ? input.visitDate.trim() : "",
    rating: Number(input.rating),
    comment: typeof input.comment === "string" ? input.comment.trim() : "",
    realExperience: input.realExperience === "on",
    publicationRules: input.publicationRules === "on",
    website: typeof input.website === "string" ? input.website.trim() : "",
  };
}

function validateReviewInput(review) {
  if (review.author.length < 2 || review.author.length > 60) {
    throw new ReviewSubmissionError("Le prénom ou pseudonyme doit contenir entre 2 et 60 caractères.");
  }

  if (review.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(review.email)) {
    throw new ReviewSubmissionError("L’adresse e-mail saisie n’est pas valide.");
  }

  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) {
    throw new ReviewSubmissionError("Veuillez sélectionner une note comprise entre 1 et 5 étoiles.");
  }

  if (review.comment.length < 20 || review.comment.length > 800) {
    throw new ReviewSubmissionError("L’avis doit contenir entre 20 et 800 caractères.");
  }

  if (!review.realExperience || !review.publicationRules) {
    throw new ReviewSubmissionError("Vous devez confirmer les deux engagements avant d’envoyer votre avis.");
  }

  if (review.visitDate) {
    const parsedDate = new Date(`${review.visitDate}T00:00:00.000Z`);

    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== review.visitDate) {
      throw new ReviewSubmissionError("La date de visite saisie n’est pas valide.");
    }

    const today = new Date();
    const todayAsUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

    if (parsedDate.getTime() > todayAsUtc) {
      throw new ReviewSubmissionError("La date de visite ne peut pas être située dans le futur.");
    }
  }
}

function recordSubmissionAttempt(identifier, currentDate = new Date()) {
  const threshold = currentDate.getTime() - SUBMISSION_WINDOW_MS;

  if (submissionAttempts.size > 1000) {
    for (const [storedIdentifier, storedAttempts] of submissionAttempts) {
      const activeAttempts = storedAttempts.filter((attempt) => attempt > threshold);

      if (activeAttempts.length) {
        submissionAttempts.set(storedIdentifier, activeAttempts);
      } else {
        submissionAttempts.delete(storedIdentifier);
      }
    }
  }

  const attempts = (submissionAttempts.get(identifier) || []).filter((attempt) => attempt > threshold);

  if (attempts.length >= SUBMISSION_LIMIT) {
    submissionAttempts.set(identifier, attempts);
    throw new ReviewSubmissionError("Trop de tentatives ont été effectuées. Veuillez réessayer dans quelques minutes.", 429);
  }

  attempts.push(currentDate.getTime());
  submissionAttempts.set(identifier, attempts);
}

async function validateTurnstileToken(token, remoteIp) {
  if (typeof token !== "string" || !token) {
    return false;
  }

  const body = new URLSearchParams({
    secret: getRequiredEnvironmentVariable("TURNSTILE_SECRET_KEY"),
    response: token,
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`La vérification Turnstile a répondu avec le statut ${response.status}.`);
  }

  const result = await response.json();
  const expectedHostname = new URL(getRequiredEnvironmentVariable("APP_BASE_URL")).hostname;

  return result.success === true && result.action === TURNSTILE_ACTION && result.hostname === expectedHostname;
}

export function validateGuestbookConfiguration() {
  getRequiredEnvironmentVariable("TURNSTILE_SITE_KEY");
  getRequiredEnvironmentVariable("TURNSTILE_SECRET_KEY");
  new URL(getRequiredEnvironmentVariable("APP_BASE_URL"));
}

function getInitials(author) {
  return author
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatVisitDate(visitDate) {
  if (!visitDate) {
    return "Date non renseignée";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(visitDate);
}

function presentPublishedReview(review) {
  return {
    id: review._id.toString(),
    author: review.author,
    initials: getInitials(review.author),
    rating: review.rating,
    visitDate: formatVisitDate(review.visitDate),
    comment: review.comment,
  };
}

export async function getPublishedReviews(limit = null) {
  const reviews = await ReviewMapper.findPublishedReviews(limit);
  return reviews.map(presentPublishedReview);
}

export async function getGuestbookPageData() {
  const reviews = await getPublishedReviews();
  const averageRating = reviews.length
    ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1).replace(".", ",")
    : null;

  return {
    title: "Livre d’or | Le Carrousel",
    description: "Découvrez les témoignages laissés par les visiteurs du Carrousel.",
    currentYear: new Date().getFullYear(),
    reviews,
    averageRating,
  };
}

export function getReviewFormPageData(overrides = {}) {
  return {
    title: "Laisser un avis | Le Carrousel",
    description:
      "Partagez votre expérience au Carrousel et laissez un témoignage dans le livre d’or de la guinguette.",
    currentYear: new Date().getFullYear(),
    turnstileSiteKey: getRequiredEnvironmentVariable("TURNSTILE_SITE_KEY"),
    success: false,
    error: null,
    formData: {},
    ...overrides,
  };
}

export async function submitReview(input, remoteIp) {
  const review = normalizeReviewInput(input);

  if (review.website) {
    return { accepted: false, suspectedBot: true };
  }

  recordSubmissionAttempt(remoteIp || "unknown");
  validateReviewInput(review);

  const turnstileIsValid = await validateTurnstileToken(input["cf-turnstile-response"], remoteIp);

  if (!turnstileIsValid) {
    throw new ReviewSubmissionError("La vérification anti-robot a échoué. Veuillez réessayer.");
  }

  const existingReview = await ReviewMapper.findReviewByEmail(review.email);

  if (existingReview) {
    throw new ReviewSubmissionError("Un avis a déjà été déposé avec cette adresse e-mail.", 409);
  }

  let createdReview;

  try {
    createdReview = await ReviewMapper.createReview({
      author: review.author,
      email: review.email,
      visitDate: review.visitDate ? new Date(`${review.visitDate}T00:00:00.000Z`) : null,
      rating: review.rating,
      comment: review.comment,
      status: "pending",
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ReviewSubmissionError("Un avis a déjà été déposé avec cette adresse e-mail.", 409);
    }

    throw error;
  }

  return { accepted: true, reviewId: createdReview._id };
}
