import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactRow } from './ContactRow.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

const creditCostsRoute = {
  url: '/billing/credit-costs',
  respond: {
    body: { costs: { REVEAL: 91, COMPANY_VIEW: 20, CSV_EXPORT: 50, SEQUENCE_ENROLLMENT: 250 } },
  },
};

const listsRoute = { url: '/lists', respond: { body: { lists: [] } } };

function renderRow(contact, onReveal = vi.fn()) {
  return renderWithProviders(
    <table>
      <tbody>
        <ContactRow contact={contact} onReveal={onReveal} />
      </tbody>
    </table>,
    { preloadedState: authenticatedState },
  );
}

beforeEach(() => {
  mockFetchRoutes([creditCostsRoute, listsRoute]);
});

describe('ContactRow', () => {
  it('shows a masked email and a Reveal button when not yet revealed', async () => {
    renderRow({
      id: 'c1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      revealed: false,
      email: 'a****@acme.com',
    });
    expect(screen.getByText('a****@acme.com')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Reveal/ })).toBeInTheDocument();
  });

  it('shows the full email and no Reveal button once revealed', () => {
    renderRow({
      id: 'c1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      revealed: true,
      email: 'ada@acme.com',
    });
    expect(screen.getByText('ada@acme.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reveal/ })).not.toBeInTheDocument();
  });

  it('shows a placeholder when no email is known at all', () => {
    renderRow({ id: 'c1', firstName: 'Ada', lastName: 'Lovelace', revealed: false, email: null });
    expect(screen.getByText('Not found yet')).toBeInTheDocument();
  });

  it('calls onReveal with the contact id when clicked', async () => {
    const onReveal = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    renderRow(
      {
        id: 'c1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        revealed: false,
        email: 'a****@acme.com',
      },
      onReveal,
    );

    await user.click(await screen.findByRole('button', { name: /Reveal/ }));
    expect(onReveal).toHaveBeenCalledWith('c1');
  });

  it('shows an error message when the reveal fails', async () => {
    const onReveal = vi.fn().mockRejectedValue(new Error('Not enough credits'));
    const user = userEvent.setup();
    renderRow(
      {
        id: 'c1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        revealed: false,
        email: 'a****@acme.com',
      },
      onReveal,
    );

    await user.click(await screen.findByRole('button', { name: /Reveal/ }));
    await waitFor(() => expect(screen.getByText('Not enough credits')).toBeInTheDocument());
  });
});
