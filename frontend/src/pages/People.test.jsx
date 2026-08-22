import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { People } from './People.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

const contacts = [
  {
    id: 'c1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    title: 'VP of Engineering',
    seniority: 'VP',
    department: 'Engineering',
    company: { id: 'co1', name: 'Analytical Engines' },
    email: 'a****@analytical.test',
    revealed: false,
  },
  {
    id: 'c2',
    firstName: 'Grace',
    lastName: 'Hopper',
    title: 'Director of Systems',
    seniority: 'Director',
    department: 'Engineering',
    company: { id: 'co2', name: 'Cobol Corp' },
    email: 'grace@cobol.test',
    emailVerified: true,
    revealed: true,
  },
];

const facets = {
  seniority: [
    { value: 'VP', count: 1 },
    { value: 'Director', count: 1 },
  ],
  department: [{ value: 'Engineering', count: 2 }],
  industry: [],
  location: [],
  emailStatus: [
    { value: 'verified', count: 1 },
    { value: 'unverified', count: 1 },
    { value: 'not_found', count: 0 },
  ],
};

function setup() {
  const calls = [];
  mockFetchRoutes([
    {
      url: /\/search\/people\?/,
      method: 'GET',
      respond: (url) => {
        calls.push(url);
        const onlyVP = url.includes('seniority=VP');
        const results = onlyVP ? contacts.filter((c) => c.seniority === 'VP') : contacts;
        return { body: { results, total: results.length, page: 1, pageSize: 25, facets } };
      },
    },
    {
      url: '/billing/credit-costs',
      respond: { body: { costs: { REVEAL: 2, COMPANY_VIEW: 20, CSV_EXPORT: 50 } } },
    },
    { url: /\/lists$/, respond: { body: { lists: [] } } },
    { url: /\/search\/saved/, respond: { body: { savedSearches: [] } } },
  ]);
  renderWithProviders(<People />, { preloadedState: authenticatedState });
  return { calls };
}

describe('People', () => {
  it('renders results with the total, reveal buttons, and the filter rail', async () => {
    setup();
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('2 people')).toBeInTheDocument();
    // Revealed contact shows its address; unrevealed one shows the reveal button.
    expect(screen.getByText('grace@cobol.test')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Access email/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Expand Seniority filter' })).toBeInTheDocument();
  });

  it('applies a facet from the rail, shows it as a chip, and re-queries', async () => {
    const user = userEvent.setup();
    const { calls } = setup();
    await screen.findByText('Ada Lovelace');

    await user.click(screen.getByRole('button', { name: 'Expand Seniority filter' }));
    await user.click(screen.getByText('VP'));

    await waitFor(() => expect(calls.some((u) => u.includes('seniority=VP'))).toBe(true));
    expect(await screen.findByRole('button', { name: 'Remove VP' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument());
    expect(screen.getByText('Clear all 1')).toBeInTheDocument();
  });

  it('select-all raises the bulk action bar with the reveal cost', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText('Ada Lovelace');

    await user.click(screen.getByRole('checkbox', { name: 'Select all on this page' }));

    const bar = await screen.findByRole('toolbar', { name: 'Bulk actions' });
    expect(bar).toHaveTextContent('2 selected');
    // Only Ada is unrevealed → 1 reveal × 2 credits.
    expect(bar).toHaveTextContent('Reveal 1 · 2 cr');

    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    await waitFor(() => expect(screen.queryByRole('toolbar', { name: 'Bulk actions' })).not.toBeInTheDocument());
  });

  it('changes the sort and re-queries with it', async () => {
    const user = userEvent.setup();
    const { calls } = setup();
    await screen.findByText('Ada Lovelace');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'name_desc');
    await waitFor(() => expect(calls.some((u) => u.includes('sort=name_desc'))).toBe(true));
  });
});
