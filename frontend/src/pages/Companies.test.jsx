import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Companies } from './Companies.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

const companies = [
  {
    id: 'co1',
    name: 'Nova Systems',
    domain: 'novasystems.com',
    industry: 'SaaS',
    headcountMin: 51,
    headcountMax: 200,
    location: 'Austin, TX',
    techStack: ['React', 'AWS'],
    linkedinUrl: 'https://www.linkedin.com/company/nova-systems',
  },
  {
    id: 'co2',
    name: 'Pulse Health',
    domain: 'pulsehealth.com',
    industry: 'Healthcare',
    headcountMin: 1001,
    headcountMax: 5000,
    location: 'Boston, MA',
    techStack: ['Postgres'],
    linkedinUrl: null,
  },
];

const facets = {
  industry: [
    { value: 'SaaS', count: 1 },
    { value: 'Healthcare', count: 1 },
  ],
  location: [
    { value: 'Austin, TX', count: 1 },
    { value: 'Boston, MA', count: 1 },
  ],
  techStack: [{ value: 'React', count: 1 }],
  headcount: [
    { value: '51-200', count: 1 },
    { value: '1001-5000', count: 1 },
  ],
};

function setup() {
  const calls = [];
  mockFetchRoutes([
    {
      url: /\/search\/companies\?/,
      method: 'GET',
      respond: (url) => {
        calls.push(url);
        const onlyMid = url.includes('headcount=51-200');
        const results = onlyMid ? companies.filter((c) => c.headcountMin === 51) : companies;
        return { body: { results, total: results.length, page: 1, pageSize: 25, facets } };
      },
    },
    { url: '/billing/credit-costs', respond: { body: { costs: { REVEAL: 2, CSV_EXPORT: 20 } } } },
    { url: /\/lists$/, respond: { body: { lists: [] } } },
    { url: /\/search\/saved/, respond: { body: { savedSearches: [] } } },
  ]);
  renderWithProviders(<Companies />, { preloadedState: authenticatedState });
  return { calls };
}

describe('Companies', () => {
  it('renders rows with detail link, domain, industry pill, employee bucket, and outbound links', async () => {
    setup();
    expect(await screen.findByText('Nova Systems')).toBeInTheDocument();
    expect(screen.getByText('2 companies')).toBeInTheDocument();

    // Name cell links into the paid company profile.
    expect(screen.getByRole('link', { name: 'Nova Systems novasystems.com' })).toHaveAttribute(
      'href',
      '/app/companies/co1',
    );
    expect(screen.getByText('novasystems.com')).toBeInTheDocument();
    expect(screen.getByText('SaaS')).toBeInTheDocument();
    expect(screen.getByText('51–200')).toBeInTheDocument();

    // Website for both; LinkedIn only where a URL exists.
    expect(screen.getByRole('link', { name: 'Open Nova Systems website' })).toHaveAttribute(
      'href',
      'https://novasystems.com',
    );
    expect(screen.getByRole('link', { name: 'Open Nova Systems on LinkedIn' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Open Pulse Health on LinkedIn' }),
    ).not.toBeInTheDocument();
  });

  it('applies a headcount bucket from the rail, re-queries, and shows the chip', async () => {
    const user = userEvent.setup();
    const { calls } = setup();
    await screen.findByText('Nova Systems');

    await user.click(screen.getByRole('button', { name: 'Expand # Employees filter' }));
    await user.click(screen.getByRole('checkbox', { name: /51–200/ }));

    await waitFor(() => expect(calls.some((u) => u.includes('headcount=51-200'))).toBe(true));
    expect(await screen.findByRole('button', { name: 'Remove 51–200' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Pulse Health')).not.toBeInTheDocument());
    expect(screen.getByText('Clear all 1')).toBeInTheDocument();
  });

  it('select-all raises the bulk bar with an add-to-list action (no reveal for companies)', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText('Nova Systems');

    await user.click(screen.getByRole('checkbox', { name: 'Select all on this page' }));
    const bar = await screen.findByRole('toolbar', { name: 'Bulk actions' });
    expect(bar).toHaveTextContent('2 selected');
    expect(bar).not.toHaveTextContent('Reveal');
  });

  it('changes the sort and re-queries with it', async () => {
    const user = userEvent.setup();
    const { calls } = setup();
    await screen.findByText('Nova Systems');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'headcount_desc');
    await waitFor(() => expect(calls.some((u) => u.includes('sort=headcount_desc'))).toBe(true));
  });
});
