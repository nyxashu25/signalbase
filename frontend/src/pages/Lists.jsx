import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ListChecks, Plus, Users, Building2, Trash2 } from 'lucide-react';
import { useListListsQuery, useCreateListMutation, useDeleteListMutation } from '../api/listsApi.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, TableFrame, thClass, tdClass, tdMutedClass, trClass } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Illustration } from '../components/ui/illustrations.jsx';
import { SkeletonRows } from '../components/ui/Skeleton.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { Tooltip } from '../components/ui/Tooltip.jsx';
import { useToast } from '../components/ui/toast.jsx';

export function Lists() {
  const { data: lists, isLoading } = useListListsQuery();
  const [createList, { isLoading: creating }] = useCreateListMutation();
  const [deleteList] = useDeleteListMutation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'CONTACTS' });
  const toast = useToast();

  // The command palette's "New list" action deep-links here with ?new=1.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createList(form).unwrap();
      toast.success('List created', `"${form.name}" is ready for contacts.`);
      setForm({ name: '', type: 'CONTACTS' });
      setShowForm(false);
    } catch (err) {
      toast.error('Could not create list', err.data?.error?.message);
    }
  }

  async function handleDelete(list) {
    try {
      await deleteList(list.id).unwrap();
      toast.success('List deleted', `"${list.name}" was removed.`);
    } catch (err) {
      toast.error(
        'Could not delete list',
        err.data?.error?.message || 'Only workspace admins can delete lists.',
      );
    }
  }

  const isEmpty = lists && lists.length === 0;

  return (
    <div>
      <PageHeader
        title="Lists"
        subtitle={lists ? `${lists.length} ${lists.length === 1 ? 'list' : 'lists'}` : undefined}
        description="Save people and companies from search into named lists — the starting point for a sequence or a CSV export."
        actions={
          <Button variant="hero" icon={Plus} onClick={() => setShowForm((v) => !v)}>
            New list
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-4 p-4">
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-text-muted">
              Name
              <input
                type="text"
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Q3 finance leaders"
                className="h-9 w-64 rounded-md border border-border bg-surface-elevated px-3 text-sm font-normal text-text outline-none focus:border-focus focus:ring-2 focus:ring-focus/25"
              />
            </label>
            <div className="flex flex-col gap-1 text-xs font-semibold text-text-muted">
              Type
              <SegmentedControl
                ariaLabel="List type"
                value={form.type}
                onChange={(type) => setForm((f) => ({ ...f, type }))}
                options={[
                  { value: 'CONTACTS', label: 'People' },
                  { value: 'COMPANIES', label: 'Companies' },
                ]}
              />
            </div>
            <Button type="submit" variant="primary" loading={creating}>
              Create
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </form>
        </Card>
      )}

      {isEmpty && !showForm ? (
        <Card>
          <EmptyState
            illustration={<Illustration.Lists />}
            title="Welcome to your lists"
            actions={
              <>
                <Button
                  variant="primary"
                  icon={Users}
                  onClick={() => {
                    setForm({ name: '', type: 'CONTACTS' });
                    setShowForm(true);
                  }}
                >
                  Create a people list
                </Button>
                <Button
                  variant="secondary"
                  icon={Building2}
                  onClick={() => {
                    setForm({ name: '', type: 'COMPANIES' });
                    setShowForm(true);
                  }}
                >
                  Create a company list
                </Button>
              </>
            }
            learnMore={
              <>
                Or add straight from search — every row in{' '}
                <Link to="/app/people" className="font-semibold text-primary hover:underline">
                  People
                </Link>{' '}
                has an “Add to list” button.
              </>
            }
          >
            Lists keep your prospects organized and are what you enroll into a sequence.
          </EmptyState>
        </Card>
      ) : (
        <TableFrame>
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Items</th>
                <th className={thClass}>Created</th>
                <th className={thClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <SkeletonRows rows={5} columns={5} />}
              {lists?.map((list) => (
                <tr key={list.id} className={trClass}>
                  <td className={tdClass}>
                    <Link
                      to={`/app/lists/${list.id}`}
                      className="flex items-center gap-2.5 font-semibold hover:text-primary hover:underline"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                        {list.type === 'CONTACTS' ? (
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </span>
                      {list.name}
                    </Link>
                  </td>
                  <td className={tdMutedClass}>{list.type === 'CONTACTS' ? 'People' : 'Companies'}</td>
                  <td className={`${tdMutedClass} tabular-nums`}>{list._count?.items ?? 0}</td>
                  <td className={tdMutedClass}>
                    {list.createdAt ? new Date(list.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Tooltip content="Delete list">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={Trash2}
                        aria-label={`Delete ${list.name}`}
                        onClick={() => handleDelete(list)}
                        className="hover:text-red-600"
                      />
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      )}
    </div>
  );
}
