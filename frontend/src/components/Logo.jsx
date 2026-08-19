// Renders both theme variants and lets CSS (index.css .theme-logo-*) pick the
// visible one — same [data-theme]/prefers-color-scheme rules as the color
// tokens, so it swaps with zero JS and no flash on load or on toggle.
export function Logo({ className = '' }) {
  return (
    <>
      <img
        src="/logos/datapit-logo-light.svg"
        alt="DataPit"
        className={`theme-logo-light ${className}`}
      />
      <img
        src="/logos/datapit-logo-dark.svg"
        alt="DataPit"
        className={`theme-logo-dark ${className}`}
      />
    </>
  );
}
