import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { baseApi } from '../api/baseApi.js';

// RTK Query's fetchBaseQuery assumes JSON — a file download needs the raw
// Response (to read Content-Disposition and get a Blob), so this goes
// through fetch() directly rather than an injected endpoint. Still carries
// the same bearer token as every other request.
export function useCsvDownload() {
  const token = useSelector((s) => s.auth.accessToken);
  const dispatch = useDispatch();
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  async function download(path) {
    setError(null);
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/v1${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.status === 402) {
        setError('Not enough credits for this export — add more credits to continue.');
        return;
      }
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? 'export.csv';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      dispatch(baseApi.util.invalidateTags(['BillingSummary']));
    } catch {
      setError('Export failed — try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  return { download, isDownloading, error };
}
