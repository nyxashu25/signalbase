import { useCsvDownload } from '../hooks/useCsvDownload.js';
import { useGetCreditCostsQuery } from '../api/billingApi.js';

export function ExportCsvButton({ path, label = 'Export CSV' }) {
  const { download, isDownloading, error } = useCsvDownload();
  const { data: costs } = useGetCreditCostsQuery();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => download(path)}
        disabled={isDownloading}
        title={costs ? `Spends ${costs.CSV_EXPORT} credits` : undefined}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-muted hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDownloading ? 'Exporting…' : label}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
