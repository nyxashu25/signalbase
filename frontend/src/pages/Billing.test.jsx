import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Billing } from './Billing.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

const summaryRoute = (plan) => ({
  url: '/billing/summary',
  respond: { body: { balance: 96, plan, monthlyCreditGrant: 500, creditsUsed: 4 } },
});
const emptyTransactionsRoute = {
  url: '/billing/transactions',
  respond: { body: { results: [], total: 0, page: 1, pageSize: 25 } },
};

describe('Billing', () => {
  it('shows the current plan and marks it in the upgrade grid', async () => {
    mockFetchRoutes([summaryRoute('BASIC'), emptyTransactionsRoute]);
    renderWithProviders(<Billing />, { preloadedState: authenticatedState });

    expect(await screen.findByText('Current')).toBeInTheDocument(); // badge on the matching grid card
    expect(screen.getByText('500')).toBeInTheDocument(); // monthly grant shown in the summary (exact match, unlike the "500 credits/..." grid copy)
    const currentPlanButtons = screen.getAllByRole('button', { name: 'Current plan' });
    expect(currentPlanButtons).toHaveLength(1);
    expect(currentPlanButtons[0]).toBeDisabled();
  });

  it('offers "Upgrade" to a plan above the current one', async () => {
    mockFetchRoutes([summaryRoute('BASIC'), emptyTransactionsRoute]);
    renderWithProviders(<Billing />, { preloadedState: authenticatedState });

    await screen.findByText('Current');
    // Professional sits above Basic; Organization always reads "Talk to sales" regardless of position.
    expect(screen.getByRole('button', { name: 'Upgrade' })).toBeInTheDocument();
  });

  it('offers "Downgrade" to a paid plan below the current one', async () => {
    mockFetchRoutes([summaryRoute('PROFESSIONAL'), emptyTransactionsRoute]);
    renderWithProviders(<Billing />, { preloadedState: authenticatedState });

    await screen.findByText('Current');
    // Basic sits below Professional; Free always reads "No purchase needed" regardless of position.
    expect(screen.getByRole('button', { name: 'Downgrade' })).toBeInTheDocument();
  });

  it('starts checkout and redirects on Upgrade', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      summaryRoute('FREE'),
      emptyTransactionsRoute,
      {
        url: '/billing/subscribe',
        method: 'POST',
        respond: {
          body: { provider: 'stripe', sessionId: 'cs_1', url: 'https://checkout.stripe.com/cs_1' },
        },
      },
    ]);
    const original = window.location;
    delete window.location;
    window.location = { ...original, href: '' };

    renderWithProviders(<Billing />, { preloadedState: authenticatedState });
    await screen.findByText('Current');

    await user.click(screen.getAllByRole('button', { name: 'Upgrade' })[0]);
    await waitFor(() => expect(window.location.href).toBe('https://checkout.stripe.com/cs_1'));

    window.location = original;
  });

  it('shows an error message when starting checkout fails', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      summaryRoute('FREE'),
      emptyTransactionsRoute,
      {
        url: '/billing/subscribe',
        method: 'POST',
        respond: { status: 400, body: { error: { message: 'Unknown plan' } } },
      },
    ]);
    renderWithProviders(<Billing />, { preloadedState: authenticatedState });
    await screen.findByText('Current');

    await user.click(screen.getAllByRole('button', { name: 'Upgrade' })[0]);
    expect(await screen.findByText('Unknown plan')).toBeInTheDocument();
  });
});
