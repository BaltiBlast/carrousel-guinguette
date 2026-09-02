import nodemailer from "nodemailer";

let transporter;

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`La variable d'environnement ${name} est requise.`);
  return value;
}

function getSmtpPort() {
  const port = Number(getRequiredEnvironmentVariable("SMTP_PORT"));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("La variable d'environnement SMTP_PORT doit contenir un port valide.");
  }
  return port;
}

function getSmtpSecure() {
  const value = getRequiredEnvironmentVariable("SMTP_SECURE").toLowerCase();
  if (value !== "true" && value !== "false") {
    throw new Error("La variable d'environnement SMTP_SECURE doit valoir true ou false.");
  }
  return value === "true";
}

function getTransporter() {
  transporter ||= nodemailer.createTransport({
    host: getRequiredEnvironmentVariable("SMTP_HOST"),
    port: getSmtpPort(),
    secure: getSmtpSecure(),
    auth: {
      user: getRequiredEnvironmentVariable("SMTP_USER"),
      pass: getRequiredEnvironmentVariable("SMTP_PASSWORD"),
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
  return transporter;
}

export function validateEmailConfiguration() {
  getRequiredEnvironmentVariable("SMTP_HOST");
  getSmtpPort();
  getSmtpSecure();
  getRequiredEnvironmentVariable("SMTP_USER");
  getRequiredEnvironmentVariable("SMTP_PASSWORD");
  getRequiredEnvironmentVariable("EMAIL_FROM");
}

export function verifyEmailConnection() {
  validateEmailConfiguration();
  return getTransporter().verify();
}

export function sendTransactionalEmail({ to, subject, html, text, idempotencyKey }) {
  return getTransporter().sendMail({
    from: getRequiredEnvironmentVariable("EMAIL_FROM"),
    to,
    subject,
    html,
    text,
    ...(idempotencyKey ? { messageId: `<${idempotencyKey.replace(/[^a-zA-Z0-9._/-]/g, "-")}@notifications.le-carrousel>` } : {}),
  });
}
