/**
 * Normalizes any LinkedIn profile URL to its stable identity — the `<slug>`
 * in linkedin.com/in/<slug> — so the extension's observed URL and our stored
 * Contact.linkedinUrl compare equal despite ?utm params, country subdomains
 * (in.linkedin.com), www/no-www, trailing slashes, and casing. Must stay in
 * step with the SQL backfill in the add_extension_pipeline migration.
 *
 * Returns null for anything that isn't a recognizable profile URL (company
 * pages, feed URLs, garbage) — callers treat null as "no LinkedIn identity".
 */
export function linkedinSlugFromUrl(url) {
  if (!url) return null;
  // Host must BE linkedin.com or a subdomain of it — `([^/]*\.)?` (not a
  // bare `[^/]*`) so a lookalike host like xlinkedin.com can't smuggle a
  // match.
  const match = String(url).match(/^https?:\/\/([^/]*\.)?linkedin\.com\/in\/([^/?#]+)/i);
  if (!match) return null;

  let slug = match[2];
  try {
    // Some profile slugs arrive percent-encoded (unicode names); decode so
    // both encodings map to one identity. Malformed escapes keep the raw form.
    slug = decodeURIComponent(slug);
  } catch {
    /* keep the raw slug */
  }
  slug = slug.trim().toLowerCase();
  return slug || null;
}
