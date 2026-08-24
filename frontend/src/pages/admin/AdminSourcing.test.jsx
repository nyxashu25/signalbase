import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminPendingPeoples } from './AdminPendingPeoples.jsx';
import { AdminChildsFound } from './AdminChildsFound.jsx';
import { renderWithProviders, authenticatedAdminState, mockFetchRoutes } from '../../test/testUtils.jsx';

const missingPerson = {
  id: 'mp1',
  linkedinSlug: 'casey-nguyen',
  linkedinUrl: 'https://www.linkedin.com/in/casey-nguyen',
  name: 'Casey Nguyen',
  jobTitle: 'Head of Growth',
  location: 'Denver, CO',
  companyName: 'Skyline Labs',
  domText: 'Casey Nguyen · Head of Growth at Skyline Labs',
  status: 'PENDING',
  reportCount: 3,
  lastReportedAt: '2026-08-24T10:00:00.000Z',
};

const lostChild = {
  id: 'lc1',
  linkedinSlug: 'jordan-bennett',
  oldTitle: 'VP Engineering',
  newTitle: 'Chief Technology Officer',
  status: 'PENDING',
  reportCount: 2,
  lastReportedAt: '2026-08-24T11:00:00.000Z',
  contact: {
    id: 'c1',
    firstName: 'Jordan',
    lastName: 'Bennett',
    title: 'VP Engineering',
    linkedinUrl: 'https://www.linkedin.com/in/jordan-bennett',
    company: { name: 'Nova Systems', domain: 'novasystems.com' },
  },
};

describe('AdminPendingPeoples', () => {
  it('lists pending profiles with demand counts and page-text expander', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: /\/sourcing\/missing-persons\?/,
        method: 'GET',
        respond: { body: { missingPersons: [missingPerson], total: 1, page: 1, pageSize: 25 } },
      },
    ]);
    renderWithProviders(<AdminPendingPeoples />, { preloadedState: authenticatedAdminState });

    expect(await screen.findByText('Casey Nguyen')).toBeInTheDocument();
    expect(screen.getByText('Skyline Labs')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'casey-nguyen' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/casey-nguyen',
    );

    await user.click(screen.getByRole('button', { name: 'Page text' }));
    expect(screen.getByText(/Head of Growth at Skyline Labs/)).toBeInTheDocument();
  });

  it('marks a profile as added', async () => {
    const user = userEvent.setup();
    let resolved = false;
    mockFetchRoutes([
      {
        url: /\/sourcing\/missing-persons\/mp1\/resolve/,
        method: 'POST',
        respond: (url, init) => {
          resolved = true;
          expect(JSON.parse(init.body)).toEqual({ resolution: 'ADDED' });
          return { body: { missingPerson: { ...missingPerson, status: 'ADDED' } } };
        },
      },
      {
        url: /\/sourcing\/missing-persons\?/,
        method: 'GET',
        respond: () => ({
          body: resolved
            ? { missingPersons: [], total: 0, page: 1, pageSize: 25 }
            : { missingPersons: [missingPerson], total: 1, page: 1, pageSize: 25 },
        }),
      },
    ]);
    renderWithProviders(<AdminPendingPeoples />, { preloadedState: authenticatedAdminState });
    await screen.findByText('Casey Nguyen');

    await user.click(screen.getByRole('button', { name: 'Mark added' }));
    await waitFor(() =>
      expect(screen.getByText('Nothing here — the queue is clear')).toBeInTheDocument(),
    );
  });
});

describe('AdminChildsFound', () => {
  it('shows old vs observed title and applies the update', async () => {
    const user = userEvent.setup();
    let resolved = false;
    mockFetchRoutes([
      {
        url: /\/sourcing\/lost-children\/lc1\/resolve/,
        method: 'POST',
        respond: (url, init) => {
          resolved = true;
          expect(JSON.parse(init.body)).toEqual({ resolution: 'APPLIED' });
          return { body: { lostChild: { ...lostChild, status: 'APPLIED' } } };
        },
      },
      {
        url: /\/sourcing\/lost-children\?/,
        method: 'GET',
        respond: () => ({
          body: resolved
            ? { lostChildren: [], total: 0, page: 1, pageSize: 25 }
            : { lostChildren: [lostChild], total: 1, page: 1, pageSize: 25 },
        }),
      },
    ]);
    renderWithProviders(<AdminChildsFound />, { preloadedState: authenticatedAdminState });

    expect(await screen.findByText('Jordan Bennett')).toBeInTheDocument();
    expect(screen.getByText('VP Engineering')).toBeInTheDocument();
    expect(screen.getByText('Chief Technology Officer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apply new title' }));
    await waitFor(() =>
      expect(screen.getByText('Nothing here — every record matches LinkedIn')).toBeInTheDocument(),
    );
  });

  it('dismissing keeps the contact untouched and clears the row', async () => {
    const user = userEvent.setup();
    let resolved = false;
    mockFetchRoutes([
      {
        url: /\/sourcing\/lost-children\/lc1\/resolve/,
        method: 'POST',
        respond: (url, init) => {
          resolved = true;
          expect(JSON.parse(init.body)).toEqual({ resolution: 'DISMISSED' });
          return { body: { lostChild: { ...lostChild, status: 'DISMISSED' } } };
        },
      },
      {
        url: /\/sourcing\/lost-children\?/,
        method: 'GET',
        respond: () => ({
          body: resolved
            ? { lostChildren: [], total: 0, page: 1, pageSize: 25 }
            : { lostChildren: [lostChild], total: 1, page: 1, pageSize: 25 },
        }),
      },
    ]);
    renderWithProviders(<AdminChildsFound />, { preloadedState: authenticatedAdminState });
    await screen.findByText('Jordan Bennett');

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() =>
      expect(screen.getByText('Nothing here — every record matches LinkedIn')).toBeInTheDocument(),
    );
  });
});
