import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tickets } from './Tickets.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

const activeTicket = {
  id: 't-active',
  subject: 'Bug report',
  type: 'SUPPORT',
  status: 'UNANSWERED',
  updatedAt: '2026-08-20T10:00:00.000Z',
};
const closedTicket = {
  id: 't-closed',
  subject: 'Request a demo',
  type: 'SALES',
  status: 'CLOSED',
  updatedAt: '2026-08-19T10:00:00.000Z',
};

describe('Tickets', () => {
  it('shows the active tickets by default', async () => {
    mockFetchRoutes([
      {
        url: /\/tickets\?/,
        method: 'GET',
        respond: (url) => ({
          body: url.includes('status=CLOSED')
            ? { results: [closedTicket], total: 1, page: 1, pageSize: 25 }
            : { results: [activeTicket], total: 1, page: 1, pageSize: 25 },
        }),
      },
    ]);
    renderWithProviders(<Tickets />, { preloadedState: authenticatedState });

    expect(await screen.findByText('Bug report')).toBeInTheDocument();
    expect(screen.getByText('Awaiting reply')).toBeInTheDocument();
    expect(screen.queryByText('Request a demo')).not.toBeInTheDocument();
  });

  it('switches to the Closed tab and shows closed tickets', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: /\/tickets\?/,
        method: 'GET',
        respond: (url) => ({
          body: url.includes('status=CLOSED')
            ? { results: [closedTicket], total: 1, page: 1, pageSize: 25 }
            : { results: [activeTicket], total: 1, page: 1, pageSize: 25 },
        }),
      },
    ]);
    renderWithProviders(<Tickets />, { preloadedState: authenticatedState });
    await screen.findByText('Bug report');

    await user.click(screen.getByRole('button', { name: 'Closed' }));
    await waitFor(() => expect(screen.getByText('Request a demo')).toBeInTheDocument());
    expect(screen.queryByText('Bug report')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no tickets', async () => {
    mockFetchRoutes([
      {
        url: /\/tickets\?/,
        method: 'GET',
        respond: { body: { results: [], total: 0, page: 1, pageSize: 25 } },
      },
    ]);
    renderWithProviders(<Tickets />, { preloadedState: authenticatedState });

    expect(await screen.findByText('No tickets here')).toBeInTheDocument();
  });
});

describe('Tickets tab counts', () => {
  it('shows per-status counts in the tab pills when the API provides them', async () => {
    mockFetchRoutes([
      {
        url: /\/tickets\?/,
        method: 'GET',
        respond: {
          body: {
            results: [activeTicket],
            total: 1,
            page: 1,
            pageSize: 25,
            counts: { ACTIVE: 3, UNANSWERED: 1, ANSWERED: 2, CLOSED: 5 },
          },
        },
      },
    ]);
    renderWithProviders(<Tickets />, { preloadedState: authenticatedState });
    await screen.findByText('Bug report');
    expect(screen.getByRole('button', { name: /^Active/ })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: /^Answered/ })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /^Closed/ })).toHaveTextContent('5');
  });
});
