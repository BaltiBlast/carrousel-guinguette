import { EventMapper } from "../../model/index.mapper.js";

function getSiteOrigin() {
  return new URL(process.env.APP_BASE_URL).origin;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createUrlEntry(origin, path, lastModified = null) {
  const location = escapeXml(new URL(path, `${origin}/`).href);
  const lastModifiedTag = lastModified ? `\n    <lastmod>${lastModified.toISOString()}</lastmod>` : "";

  return `  <url>\n    <loc>${location}</loc>${lastModifiedTag}\n  </url>`;
}

export function getRobotsText() {
  const origin = getSiteOrigin();

  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

export async function getSitemapXml() {
  const origin = getSiteOrigin();
  const events = await EventMapper.findAllEvents();
  const staticPaths = ["/", "/evenements/", "/livre-d-or/"];
  const entries = staticPaths.map((path) => createUrlEntry(origin, path));

  for (const event of events) {
    entries.push(createUrlEntry(origin, `/evenements/${encodeURIComponent(event.slug)}`, event.updatedAt));
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}
