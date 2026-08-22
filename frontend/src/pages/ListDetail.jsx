import { Link, useParams } from 'react-router-dom';
import { Users, Building2, Search, X } from 'lucide-react';
import { useGetListQuery, useRemoveListItemMutation } from '../api/listsApi.js';
import { ExportCsvButton } from '../components/ExportCsvButton.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { TableFrame, thClass, tdClass, tdMutedClass, trClass } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton, SkeletonRows } from '../components/ui/Skeleton.jsx';
import { LetterAvatar } from '../components/ui/LetterAvatar.jsx';
import { Tooltip } from '../components/ui/Tooltip.jsx';

export function ListDetail() {
  const { id } = useParams();
  const { data: list, isLoading } = useGetListQuery(id);
  const [removeItem] = useRemoveListItemMutation();

  if (isLoading || !list) {
    return (
      <div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-7 w-64" />
        <TableFrame className="mt-6">
          <table className="w-full">
            <tbody>
              <SkeletonRows rows={5} columns={4} />
            </tbody>
          </table>
        </TableFrame>
      </div>
    );
  }

  const isContacts = list.type === 'CONTACTS';
  const searchTo = isContacts ? '/app/people' : '/app/companies';

  return (
    <div>
      <PageHeader
        backTo="/app/lists"
        backLabel="Lists"
        title={list.name}
        subtitle={`${isContacts ? 'People' : 'Companies'} · ${list.items.length} saved`}
        actions={
          <>
            <Button variant="secondary" icon={Search} to={searchTo}>
              Add from search
            </Button>
            {list.items.length > 0 && <ExportCsvButton path={`/lists/${list.id}/export`} />}
          </>
        }
      />

      <TableFrame>
        <table className="w-full">
          <thead>
            <tr>
              {isContacts ? (
                <>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Title</th>
                  <th className={thClass}>Company</th>
                </>
              ) : (
                <>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Domain</th>
                  <th className={thClass}>Industry</th>
                </>
              )}
              <th className={thClass}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((item) => (
              <tr key={item.id} className={trClass}>
                {isContacts ? (
                  <>
                    <td className={tdClass}>
                      <span className="flex items-center gap-2.5 font-semibold">
                        <LetterAvatar
                          name={`${item.contact?.firstName ?? ''} ${item.contact?.lastName ?? ''}`}
                          size="sm"
                        />
                        {item.contact?.firstName} {item.contact?.lastName}
                      </span>
                    </td>
                    <td className={tdMutedClass}>{item.contact?.title ?? '—'}</td>
                    <td className={tdMutedClass}>{item.contact?.company?.name ?? '—'}</td>
                  </>
                ) : (
                  <>
                    <td className={tdClass}>
                      <Link
                        to={`/app/companies/${item.company?.id}`}
                        className="flex items-center gap-2.5 font-semibold hover:text-primary hover:underline"
                      >
                        <LetterAvatar name={item.company?.name ?? ''} size="sm" square />
                        {item.company?.name}
                      </Link>
                    </td>
                    <td className={tdMutedClass}>{item.company?.domain}</td>
                    <td className={tdMutedClass}>{item.company?.industry ?? '—'}</td>
                  </>
                )}
                <td className="px-4 py-2 text-right">
                  <Tooltip content="Remove from list">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={X}
                      aria-label="Remove from list"
                      onClick={() => removeItem({ listId: list.id, itemId: item.id })}
                    />
                  </Tooltip>
                </td>
              </tr>
            ))}
            {list.items.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    compact
                    icon={isContacts ? Users : Building2}
                    title="Nothing saved here yet"
                    actions={
                      <Button variant="primary" icon={Search} to={searchTo}>
                        {isContacts ? 'Find people' : 'Find companies'}
                      </Button>
                    }
                  >
                    Add {isContacts ? 'contacts' : 'companies'} from search and they&rsquo;ll show
                    up in this list.
                  </EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableFrame>
    </div>
  );
}
