import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

/**
 * `1–25 of 196` · [25 per page ▾] · ‹ [page ▾] ›
 * onPageSizeChange is optional — without it the page-size control is
 * hidden (for tables whose size is fixed by the caller).
 */
export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const selectClass =
    'h-8 appearance-none rounded-md border border-border bg-surface-elevated px-2 text-xs font-semibold text-text outline-none focus:border-focus focus:ring-2 focus:ring-focus/25';
  const navBtn =
    'flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-muted hover:bg-surface-hover hover:text-text disabled:pointer-events-none disabled:opacity-40';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-sm text-text-muted">
      <span className="tabular-nums">
        {start}–{end} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
            className={selectClass}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className={navBtn}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        {totalPages > 1 ? (
          <select
            value={page}
            onChange={(e) => onPageChange(Number(e.target.value))}
            aria-label="Page"
            className={selectClass}
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} / {totalPages}
              </option>
            ))}
          </select>
        ) : (
          <span className="px-1 text-xs font-semibold tabular-nums text-text">1 / 1</span>
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className={navBtn}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
