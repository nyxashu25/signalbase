import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sequences } from './Sequences.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

function setup(route = '/app/sequences') {
  mockFetchRoutes([
    { url: '/billing/summary', respond: { body: { plan: 'BASIC', balance: 100, monthlyCreditGrant: 500, creditsUsed: 0 } } },
    { url: '/sequences/analytics', respond: { body: { analytics: {
      totals: { SENT: 40, OPENED: 20, CLICKED: 5, REPLIED: 4, BOUNCED: 1, UNSUBSCRIBED: 0 },
      rates: { openRate: 0.5, clickRate: 0.125, replyRate: 0.1, bounceRate: 0.025 },
      enrollments: { total: 12, active: 7 },
      sequences: [
        { id: 's1', name: 'Q3 push', status: 'ACTIVE', enrolled: 12, SENT: 40, OPENED: 20, CLICKED: 5, REPLIED: 4, BOUNCED: 1, UNSUBSCRIBED: 0 },
      ],
    } } } },
    { url: /\/sequences$/, respond: { body: { sequences: [
      { id: 's1', name: 'Q3 push', status: 'ACTIVE', _count: { steps: 3, enrollments: 12 } },
    ] } } },
  ]);
  return renderWithProviders(<Sequences />, { preloadedState: authenticatedState, route });
}

describe('Sequences', () => {
  it('lists sequences with the All tab counted', async () => {
    setup();
    expect(await screen.findByText('Q3 push')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All sequences/ })).toHaveTextContent('1');
  });

  it('Analytics tab shows the KPI grid and per-sequence table', async () => {
    setup();
    await screen.findByText('Q3 push');
    await userEvent.click(screen.getByRole('button', { name: 'Analytics' }));
    expect((await screen.findAllByText('40')).length).toBeGreaterThan(0);
    expect(screen.getByText('50% of sent')).toBeInTheDocument();
    expect(screen.getByText('12 contacts enrolled across all sequences · 7 active right now.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Per sequence' })).toBeInTheDocument();
  });

  it('honours ?view=analytics deep links', async () => {
    setup('/app/sequences?view=analytics');
    expect(await screen.findByText('50% of sent')).toBeInTheDocument();
  });
});
