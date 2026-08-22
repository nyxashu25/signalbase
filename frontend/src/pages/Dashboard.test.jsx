import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from './Dashboard.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

function task(key, label, overrides = {}) {
  return {
    key,
    label,
    description: `${label} description`,
    cta: { label: 'Go there', to: '/app/people' },
    reward: 5,
    available: true,
    completed: false,
    completedAt: null,
    rewardedCredits: 0,
    requiresPlan: null,
    ...overrides,
  };
}

function progressFixture({ done = false } = {}) {
  const groups = [
    {
      key: 'find',
      label: 'Find your first contacts',
      description: 'Search, reveal, keep.',
      reward: 10,
      completed: done,
      completedAt: null,
      requiresPlan: null,
      tasks: [
        task('SEARCH_PEOPLE', 'Run a people search', { completed: true, rewardedCredits: 5 }),
        task('REVEAL_EMAIL', 'Reveal an email address', { completed: done, rewardedCredits: done ? 5 : 0 }),
        task('ADD_TO_LIST', 'Add a contact to a list', { completed: done, rewardedCredits: done ? 5 : 0 }),
        task('SAVE_SEARCH', 'Save a search', { completed: done, rewardedCredits: done ? 5 : 0 }),
      ],
    },
    {
      key: 'reach',
      label: 'Reach out',
      description: 'Cadences.',
      reward: 10,
      completed: done,
      completedAt: null,
      requiresPlan: done ? null : 'BASIC',
      tasks: [
        task('CREATE_SEQUENCE', 'Create a sequence', { completed: done, requiresPlan: done ? null : 'BASIC' }),
        task('ACTIVATE_SEQUENCE', 'Activate it', { completed: done, requiresPlan: done ? null : 'BASIC' }),
        task('ENROLL_CONTACT', 'Enroll a contact', { completed: done, requiresPlan: done ? null : 'BASIC' }),
      ],
    },
    {
      key: 'explore',
      label: 'Know your way around',
      description: 'Everything else.',
      reward: 10,
      completed: done,
      completedAt: null,
      requiresPlan: null,
      tasks: [
        task('VERIFY_EMAIL', 'Verify your email', { completed: true, reward: 0, cta: null }),
        task('TAKE_TOUR', 'Take the product tour', { completed: done }),
        task('VIEW_COMPANY', 'Open a company profile', { completed: done }),
        task('INVITE_TEAMMATE', 'Invite a teammate', { available: false, reward: 0, cta: null }),
      ],
    },
  ];
  const all = groups.flatMap((g) => g.tasks).filter((t) => t.available);
  const completedCount = all.filter((t) => t.completed).length;
  return {
    groups,
    completedCount,
    totalCount: all.length,
    percent: Math.round((completedCount / all.length) * 100),
    creditsEarned: done ? 75 : 5,
    creditsAvailable: 75,
    nextTask: done ? null : 'REVEAL_EMAIL',
    justRewarded: [],
  };
}

function setup({ done = false, route = '/app' } = {}) {
  mockFetchRoutes([
    { url: '/dashboard/onboarding', respond: { body: progressFixture({ done }) } },
    {
      url: '/dashboard/stats',
      respond: {
        body: { revealsThisMonth: 3, creditsUsedThisMonth: 26, activeSequences: 1, lists: 2, savedContacts: 4 },
      },
    },
    {
      url: '/billing/summary',
      respond: { body: { balance: 93, plan: 'FREE', monthlyCreditGrant: 100, creditsUsed: 7 } },
    },
    { url: /\/billing\/transactions/, respond: { body: { results: [], total: 0, page: 1, pageSize: 5 } } },
    { url: '/billing/credit-costs', respond: { body: { costs: { REVEAL: 2 } } } },
  ]);
  return renderWithProviders(<Dashboard />, { preloadedState: authenticatedState, route });
}

describe('Dashboard (Home)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens on the getting-started checklist while tasks remain, with the next task as the primary CTA', async () => {
    setup();
    expect(await screen.findByText('2 of 10 done')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Getting started progress' })).toHaveAttribute(
      'aria-valuenow',
      '20',
    );
    // The tab pill carries the same count.
    expect(screen.getByRole('button', { name: /Getting started/ })).toHaveTextContent('2/10');

    // Next task gets the one primary CTA (hero button in the progress card).
    expect(screen.getByText('Next: Reveal an email address')).toBeInTheDocument();
    const nextRow = document.querySelector('[data-task="REVEAL_EMAIL"]');
    expect(nextRow).toHaveAttribute('data-state', 'next');
    expect(within(nextRow).getByRole('link', { name: 'Go there: Reveal an email address' })).toHaveTextContent(
      'Go there',
    );
    // Other open tasks only get a quiet "Go".
    const otherRow = document.querySelector('[data-task="ADD_TO_LIST"]');
    expect(otherRow).toHaveAttribute('data-state', 'open');
    expect(within(otherRow).getByRole('link')).toHaveTextContent('Go');
  });

  it('collapses completed tasks behind a toggle and shows plan-locked groups', async () => {
    setup();
    await screen.findByText('2 of 10 done');

    // SEARCH_PEOPLE is done — hidden until "Show 1 completed".
    expect(document.querySelector('[data-task="SEARCH_PEOPLE"]')).toBeNull();
    // Both "find" (search done) and "explore" (verify done) have one collapsed row; first is "find".
    await userEvent.click(screen.getAllByRole('button', { name: 'Show 1 completed' })[0]);
    expect(document.querySelector('[data-task="SEARCH_PEOPLE"]')).toHaveAttribute('data-state', 'done');

    // The sequences group is locked on Free — no CTAs, a plan pill instead.
    expect(screen.getByText('Basic plan and up')).toBeInTheDocument();
    const locked = document.querySelector('[data-task="CREATE_SEQUENCE"]');
    expect(locked).toHaveAttribute('data-state', 'locked');
    expect(within(locked).queryByRole('link')).toBeNull();

    // Not-built task is visible but marked coming soon.
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });

  it('switches to the Overview stats via the tab and shows this-month tiles', async () => {
    setup();
    await screen.findByText('2 of 10 done');
    await userEvent.click(screen.getByRole('button', { name: 'Overview' }));

    expect(await screen.findByText('Reveals this month')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Credits used this month')).toBeInTheDocument();
    expect(screen.getByText('26')).toBeInTheDocument();
    expect(screen.getByText('93')).toBeInTheDocument(); // balance
    expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument();
  });

  it('defaults to Overview once the checklist is complete', async () => {
    setup({ done: true });
    expect(await screen.findByText('Reveals this month')).toBeInTheDocument();
    // Still reachable from the tab.
    await userEvent.click(screen.getByRole('button', { name: /Getting started/ }));
    expect(await screen.findByText('You’re all set')).toBeInTheDocument();
  });

  it('honours ?view= deep links and shows the email verifier under Tools', async () => {
    setup({ route: '/app?view=tools' });
    expect(await screen.findByText('Email verifier')).toBeInTheDocument();
    expect(screen.queryByText('Resources')).toBeNull();
  });

  it('shows the resources strip linking to the guide, credits help and tickets', async () => {
    setup();
    await screen.findByText('2 of 10 done');
    expect(screen.getByRole('link', { name: /Read the guide/ })).toHaveAttribute('href', '/app/help');
    expect(screen.getByRole('link', { name: /How credits work/ })).toHaveAttribute('href', '/app/help#credits');
    expect(screen.getByRole('link', { name: /Talk to us/ })).toHaveAttribute('href', '/app/tickets/new');
  });
});
