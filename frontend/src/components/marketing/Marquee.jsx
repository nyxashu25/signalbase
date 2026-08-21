/**
 * A full-bleed horizontal ticker — the content renders twice inside a track
 * that slides exactly -50% and loops, so it reads as one seamless infinite
 * band (see the marquee-slide keyframes in index.css, which also freeze it
 * under prefers-reduced-motion). The second copy is aria-hidden so screen
 * readers hear each item once.
 */
export function Marquee({ items, className = '', speed = 30 }) {
  const row = (hidden) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item) => (
        <span key={item} className="flex items-center whitespace-nowrap">
          <span className="px-6">{item}</span>
          <span className="text-mauve-magic">✦</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        className="marquee-track flex w-max"
        style={{ animation: `marquee-slide ${speed}s linear infinite` }}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
