import { Download } from 'lucide-react';
import { useCsvDownload } from '../hooks/useCsvDownload.js';
import { useGetCreditCostsQuery } from '../api/billingApi.js';
import { Button } from './ui/Button.jsx';

export function ExportCsvButton({ path, label = 'Export CSV', size = 'md', variant = 'secondary' }) {
  const { download, isDownloading, error } = useCsvDownload();
  const { data: costs } = useGetCreditCostsQuery();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        icon={Download}
        onClick={() => download(path)}
        loading={isDownloading}
        title={costs ? `Spends ${costs.CSV_EXPORT} credits` : undefined}
      >
        {isDownloading ? 'Exporting…' : label}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
