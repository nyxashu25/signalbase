import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Billing } from './Billing.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

const summaryRoute = (plan) => ({
  url: '/billing/summary',
  respond: {
    body: {
      balance: 96,
      plan,
      blocks: plan === 'FREE' ? 0 : 1,
      capacity: plan === 'FREE' ? { paid: 1, free: 0 } : { paid: 5, free: 1 },
      assigned: { paid: 1, free: 0, pending: 0 },
      memberCount: 1,
      suggestedBlocks: 1,
      monthlyCreditGrant: 500,
      creditsUsed: 4,
    },
  },
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
    // Seat coverage from the summary's capacity/assigned.
    expect(screen.getByText(/1\/5 paid/)).toBeInTheDocument();
    const currentPlanButtons = screen.getAllByRole('button', { name: 'Current plan' });
    expect(currentPlanButtons).toHaveLength(1);
    expect(currentPlanButtons[0]).toBeDisabled();
  });

  it('offers "Upgrade" to a plan above the current one', async () => {
    mockFetchRoutes([summaryRoute('BASIC'), emptyTransactionsRoute]);
    renderWithProviders(<Billing />, { preloadedState: authenticatedState });

    await screen.findByText('Current');
    // Professional and Organization both sit above Basic — each self-serve
    // purchasable under block billing.
    expect(screen.getAllByRole('button', { name: 'Upgrade' })).toHaveLength(2);
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

  it('shows a locked state instead of Downgrade within the 3-month commitment', async () => {
    mockFetchRoutes([
      {
        url: '/billing/summary',
        respond: {
          body: {
            balance: 96,
            plan: 'PROFESSIONAL',
            monthlyCreditGrant: 1200,
            creditsUsed: 4,
            planActivatedAt: new Date().toISOString(),
          },
        },
      },
      emptyTransactionsRoute,
    ]);
    renderWithProviders(<Billing />, { preloadedState: authenticatedState });

    await screen.findByText('Current');
    expect(screen.queryByRole('button', { name: 'Downgrade' })).not.toBeInTheDocument();
    const locked = screen.getByRole('button', { name: /^Locked until/ });
    expect(locked).toBeDisabled();
  });

  it('allows Downgrade once the 3-month commitment has elapsed', async () => {
    const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
    mockFetchRoutes([
      {
        url: '/billing/summary',
        respond: {
          body: {
            balance: 96,
            plan: 'PROFESSIONAL',
            monthlyCreditGrant: 1200,
            creditsUsed: 4,
            planActivatedAt: ninetyOneDaysAgo,
          },
        },
      },
      emptyTransactionsRoute,
    ]);
    renderWithProviders(<Billing />, { preloadedState: authenticatedState });

    await screen.findByText('Current');
    expect(screen.getByRole('button', { name: 'Downgrade' })).toBeEnabled();
  });

  it('shows discounted prices when Quarterly or Annually is selected', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([summaryRoute('FREE'), emptyTransactionsRoute]);
    renderWithProviders(<Billing />, { preloadedState: authenticatedState });
    await screen.findByText('Current');

    // BASIC is $29/block, default 1 block -> monthly shown first.
    expect(screen.getAllByText('$29').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Quarterly/ }));
    // 29 * 3 * 0.9 = 78.30 per block
    expect((await screen.findAllByText('$78.30')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Annually/ }));
    // 29 * 12 * 0.8 = 278.40 per block
    expect((await screen.findAllByText('$278.40')).length).toBeGreaterThan(0);
  });

  it('locks a quarterly plan for a full 3 months', async () => {
    const eightyNineDaysAgo = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toISOString();
    mockFetchRoutes([
      {
        url: '/billing/summary',
        respond: {
          body: {
            balance: 96,
            plan: 'PROFESSIONAL',
            monthlyCreditGrant: 1200,
            creditsUsed: 4,
            planActivatedAt: eightyNineDaysAgo,
            billingInterval: 'QUARTER',
          },
        },
      },
      emptyTransactionsRoute,
    ]);
    renderWithProviders(<Billing />, { preloadedState: authenticatedState });

    await screen.findByText('Current');
    expect(screen.queryByRole('button', { name: 'Downgrade' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Locked until/ })).toBeDisabled();
  });

  it('locks an annual plan for a full 12 months', async () => {
    const elevenMonthsAgo = new Date();
    elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
    mockFetchRoutes([
      {
        url: '/billing/summary',
        respond: {
          body: {
            balance: 96,
            plan: 'PROFESSIONAL',
            monthlyCreditGrant: 1200,
            creditsUsed: 4,
            planActivatedAt: elevenMonthsAgo.toISOString(),
            billingInterval: 'YEAR',
          },
        },
      },
      emptyTransactionsRoute,
    ]);
    renderWithProviders(<Billing />, { preloadedState: authenticatedState });

    await screen.findByText('Current');
    expect(screen.getByRole('button', { name: /^Locked until/ })).toBeDisabled();
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
