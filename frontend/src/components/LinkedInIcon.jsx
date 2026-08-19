// Real brand mark (not a monochrome line icon like the rest of the app's
// icons) -- this is a link out to an external, recognizable service, so
// legibility as "that's LinkedIn" matters more than palette consistency.
export function LinkedInIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M7.6 9.6H5V19h2.6V9.6ZM6.3 8.4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM19 13.4c0-2.6-1.4-3.8-3.3-3.8-1.5 0-2.2.85-2.6 1.44V9.6H10.5c.03.7 0 9.4 0 9.4h2.6v-5.25c0-.28.02-.56.1-.76.22-.56.73-1.14 1.58-1.14 1.12 0 1.57.85 1.57 2.1V19H19v-5.6Z"
      />
    </svg>
  );
}
