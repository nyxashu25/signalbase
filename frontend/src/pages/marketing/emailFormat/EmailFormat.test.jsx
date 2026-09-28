import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { Route, Routes, StaticRouter } from 'react-router-dom';
import { EmailFormatPage } from './EmailFormatPage.jsx';
import { EmailFormatIndex } from './EmailFormatIndex.jsx';
import { answerSentence, groupAlphabetically } from './formatUtils.js';
import { PageDataContext } from '../../../prerender/pageData.js';
import { createAppStore } from '../../../store/index.js';
import { ContentArticle } from '../../../components/marketing/ContentArticle.jsx';
import verifierPage from '../../../content/pages/tools/email-verifier.js';
import { renderWithProviders, mockFetchRoutes } from '../../../test/testUtils.jsx';

const ACME = {
  domain: 'acme.com',
  name: 'Acme',
  industry: 'Software',
  size: '51-200',
  location: 'Berlin, Germany',
  sampleSize: 18,
  patterns: [
    { pattern: 'first.last', share: 0.72, count: 13, example: 'jane.doe@acme.com' },
    { pattern: 'flast', share: 0.17, count: 3, example: 'jdoe@acme.com' },
    { pattern: 'other', share: 0.11, count: 2, example: '' },
  ],
  updated: '2026-09-20',
};

const ANSWER =
  'The most common email format at Acme is first.last@acme.com (jane.doe@acme.com), used by 72% of the 18 Acme addresses in DataPit.';

function withPageData(path, data, ui) {
  return <PageDataContext.Provider value={{ path, data }}>{ui}</PageDataContext.Provider>;
}

// The server render warns that layout effects (the cover's animation) don't
// run there; that's expected, so keep the test output quiet.
function serverRender(ui) {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    return renderToString(<Provider store={createAppStore()}>{ui}</Provider>);
  } finally {
    spy.mockRestore();
  }
}

function MarketingRoutes() {
  return (
    <Routes>
      <Route path="/email-format" element={<EmailFormatIndex />} />
      <Route path="/email-format/:domain" element={<EmailFormatPage />} />
      <Route path="/tools/email-verifier" element={<p>Verifier page</p>} />
    </Routes>
  );
}

describe('EmailFormatPage', () => {
  it('renders from the prerendered page data without fetching', () => {
    const fetchMock = mockFetchRoutes([]);
    renderWithProviders(withPageData('/email-format/acme.com', ACME, <EmailFormatPage />), {
      route: '/email-format/acme.com',
    });

    expect(screen.getByText(ANSWER)).toBeInTheDocument();
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4); // header + first.last, flast, other
    const top = within(table).getByRole('rowheader', { name: 'first.last' }).closest('tr');
    expect(within(top).getByText('jane.doe@acme.com')).toBeInTheDocument();
    expect(within(top).getByText('72%')).toBeInTheDocument();
    expect(within(top).getByText('13 of 18')).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Other formats' })).toBeInTheDocument();
    // Methodology with sample size and date, the verifier link and the sign-up CTA.
    expect(screen.getByText(/This page counts 18 addresses at @acme.com/)).toBeInTheDocument();
    expect(screen.getAllByText('September 20, 2026').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: 'Check it with the free email verifier' }),
    ).toHaveAttribute('href', '/tools/email-verifier');
    expect(screen.getByRole('link', { name: 'Start free' })).toHaveAttribute(
      'href',
      '/login?mode=register',
    );
    expect(screen.getByText('Software')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches the company on client-side navigation', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchRoutes([
      { url: '/api/v1/public/email-formats/acme.com', method: 'GET', respond: { body: ACME } },
    ]);
    // Landed on the index (prerendered with data), then clicked through.
    renderWithProviders(
      withPageData('/email-format', { minContacts: 5, companies: [ACME] }, <MarketingRoutes />),
      {
        route: '/email-format',
      },
    );

    await user.click(screen.getByRole('link', { name: /^Acme acme\.com/ }));

    expect(await screen.findByText(ANSWER)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('rowheader', { name: 'first.last' })).toBeInTheDocument();
  });

  it('shows a not-found message with links when the domain has no format', async () => {
    mockFetchRoutes([
      {
        url: '/public/email-formats/nope.io',
        method: 'GET',
        respond: { status: 404, body: { error: { message: 'Not found' } } },
      },
    ]);
    renderWithProviders(<EmailFormatPage />, { route: '/email-format/nope.io' });

    expect(
      await screen.findByRole('heading', { name: 'No email format for nope.io yet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all company email formats' })).toHaveAttribute(
      'href',
      '/email-format',
    );
    expect(
      screen.getByRole('link', { name: 'Check an address with the free email verifier' }),
    ).toHaveAttribute('href', '/tools/email-verifier');
  });

  it('renders on the server from page data', () => {
    const html = serverRender(
      withPageData(
        '/email-format/acme.com',
        ACME,
        <StaticRouter location="/email-format/acme.com">
          <EmailFormatPage />
        </StaticRouter>,
      ),
    );
    expect(html).toContain(
      'first.last@acme.com (jane.doe@acme.com), used by 72% of the 18 Acme addresses',
    );
    expect(html).toContain('jdoe@acme.com');
    expect(html).not.toContain('Loading the email format');
  });
});

