import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useListListsQuery, useCreateListMutation, useDeleteListMutation } from '../api/listsApi.js';

export function Lists() {
  const { data: lists, isLoading } = useListListsQuery();
  const [createList, { isLoading: creating }] = useCreateListMutation();
  const [deleteList] = useDeleteListMutation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'CONTACTS' });
  const [error, setError] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await createList(form).unwrap();
      setForm({ name: '', type: 'CONTACTS' });
      setShowForm(false);
    } catch (err) {
      setError(err.data?.error?.message || 'Could not create list');
    }
  }

  async function handleDelete(id) {
    setError(null);
    try {
      await deleteList(id).unwrap();
    } catch (err) {
      setError(err.data?.error?.message || 'Could not delete list — only admins can delete lists');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Lists</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px"
        >
          New list
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-elevated p-4"
        >
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Name
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-9 w-56 rounded-md border border-border bg-surface-elevated px-3 text-sm text-text outline-none focus:border-focus"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Type
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="h-9 rounded-md border border-border bg-surface-elevated px-3 text-sm text-text outline-none focus:border-focus"
            >
              <option value="CONTACTS">Contacts</option>
              <option value="COMPANIES">Companies</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={creating}
            className="h-9 rounded-md bg-gradient-action px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            Create
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface-elevated">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {lists?.map((list) => (
              <tr key={list.id} className="border-b border-border hover:bg-surface">
                <td className="px-4 py-3 text-sm">
                  <Link to={`/app/lists/${list.id}`} className="font-medium text-text hover:text-primary">
                    {list.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {list.type === 'CONTACTS' ? 'Contacts' : 'Companies'}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-text-muted">{list._count?.items ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(list.id)}
                    className="text-xs font-medium text-text-muted hover:text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {lists && lists.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">
                  {isLoading ? 'Loading…' : "No lists yet — save contacts or companies from search to start one."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
