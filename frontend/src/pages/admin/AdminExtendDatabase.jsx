import { Fragment, useEffect, useRef, useState } from 'react';
import {
  useListDatabaseImportsQuery,
  useUploadDatabaseImportMutation,
  useApproveDatabaseImportMutation,
} from '../../api/adminDataApi.js';

const STATUS_STYLES = {
  PROCESSING: 'bg-amber-500/15 text-amber-400',
  PENDING_APPROVAL: 'bg-neon-violet/15 text-mauve-magic',
  APPROVED: 'bg-emerald-500/15 text-emerald-400',
  FAILED: 'bg-red-500/15 text-red-400',
};

const STATUS_LABELS = {
  PROCESSING: 'Processing',
  PENDING_APPROVAL: 'Pending review',
  APPROVED: 'Live',
  FAILED: 'Failed',
};

export function AdminExtendDatabase() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [pollMs, setPollMs] = useState(0);
  const { data: batches } = useListDatabaseImportsQuery(undefined, { pollingInterval: pollMs });
  const [upload, { isLoading: uploading }] = useUploadDatabaseImportMutation();
  const [approve, { isLoading: approving }] = useApproveDatabaseImportMutation();

  // Poll while a batch is still processing in the background worker; stop
  // once every batch has settled into a terminal (or review) state.
  useEffect(() => {
    const hasProcessing = batches?.some((b) => b.status === 'PROCESSING');
    setPollMs(hasProcessing ? 3000 : 0);
  }, [batches]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile) return;
    setUploadError(null);
    try {
      await upload(selectedFile).unwrap();
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err.data?.error?.message || 'Upload failed. Please try again.');
    }
  }

  async function handleApprove(batchId) {
    try {
      await approve(batchId).unwrap();
    } catch {
      // surfaced via the batch's own errors on refetch; nothing else to do here
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Extend database</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-300">
        Upload a CSV in the RPF format to add companies and contacts to the live database. New
        rows are inserted right away but stay out of search until you review the batch and
        publish it.
      </p>

      <form
        onSubmit={handleUpload}
        className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-ink-900 p-5"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          className="text-sm text-ink-300 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-white/15"
        />
        <button
          type="submit"
          disabled={!selectedFile || uploading}
          className="rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Upload CSV'}
        </button>
        {uploadError && <p className="w-full text-sm text-red-400">{uploadError}</p>}
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-white/10 bg-ink-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs font-bold uppercase tracking-wide text-ink-300">
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rows</th>
              <th className="px-4 py-3">Companies</th>
              <th className="px-4 py-3">Contacts</th>
              <th className="px-4 py-3">Errors</th>
              <th className="px-4 py-3">Uploaded by</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {batches?.map((b) => (
              <Fragment key={b.id}>
                <tr className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-sm text-white">{b.filename}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[b.status]}`}
                    >
                      {STATUS_LABELS[b.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-ink-300">{b.totalRows}</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-ink-300">
                    {b.insertedCompanies}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-ink-300">
                    {b.insertedContacts}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {b.errorCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                        className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-400 hover:bg-red-500/25"
                      >
                        {b.errorCount} {expandedId === b.id ? '▲' : '▼'}
                      </button>
                    ) : (
                      <span className="text-ink-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-300">{b.uploadedBy?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-ink-300">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {b.status === 'PENDING_APPROVAL' && (
                      <button
                        type="button"
                        disabled={approving}
                        onClick={() => handleApprove(b.id)}
                        className="rounded-md bg-gradient-action px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Approve &amp; publish
                      </button>
                    )}
                    {b.status === 'APPROVED' && (
                      <span className="text-xs text-ink-300">
                        by {b.approvedBy?.name ?? '—'}
                      </span>
                    )}
                  </td>
                </tr>
                {expandedId === b.id && b.errors?.length > 0 && (
                  <tr key={`${b.id}-errors`} className="border-b border-white/5 bg-black/20">
                    <td colSpan={9} className="px-4 py-3">
                      <ul className="space-y-1 text-xs text-ink-300">
                        {b.errors.map((e, i) => (
                          <li key={i}>
                            {e.row ? `Row ${e.row}: ` : ''}
                            {e.message}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {batches && batches.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-ink-300">
                  No imports yet — upload a CSV to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