describe('EmailFormatIndex', () => {
  it('shows a coming-soon note when no company qualifies yet', () => {
    const fetchMock = mockFetchRoutes([]);
    renderWithProviders(withPageData('/email-format', { companies: [] }, <EmailFormatIndex />), {
      route: '/email-format',
    });
    expect(screen.getByText(/Company email formats are coming soon/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /free email verifier/ })).toHaveAttribute(
      'href',
      '/tools/email-verifier',
    );
    expect(screen.queryByRole('list', { name: /Companies by letter/ })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches on client navigation and lists companies alphabetically with sample sizes', async () => {
    const zeta = { ...ACME, domain: 'zeta.io', name: 'zeta labs', sampleSize: 40 };
    const beta = { ...ACME, domain: 'beta.dev', name: 'Beta', sampleSize: 7 };
    mockFetchRoutes([
      {
        url: /\/api\/v1\/public\/email-formats$/,
        method: 'GET',
        respond: {
          body: {
            minContacts: 5,
            generatedAt: '2026-09-28T00:00:00Z',
            companies: [zeta, ACME, beta],
          },
        },
      },
    ]);
    renderWithProviders(<EmailFormatIndex />, { route: '/email-format' });

    const links = await screen.findAllByRole('link', { name: /addresses$/ });
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/email-format/acme.com',
      '/email-format/beta.dev',
      '/email-format/zeta.io',
    ]);
    expect(links[0]).toHaveTextContent('18 addresses');
    expect(links[2]).toHaveTextContent('40 addresses');
    expect(screen.getByRole('navigation', { name: 'Companies by letter' })).toBeInTheDocument();
  });
});

describe('email format wording', () => {
  it('leads with the top named pattern even when "other" is the biggest bucket', () => {
    const mixed = {
      ...ACME,
      patterns: [
        { pattern: 'other', share: 0.5, count: 9, example: '' },
        { pattern: 'flast', share: 0.3, count: 5, example: 'jdoe@acme.com' },
        { pattern: 'first', share: 0.2, count: 4, example: 'jane@acme.com' },
      ],
    };
    expect(answerSentence(mixed)).toBe(
      'Acme has no single standard email format. The most common one is flast@acme.com (jdoe@acme.com), used by 30% of the 18 Acme addresses in DataPit.',
    );
  });

  it('groups names A to Z, with digits last', () => {
    const groups = groupAlphabetically([
      { name: '3M', domain: '3m.com' },
      { name: 'ümlaut', domain: 'u.de' },
      { name: 'apple', domain: 'apple.com' },
      { name: 'Acme', domain: 'acme.com' },
    ]);
    expect(groups.map((g) => g.letter)).toEqual(['A', 'U', '#']);
    expect(groups[0].companies.map((c) => c.name)).toEqual(['Acme', 'apple']);
  });
});

describe('free tool content page', () => {
  it('renders the verifier widget at the top of the page body on the server', () => {
    const html = serverRender(
      <StaticRouter location="/tools/email-verifier">
        <ContentArticle page={verifierPage} />
      </StaticRouter>,
    );
    expect(html).toContain('Check an email address');
    expect(html).toContain('Check email');
    expect(html.indexOf('Check an email address')).toBeLessThan(
      html.indexOf('What does each check mean?'),
    );
  });
});
