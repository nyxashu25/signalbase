import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { AdminTicketDetail } from './AdminTicketDetail.jsx';
import { renderWithProviders, authenticatedAdminState, mockFetchRoutes } from '../../test/testUtils.jsx';

const ticket = {
  id: 't1',
  subject: 'Bug report',
  type: 'SUPPORT',
  status: 'UNANSWERED',
  workspace: { id: 'w1', name: 'Acme Workspace' },
  createdBy: { id: 'u1', email: 'owner@acme.test' },
  messages: [
    { id: 'm1', authorType: 'USER', authorName: 'Owner', body: 'Search is broken.', createdAt: '2026-08-20T09:00:00.000Z' },
  ],
};

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/control/tickets/:ticketId" element={<AdminTicketDetail />} />
    </Routes>,
    { preloadedState: authenticatedAdminState, route: '/control/tickets/t1' },
  );
}

describe('AdminTicketDetail', () => {
  it('sends a reply and marks the ticket answered', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      { url: '/tickets/t1', method: 'GET', respond: { body: ticket } },
      {
        url: '/tickets/t1/messages',
        method: 'POST',
        respond: { body: { ...ticket, status: 'ANSWERED' } },
      },
    ]);
    renderDetail();

    expect(await screen.findByText('Search is broken.')).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText('Write a reply…');
    await user.type(textarea, 'Looking into it.');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    await waitFor(() => expect(textarea).toHaveValue(''));
  });

  it('closes the ticket', async () => {
    const user = userEvent.setup();
    let closed = false;
    mockFetchRoutes([
      {
        url: '/tickets/t1',
        method: 'GET',
        respond: () => ({ body: closed ? { ...ticket, status: 'CLOSED' } : ticket }),
      },
      {
        url: '/tickets/t1/close',
        method: 'POST',
        respond: () => {
          closed = true;
          return { body: { ...ticket, status: 'CLOSED', closedAt: '2026-08-20T10:00:00.000Z' } };
        },
      },
    ]);
    renderDetail();

    await screen.findByText('Search is broken.');
    await user.click(screen.getByRole('button', { name: 'Close ticket' }));

    await waitFor(() => expect(screen.getByText('This ticket is closed.')).toBeInTheDocument());
  });
});
