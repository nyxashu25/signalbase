import { useDispatch } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { listsApi, useGetListQuery, useRemoveListItemMutation } from '../api/listsApi.js';
import { useRevealContactMutation } from '../api/contactsApi.js';
import { ExportCsvButton } from '../components/ExportCsvButton.jsx';
import { ContactRow, CONTACT_COLUMNS } from '../components/ContactRow.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { TableFrame, thClass, tdClass, tdMutedClass, trClass } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton, SkeletonRows } from '../components/ui/Skeleton.jsx';
import { LetterAvatar } from '../components/ui/LetterAvatar.jsx';
import { Tooltip } from '../components/ui/Tooltip.jsx';
import { Illustration } from '../components/ui/illustrations.jsx';

// The people view of a list reuses the search table's ContactRow, so a
// saved contact can be revealed (email + phone) right here and the row
// matches People column-for-column (docs/UX-ROADMAP.md §4.5).
const LIST_CONTACT_COLUMNS = CONTACT_COLUMNS.map((c) => c.key);

export function ListDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { data: list, isLoading } = useGetListQuery(id);
  const [removeItem] = useRemoveListItemMutation();
  const [revealContact] = useRevealContactMutation();

  async function handleReveal(contactId) {
    const result = await revealContact({ contactId, idempotencyKey: crypto.randomUUID() }).unwrap();
    dispatch(
      listsApi.util.updateQueryData('getList', id, (draft) => {
        const item = draft.items.find((i) => i.contact?.id === contactId);
        if (item?.contact) {
          item.contact.email = result.email;
          item.contact.emailVerified = result.emailVerified;
          item.contact.phone = result.phone ?? item.contact.phone;
          item.contact.revealed = true;
        }
      }),
    );
  }

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
        <table className={isContacts ? 'w-full min-w-[1040px]' : 'w-full'}>
          <thead>
            <tr>
              {isContacts ? (
                CONTACT_COLUMNS.map((c) => (
                  <th key={c.key} className={`${thClass} ${c.key === 'linkedin' ? '!px-3' : ''}`}>
                    {c.key === 'linkedin' ? <span className="sr-only">LinkedIn</span> : c.label}
                  </th>
                ))
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
            {list.items.map((item) =>
              isContacts && item.contact ? (
                <ContactRow
                  key={item.id}
                  contact={item.contact}
                  onReveal={handleReveal}
                  columns={LIST_CONTACT_COLUMNS}
                  trailingAction={
                    <Tooltip content="Remove from list">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={X}
                        aria-label={`Remove ${item.contact.firstName} ${item.contact.lastName} from list`}
                        onClick={() => removeItem({ listId: list.id, itemId: item.id })}
                      />
                    </Tooltip>
                  }
                />
              ) : (
                <tr key={item.id} className={trClass}>
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
              ),
            )}
            {list.items.length === 0 && (
              <tr>
                <td colSpan={isContacts ? CONTACT_COLUMNS.length + 1 : 4}>
                  <EmptyState
                    compact
                    illustration={isContacts ? <Illustration.People /> : <Illustration.Companies />}
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
