import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { TicketDetail } from './TicketDetail.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

const openTicket = {
  id: 't1',
  subject: 'Bug report',
  type: 'SUPPORT',
  status: 'UNANSWERED',
  messages: [
    { id: 'm1', authorType: 'USER', authorName: 'Demo User', body: 'Search is broken.', createdAt: '2026-08-20T09:00:00.000Z' },
  ],
};

const closedTicket = { ...openTicket, id: 't2', status: 'CLOSED' };

function renderDetail(ticketId) {
  return renderWithProviders(
    <Routes>
      <Route path="/app/tickets/:id" element={<TicketDetail />} />
    </Routes>,
    { preloadedState: authenticatedState, route: `/app/tickets/${ticketId}` },
  );
}

describe('TicketDetail', () => {
  it('renders the message thread and lets the user send a reply', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      { url: '/tickets/subjects', method: 'GET', respond: { body: { subjects: {}, maxWords: 200 } } },
      { url: '/tickets/t1', method: 'GET', respond: { body: openTicket } },
      {
        url: '/tickets/t1/messages',
        method: 'POST',
        respond: { body: { ...openTicket, status: 'UNANSWERED' } },
      },
    ]);
    renderDetail('t1');

    expect(await screen.findByText('Search is broken.')).toBeInTheDocument();
    expect(screen.getByText('Awaiting reply')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('Write a reply…');
    await user.type(textarea, 'Any update on this?');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    await waitFor(() => expect(textarea).toHaveValue(''));
  });

  it('blocks a reply over 200 words', async () => {
    mockFetchRoutes([
      { url: '/tickets/subjects', method: 'GET', respond: { body: { subjects: {}, maxWords: 200 } } },
      { url: '/tickets/t1', method: 'GET', respond: { body: openTicket } },
    ]);
    renderDetail('t1');

    const textarea = await screen.findByPlaceholderText('Write a reply…');
    fireEvent.change(textarea, { target: { value: Array(201).fill('word').join(' ') } });

    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled();
  });

  it('shows a closed message instead of a reply box for a closed ticket', async () => {
    mockFetchRoutes([
      { url: '/tickets/subjects', method: 'GET', respond: { body: { subjects: {}, maxWords: 200 } } },
      { url: '/tickets/t2', method: 'GET', respond: { body: closedTicket } },
    ]);
    renderDetail('t2');

    expect(await screen.findByText(/This ticket is closed/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Write a reply…')).not.toBeInTheDocument();
  });
});
