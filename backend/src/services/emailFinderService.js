// Real, deterministic pattern-based guessing — no external dependency. This
// is genuinely how most B2B email-finder products bootstrap a guess before
// (optionally) confirming it with a paid verification provider.
// `first.last@domain` is by a wide margin the most common corporate
// convention, so it's the single best-effort guess for MVP rather than
// generating N candidates with no way to rank them (verification is stubbed).
export function findEmail({ firstName, lastName, domain }) {
  const local = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
  return { email: `${local}@${domain}`, pattern: 'first.last' };
}
