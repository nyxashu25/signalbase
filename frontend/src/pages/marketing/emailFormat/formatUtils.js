// Wording for the company email-format pages, from the aggregate
// CompanyFormat the API returns (GET /api/v1/public/email-formats[/:domain]).
// Examples are the pattern applied to the placeholder name Jane Doe —
// never a real person's address.
import { formatCount } from '../../../data/facts.js';

export const MIN_CONTACTS = 5;

export const percent = (share) => `${Math.round((Number(share) || 0) * 100)}%`;

export const isOther = (p) => p.pattern === 'other';

/** The company's patterns, most used first, with the 'other' bucket last. */
export function sortedPatterns(company) {
  return [...(company.patterns ?? [])].sort(
    (a, b) => Number(isOther(a)) - Number(isOther(b)) || b.count - a.count,
  );
}

/** The most used named pattern (not 'other'), or null. */
export function topPattern(company) {
  return sortedPatterns(company).find((p) => !isOther(p)) ?? null;
}

/**
 * The answer-first sentence: "The most common email format at Acme is
 * first.last@acme.com (jane.doe@acme.com), used by 72% of the 18 Acme
 * addresses in DataPit."
 */
export function answerSentence(company) {
  const { name, domain } = company;
  const n = formatCount(company.sampleSize);
  const top = topPattern(company);
  if (!top)
    return `${name}’s ${n} addresses in DataPit don’t follow a standard format like first.last.`;
  const other = (company.patterns ?? []).find(isOther);
  const used = `${top.pattern}@${domain} (${top.example}), used by ${percent(top.share)} of the ${n} ${name} addresses in DataPit.`;
  // When the mixed 'other' bucket outnumbers every named pattern, say so first.
  if (other && other.count > top.count)
    return `${name} has no single standard email format. The most common one is ${used}`;
  return `The most common email format at ${name} is ${used}`;
}

/** "A", "B", ... for grouping the index; '#' for names starting with a digit or symbol. */
export function initialOf(name) {
  const ch = String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .charAt(0)
    .toUpperCase();
  return /[A-Z]/.test(ch) ? ch : '#';
}

/** Companies A to Z by name, grouped by initial: [{ letter, companies }]. */
export function groupAlphabetically(companies) {
  const sorted = [...companies].sort(
    (a, b) =>
      String(a.name).localeCompare(String(b.name), 'en', { sensitivity: 'base' }) ||
      a.domain.localeCompare(b.domain),
  );
  const byLetter = new Map();
  for (const company of sorted) {
    const letter = initialOf(company.name);
    if (!byLetter.has(letter)) byLetter.set(letter, []);
    byLetter.get(letter).push(company);
  }
  // A to Z, then names that start with a digit or symbol.
  return [...byLetter.keys()]
    .sort((a, b) => (a === '#') - (b === '#') || a.localeCompare(b))
    .map((letter) => ({ letter, companies: byLetter.get(letter) }));
}
