import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { NewTicket } from './NewTicket.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

const subjectsPayload = {
  subjects: {
    SUPPORT: ['Bug report', 'Account access issue', 'Billing or payment issue', 'Data quality issue', 'Other'],
    SALES: ['Upgrade my plan', 'Request a demo', 'Custom pricing', 'Add seats / team', 'Other'],
  },
  maxWords: 200,
};

function renderNewTicket() {
  return renderWithProviders(
    <Routes>
      <Route path="/app/tickets/new" element={<NewTicket />} />
      <Route path="/app/tickets/:id" element={<div>Ticket detail page</div>} />
    </Routes>,
    { preloadedState: authenticatedState, route: '/app/tickets/new' },
  );
}

describe('NewTicket', () => {
  it('defaults to Support subjects and switches to Sales subjects when the type toggle changes', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([{ url: '/tickets/subjects', method: 'GET', respond: { body: subjectsPayload } }]);
    renderNewTicket();

    expect(await screen.findByRole('option', { name: 'Bug report' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Request a demo' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sales' }));
    expect(screen.getByRole('option', { name: 'Request a demo' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Bug report' })).not.toBeInTheDocument();
  });

  it('blocks submission once the body exceeds 200 words', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([{ url: '/tickets/subjects', method: 'GET', respond: { body: subjectsPayload } }]);
    renderNewTicket();

    await screen.findByRole('option', { name: 'Bug report' });
    await user.selectOptions(screen.getByRole('combobox'), 'Bug report');
    const textarea = screen.getByPlaceholderText(/A few sentences/);
    fireEvent.change(textarea, { target: { value: Array(201).fill('word').join(' ') } });

    expect(screen.getByText('201/200 words')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Raise ticket' })).toBeDisabled();
  });

  it('raises the ticket and navigates to its detail page', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      { url: '/tickets/subjects', method: 'GET', respond: { body: subjectsPayload } },
      {
        url: '/tickets',
        method: 'POST',
        respond: { status: 201, body: { id: 'new-ticket-1', status: 'UNANSWERED' } },
      },
    ]);
    renderNewTicket();

    await screen.findByRole('option', { name: 'Bug report' });
    await user.selectOptions(screen.getByRole('combobox'), 'Bug report');
    fireEvent.change(screen.getByPlaceholderText(/A few sentences/), {
      target: { value: 'Search is broken for me.' },
    });
    await user.click(screen.getByRole('button', { name: 'Raise ticket' }));

    await waitFor(() => expect(screen.getByText('Ticket detail page')).toBeInTheDocument());
  });
});
