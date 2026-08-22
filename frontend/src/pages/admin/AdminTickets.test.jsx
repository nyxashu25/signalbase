import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminTickets } from './AdminTickets.jsx';
import { renderWithProviders, authenticatedAdminState, mockFetchRoutes } from '../../test/testUtils.jsx';

const ticket = {
  id: 't1',
  subject: 'Custom pricing',
  type: 'SALES',
  status: 'UNANSWERED',
  workspace: { id: 'w1', name: 'Acme Workspace' },
  createdBy: { id: 'u1', email: 'owner@acme.test' },
  updatedAt: '2026-08-20T10:00:00.000Z',
};

describe('AdminTickets', () => {
  it('lists tickets with their workspace and requester', async () => {
    mockFetchRoutes([
      {
        url: /\/tickets\?/,
        method: 'GET',
        respond: { body: { results: [ticket], total: 1, page: 1, pageSize: 25 } },
      },
    ]);
    renderWithProviders(<AdminTickets />, { preloadedState: authenticatedAdminState });

    expect(await screen.findByText('Custom pricing')).toBeInTheDocument();
    expect(screen.getByText('Acme Workspace')).toBeInTheDocument();
    expect(screen.getByText('owner@acme.test')).toBeInTheDocument();
  });

  it('filters by type', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: /\/tickets\?/,
        method: 'GET',
        respond: (url) => ({
          body: url.includes('type=SUPPORT')
            ? { results: [], total: 0, page: 1, pageSize: 25 }
            : { results: [ticket], total: 1, page: 1, pageSize: 25 },
        }),
      },
    ]);
    renderWithProviders(<AdminTickets />, { preloadedState: authenticatedAdminState });
    await screen.findByText('Custom pricing');

    await user.click(screen.getByRole('button', { name: 'Support' }));
    await waitFor(() => expect(screen.getByText('No tickets here')).toBeInTheDocument());
  });
});

describe('AdminTickets customer-replied nudge', () => {
  it('flags an unanswered ticket whose last message came from the customer on a multi-message thread', async () => {
    mockFetchRoutes([
      {
        url: /\/tickets\?/,
        method: 'GET',
        respond: {
          body: {
            results: [
              { ...ticket, id: 'fresh', subject: 'Brand new', lastMessageAuthorType: 'USER', messageCount: 1 },
              { ...ticket, id: 'replied', subject: 'They came back', lastMessageAuthorType: 'USER', messageCount: 3 },
            ],
            total: 2,
            page: 1,
            pageSize: 25,
            counts: { ACTIVE: 2, UNANSWERED: 2, ANSWERED: 0, CLOSED: 0 },
          },
        },
      },
    ]);
    renderWithProviders(<AdminTickets />, { preloadedState: authenticatedAdminState });
    expect(await screen.findByText('They came back')).toBeInTheDocument();
    expect(screen.getAllByText('Customer replied')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^Unanswered/ })).toHaveTextContent('2');
  });
});
