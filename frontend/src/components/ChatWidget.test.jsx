import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatWidget } from './ChatWidget.jsx';
import { renderWithProviders, mockFetchRoutes } from '../test/testUtils.jsx';

describe('ChatWidget', () => {
  it('is closed by default and opens on toggle', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    expect(screen.queryByText('Ask us anything')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open chat' }));
    expect(screen.getByText('Ask us anything')).toBeInTheDocument();
  });

  it('shows a canned answer when a pre-made question is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open chat' }));
    await user.click(screen.getByRole('button', { name: /what does a reveal cost/i }));

    expect(
      screen.getByText(/Revealing a contact's verified email costs 2 credits/),
    ).toBeInTheDocument();
  });

  it('lets the user go back from an answer to the question menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open chat' }));
    await user.click(screen.getByRole('button', { name: /What does DataPit do/ }));
    await user.click(screen.getByRole('button', { name: '← Back' }));

    expect(screen.getByText(/Pick a question below/)).toBeInTheDocument();
  });

  it('submits a support ticket and shows the confirmation', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([{ url: '/contact', method: 'POST', respond: { status: 204, body: {} } }]);
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open chat' }));
    await user.click(screen.getByRole('button', { name: 'Contact support' }));
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@acme.test');
    await user.type(screen.getByLabelText('Message'), 'Reveal is not working.');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByText('Message sent')).toBeInTheDocument());
    expect(screen.getByText("We'll reply to ada@acme.test shortly.")).toBeInTheDocument();
  });

  it('shows the server error inline when the email is not a registered account', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/contact',
        method: 'POST',
        respond: {
          status: 422,
          body: { error: { message: 'That email isn’t associated with a DataPit account.' } },
        },
      },
    ]);
    renderWithProviders(<ChatWidget />);

    await user.click(screen.getByRole('button', { name: 'Open chat' }));
    await user.click(screen.getByRole('button', { name: 'Talk to Enterprise sales' }));
    await user.type(screen.getByLabelText('Name'), 'Nobody');
    await user.type(screen.getByLabelText('Email'), 'nobody@example.com');
    await user.type(screen.getByLabelText('Message'), 'Tell me about Enterprise.');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      await screen.findByText('That email isn’t associated with a DataPit account.'),
    ).toBeInTheDocument();
  });
});
