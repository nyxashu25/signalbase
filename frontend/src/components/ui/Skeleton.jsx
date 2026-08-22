import { cn } from './cn.js';

export function Skeleton({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded-sm bg-surface-sunken', className)}
    />
  );
}

// A table body of shimmering rows, sized to the real column count so the
// layout doesn't jump when data lands.
export function SkeletonRows({ rows = 6, columns = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-border last:border-0">
          {Array.from({ length: columns }).map((__, c) => (
            <td key={c} className="px-4 py-3.5">
              <Skeleton className={cn('h-3.5', c === 0 ? 'w-36' : c % 3 === 0 ? 'w-16' : 'w-24')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
