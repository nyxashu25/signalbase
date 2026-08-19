// A friendly rabbit mark for the account avatar — two long ears plus a
// round head reads clearly as "rabbit" even at 20px, so no face detail is
// needed. Single-color silhouette (currentColor) so it inherits whatever
// text color its container sets, same convention as the other icons.
export function RabbitAvatar({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <ellipse cx="8.5" cy="6.5" rx="1.8" ry="5.5" transform="rotate(-18 8.5 6.5)" />
      <ellipse cx="15.5" cy="6.5" rx="1.8" ry="5.5" transform="rotate(18 15.5 6.5)" />
      <circle cx="12" cy="15.5" r="6" />
    </svg>
  );
}
