export function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
      <span>
        {start}–{end} of {total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
