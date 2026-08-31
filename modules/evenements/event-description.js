import sanitizeHtml from "sanitize-html";

const ALLOWED_DESCRIPTION_TAGS = ["p", "br", "h2", "h3", "strong", "em", "u", "s", "blockquote", "ol", "ul", "li", "a"];

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function decodeHtmlEntities(value) {
  const namedEntities = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (entity, code) => {
    if (code[0] !== "#") return namedEntities[code.toLowerCase()] ?? entity;
    const hexadecimal = code[1].toLowerCase() === "x";
    const codePoint = Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint);
  });
}

export function sanitizeEventDescription(value) {
  return sanitizeHtml(typeof value === "string" ? value : "", {
    allowedTags: ALLOWED_DESCRIPTION_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  }).trim();
}

export function eventDescriptionToText(value) {
  const htmlWithBreaks = sanitizeEventDescription(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/(p|h2|h3|blockquote|ol|ul)>/gi, "\n\n");
  const text = sanitizeHtml(htmlWithBreaks, { allowedTags: [], allowedAttributes: {} });
  return decodeHtmlEntities(text).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function plainEventDescriptionToHtml(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  return text.split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`).join("");
}
