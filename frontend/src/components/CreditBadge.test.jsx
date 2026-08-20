import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreditBadge } from './CreditBadge.jsx';
import { useRevealContactMutation } from '../api/contactsApi.js';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

// Mounts the badge alongside a stand-in reveal button, both sharing one
// store/cache — the same relationship they have in the real app (Reveal
// lives on People, the badge lives in AppLayout's header) — so a click
// here proves the two are actually wired together via the BillingSummary
// tag, not just independently correct in isolation.
function RevealAndBadge() {
  const [reveal] = useRevealContactMutation();
  return (
    <div>
      <button type="button" onClick={() => reveal({ contactId: 'c1', idempotencyKey: 'k1' })}>
        Reveal
      </button>
      <CreditBadge />
    </div>
  );
}

describe('CreditBadge', () => {
  it('shows the current balance', async () => {
    mockFetchRoutes([
      {
        url: '/billing/summary',
        respond: { body: { balance: 96, plan: 'FREE', monthlyCreditGrant: 100, creditsUsed: 4 } },
      },
    ]);
    renderWithProviders(<CreditBadge />, { preloadedState: authenticatedState });

    expect(await screen.findByText('96')).toBeInTheDocument();
  });

  it('updates after a reveal without a page reload', async () => {
    const user = userEvent.setup();
    let balance = 100;
    mockFetchRoutes([
      {
        url: '/billing/summary',
        respond: () => ({
          body: { balance, plan: 'FREE', monthlyCreditGrant: 100, creditsUsed: 100 - balance },
        }),
      },
      {
        url: '/contacts/c1/reveal',
        method: 'POST',
        respond: () => {
          balance -= 2;
          return { body: { email: 'jane@acme.com', emailVerified: true } };
        },
      },
    ]);
    renderWithProviders(<RevealAndBadge />, { preloadedState: authenticatedState });

    expect(await screen.findByText('100')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reveal' }));

    await waitFor(() => expect(screen.getByText('98')).toBeInTheDocument());
  });
});
