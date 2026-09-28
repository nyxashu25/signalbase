// The email-format taxonomy behind the public email-format pages and the
// public email finder (routes/publicTools.js). Pure functions only — the
// aggregation over real contacts lives in emailFormatService.js.

// Order matters: when two patterns produce the same local part (a
// one-letter first name makes "flast" and "firstlast" identical) the
// earlier one wins — except that a one-letter name is almost always an
// initial, so an initial-based pattern is preferred then (see
// classifyLocalPart). 'other' is the catch-all and has no builder.
// `initial` says which name part a pattern shortens to one letter.
const BUILDERS = [
  ['first.last', (f, l) => `${f}.${l}`],
  ['firstlast', (f, l) => `${f}${l}`],
  ['first_last', (f, l) => `${f}_${l}`],
  ['first-last', (f, l) => `${f}-${l}`],
  ['flast', (f, l) => `${f[0]}${l}`, 'first'],
  ['f.last', (f, l) => `${f[0]}.${l}`, 'first'],
  ['firstl', (f, l) => `${f}${l[0]}`, 'last'],
  ['first.l', (f, l) => `${f}.${l[0]}`, 'last'],
  ['first', (f) => f],
  ['last', (f, l) => l],
  ['last.first', (f, l) => `${l}.${f}`],
  ['lastfirst', (f, l) => `${l}${f}`],
  ['lastf', (f, l) => `${l}${f[0]}`, 'first'],
];

const BUILDER_BY_PATTERN = new Map(BUILDERS.map(([pattern, build]) => [pattern, build]));

export const OTHER_PATTERN = 'other';

/** Every pattern the taxonomy knows, in priority order, ending with 'other'. */
export const PATTERNS = [...BUILDERS.map(([pattern]) => pattern), OTHER_PATTERN];

// Every example on a public page is built from this placeholder, never from
// a real person's name.
export const EXAMPLE_NAME = { firstName: 'Jane', lastName: 'Doe' };

// Letters NFD doesn't decompose into a base letter plus a mark, so
// stripping marks alone would drop them ("Søren" -> "sren").
const TRANSLITERATE = {
  ß: 'ss',
  ẞ: 'ss',
  æ: 'ae',
  Æ: 'ae',
  œ: 'oe',
  Œ: 'oe',
  ø: 'o',
  Ø: 'o',
  ł: 'l',
  Ł: 'l',
  đ: 'd',
  Đ: 'd',
  ð: 'd',
  Ð: 'd',
  þ: 'th',
  Þ: 'th',
  ı: 'i',
};
const TRANSLITERABLE = new RegExp(`[${Object.keys(TRANSLITERATE).join('')}]`, 'g');

function foldName(name) {
  return String(name ?? '')
    .replace(TRANSLITERABLE, (ch) => TRANSLITERATE[ch])
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/** "José-Luis" -> "joseluis", "O'Brien" -> "obrien", "Søren" -> "soren", "李" -> "". */
export function normalizeNamePart(name) {
  return foldName(name).replace(/[^a-z]/g, '');
}

/**
 * The spellings a name part can take inside an address: the letters run
 * together ("smithjones") and, for a hyphenated or several-word name
 * ("Smith-Jones", "Jean Luc"), the words joined by a hyphen or a dot
 * ("smith-jones", "jean.luc"). The run-together form comes first. Empty
 * for a name with no letters.
 */
function nameVariants(name) {
  const joined = normalizeNamePart(name);
  if (!joined) return [];
  const words = foldName(name)
    .split(/[\s.-]+/)
    .map((w) => w.replace(/[^a-z]/g, ''))
    .filter(Boolean);
  return words.length > 1 ? [joined, words.join('-'), words.join('.')] : [joined];
}

/**
 * The local part `pattern` produces for this name, or null when it can't
 * (the 'other' bucket, an unknown pattern, or a name with no letters left
 * after normalizing).
 */
export function applyPattern(pattern, firstName, lastName) {
  const build = BUILDER_BY_PATTERN.get(pattern);
  const f = normalizeNamePart(firstName);
  const l = normalizeNamePart(lastName);
  if (!build || !f || !l) return null;
  return build(f, l);
}

/**
 * The pattern a contact's address follows, given their name. A "+tag"
 * (plus-addressing, "jane.doe+news") is ignored.
 */
export function classifyLocalPart(localPart, firstName, lastName) {
  const local = String(localPart ?? '')
    .toLowerCase()
    .replace(/\+.*$/, '');
  const firsts = nameVariants(firstName);
  const lasts = nameVariants(lastName);
  if (!local || !firsts.length || !lasts.length) return OTHER_PATTERN;

  const matches = [];
  for (const [pattern, build, initial] of BUILDERS) {
    const hit = firsts.some((f) => lasts.some((l) => build(f, l) === local));
    if (hit) matches.push({ pattern, initial });
  }
  if (!matches.length) return OTHER_PATTERN;

  // "J Doe" with jdoe@: both firstlast and flast fit, but the one-letter
  // name is an initial, so the company's format is flast.
  const shortPart = firsts[0].length === 1 ? 'first' : lasts[0].length === 1 ? 'last' : null;
  const preferred = shortPart && matches.find((m) => m.initial === shortPart);
  return (preferred ?? matches[0]).pattern;
}

/** The placeholder address for a pattern at a domain — "jane.doe@acme.com". '' for 'other'. */
export function exampleAddress(pattern, domain) {
  const local = applyPattern(pattern, EXAMPLE_NAME.firstName, EXAMPLE_NAME.lastName);
  return local ? `${local}@${domain}` : '';
}
