import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailVerifierTool } from './EmailVerifierTool.jsx';
import { EmailFinderTool } from './EmailFinderTool.jsx';
import { formatWait } from './toolUi.jsx';
import { normalizeDomainInput } from './EmailFinderTool.jsx';
import { renderWithProviders, mockFetchRoutes } from '../../../test/testUtils.jsx';

const VALID = {
  email: 'jane.doe@acme.com',
  verdict: 'valid',
  reason: 'ok',
  checks: {
    syntax: true,
    domainExists: true,
    mxRecords: true,
    disposable: false,
    roleAccount: false,
    freeProvider: false,
  },
  mxHosts: ['mx1.acme.com', 'mx2.acme.com'],
  note: 'The domain exists and has mail servers, so this address can receive email.',
};

const ROLE = {
  ...VALID,
  email: 'sales@acme.com',
  verdict: 'risky',
  reason: 'role_account',
  checks: { ...VALID.checks, roleAccount: true },
  note: 'This is a shared role inbox, so replies often go to a team queue.',
};

function checkRow(name) {
  return screen.getByText(name, { selector: 'span.font-bold' }).closest('li');
}

describe('EmailVerifierTool', () => {
  it('checks an address and shows a valid verdict, the six checks and the MX hosts', async () => {
    const user = userEvent.setup();
    const calls = [];
    mockFetchRoutes([
      {
        url: '/api/v1/public/tools/verify-email',
        method: 'POST',
        respond: (url, init) => {
          calls.push(JSON.parse(init.body));
          return { body: VALID };
        },
      },
    ]);
    renderWithProviders(<EmailVerifierTool />);

    await user.type(screen.getByLabelText('Email address'), '  jane.doe@acme.com ');
    await user.click(screen.getByRole('button', { name: 'Check email' }));

    expect(await screen.findByRole('heading', { name: 'jane.doe@acme.com' })).toBeInTheDocument();
    expect(calls).toEqual([{ email: 'jane.doe@acme.com' }]);
    expect(screen.getByText('Valid')).toBeInTheDocument();
    expect(
      screen.getByText(/The format, the domain and its mail server all check out/),
    ).toBeInTheDocument();
    expect(screen.getByText(VALID.note)).toBeInTheDocument();
    expect(screen.getByText(/doesn’t confirm that this mailbox exists/)).toBeInTheDocument();
    const checks = within(
      screen.getByRole('heading', { name: 'Checks' }).parentElement,
    ).getAllByRole('listitem');
    expect(checks).toHaveLength(6);
    expect(screen.getAllByText('Pass')).toHaveLength(6);
    expect(screen.getByText('mx1.acme.com')).toBeInTheDocument();
    expect(screen.getByText('mx2.acme.com')).toBeInTheDocument();
    // The follow-up nudge to sign up.
    expect(screen.getByRole('link', { name: 'Sign up free' })).toHaveAttribute(
      'href',
      '/login?mode=register',
    );
  });

  it('shows a risky role address with the failing check in words', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      { url: '/public/tools/verify-email', method: 'POST', respond: { body: ROLE } },
    ]);
    renderWithProviders(<EmailVerifierTool />);

    await user.type(screen.getByLabelText('Email address'), 'sales@acme.com');
    await user.click(screen.getByRole('button', { name: 'Check email' }));

    expect(await screen.findByText('Risky')).toBeInTheDocument();
    expect(screen.getByText(/shared role address, like info@ or sales@/)).toBeInTheDocument();
    expect(within(checkRow('Role address')).getByText('Fail')).toBeInTheDocument();
    expect(within(checkRow('Format')).getByText('Pass')).toBeInTheDocument();
    // "Valid" caveat only accompanies a valid verdict.
    expect(screen.queryByText(/doesn’t confirm that this mailbox exists/)).not.toBeInTheDocument();
  });

  it('marks the domain checks "Not checked" when the format is invalid', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/public/tools/verify-email',
        method: 'POST',
        respond: {
          body: {
            email: 'jane@@acme.com',
            verdict: 'invalid',
            reason: 'invalid_syntax',
            checks: {
              syntax: false,
              domainExists: false,
              mxRecords: false,
              disposable: false,
              roleAccount: false,
              freeProvider: false,
            },
            mxHosts: [],
            note: 'This isn’t a valid email address format.',
          },
        },
      },
    ]);
    renderWithProviders(<EmailVerifierTool />);
    await user.type(screen.getByLabelText('Email address'), 'jane@@acme.com');
    await user.click(screen.getByRole('button', { name: 'Check email' }));

    expect(await screen.findByText('Invalid')).toBeInTheDocument();
    expect(within(checkRow('Format')).getByText('Fail')).toBeInTheDocument();
    expect(screen.getAllByText('Not checked')).toHaveLength(5);
    expect(screen.queryByText(/Mail servers \(MX records\)/)).not.toBeInTheDocument();
  });

  it('explains the hourly limit with the Retry-After wait and a sign-up link', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/public/tools/verify-email',
        method: 'POST',
        respond: {
          status: 429,
          headers: { 'Retry-After': '1500' },
          body: { error: { message: 'Too many requests — please slow down' } },
        },
      },
    ]);
    renderWithProviders(<EmailVerifierTool />);

    await user.type(screen.getByLabelText('Email address'), 'jane@acme.com');
    await user.click(screen.getByRole('button', { name: 'Check email' }));

    expect(
      await screen.findByText('You’ve used the free checks for this hour.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/You can try again in 25 minutes/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up free' })).toHaveAttribute(
      'href',
      '/login?mode=register',
    );
  });

  it('says what went wrong on a server error', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/public/tools/verify-email',
        method: 'POST',
        respond: { status: 503, body: { error: { message: 'x' } } },
      },
    ]);
    renderWithProviders(<EmailVerifierTool />);
    await user.type(screen.getByLabelText('Email address'), 'jane@acme.com');
    await user.click(screen.getByRole('button', { name: 'Check email' }));
    expect(
      await screen.findByText(/Something went wrong on our side. Wait a minute and try again./),
    ).toBeInTheDocument();
  });

  it('marks the DNS checks "Not checked" when the lookup timed out', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/public/tools/verify-email',
        method: 'POST',
        respond: {
          body: {
            ...VALID,
            verdict: 'risky',
            reason: 'no_mail_server',
            checks: { ...VALID.checks, domainExists: false, mxRecords: false },
            mxHosts: [],
            note: 'We couldn’t check acme.com’s mail servers right now.',
          },
        },
      },
    ]);
    renderWithProviders(<EmailVerifierTool />);
    await user.type(screen.getByLabelText('Email address'), 'jane.doe@acme.com');
    await user.click(screen.getByRole('button', { name: 'Check email' }));

    expect(
      await screen.findByText('The domain couldn’t be checked right now.'),
    ).toBeInTheDocument();
    expect(within(checkRow('Domain')).getByText('Not checked')).toBeInTheDocument();
    expect(within(checkRow('Mail server')).getByText('Not checked')).toBeInTheDocument();
    expect(screen.queryByText('Fail')).not.toBeInTheDocument();
  });

  it('turns a 400 into the field message from the API', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/public/tools/find-email',
        method: 'POST',
        respond: {
          status: 400,
          body: {
            error: {
              message: 'Validation failed',
              details: {
                formErrors: [],
                fieldErrors: { domain: ['Enter a company domain, like acme.com'] },
              },
            },
          },
        },
      },
    ]);
    renderWithProviders(<EmailFinderTool />);
    await user.type(screen.getByLabelText('First name'), 'Jane');
    await user.type(screen.getByLabelText('Last name'), 'Doe');
    await user.type(screen.getByLabelText('Company domain'), 'acme.com');
    await user.click(screen.getByRole('button', { name: 'Find email' }));

    expect(
      await screen.findByText('Enter a company domain, like acme.com. Fix it and try again.'),
    ).toBeInTheDocument();
  });

  it('validates the input without spending a check', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchRoutes([]);
    renderWithProviders(<EmailVerifierTool />);
    const input = screen.getByLabelText('Email address');

    await user.click(screen.getByRole('button', { name: 'Check email' }));
    expect(screen.getByText('Enter an email address to check.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();

    await user.type(input, 'jane.acme.com');
    // Typing clears the old message.
    expect(screen.queryByText('Enter an email address to check.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check email' }));
    expect(screen.getByText(/needs a name, an @ and a domain/)).toBeInTheDocument();
    expect(input).toHaveAccessibleDescription(/needs a name, an @ and a domain/);

    await user.clear(input);
    await user.type(input, `${'a'.repeat(250)}@acme.com`);
    await user.click(screen.getByRole('button', { name: 'Check email' }));
    expect(screen.getByText(/can be at most 254/)).toBeInTheDocument();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('EmailFinderTool', () => {
  async function search(
    user,
    { first = 'Jane', last = 'Doe', domain = 'https://www.acme.com/about' } = {},
  ) {
    await user.type(screen.getByLabelText('First name'), first);
    await user.type(screen.getByLabelText('Last name'), last);
    await user.type(screen.getByLabelText('Company domain'), domain);
    await user.click(screen.getByRole('button', { name: 'Find email' }));
  }

  it('shows a masked match and a sign-up link to reveal it', async () => {
    const user = userEvent.setup();
    const calls = [];
    mockFetchRoutes([
      {
        url: '/api/v1/public/tools/find-email',
        method: 'POST',
        respond: (url, init) => {
          calls.push(JSON.parse(init.body));
          return {
            body: {
              domain: 'acme.com',
              company: { name: 'Acme' },
              found: true,
              maskedEmail: 'j***.d**@acme.com',
              pattern: { pattern: 'first.last', share: 0.72, sampleSize: 18 },
              // The API never pairs a guess with a masked match; the page
              // wouldn't show one anyway (asserted below).
              suggestion: null,
              signupUrl: '/login?mode=register',
            },
          };
        },
      },
    ]);
    renderWithProviders(<EmailFinderTool />);
    await search(user);

    expect(await screen.findByText('j***.d**@acme.com')).toBeInTheDocument();
    expect(calls).toEqual([
      { firstName: 'Jane', lastName: 'Doe', domain: 'https://www.acme.com/about' },
    ]);
    expect(
      screen.getByRole('heading', { name: 'Jane Doe at Acme is in DataPit' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up to reveal' })).toHaveAttribute(
      'href',
      '/login?mode=register',
    );
    // With a real match on file, no pattern guess is offered.
    expect(screen.queryByText('Unverified guess')).not.toBeInTheDocument();
    expect(screen.queryByText('jane.doe@acme.com')).not.toBeInTheDocument();
  });

  it('labels a pattern suggestion as an unverified guess', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/public/tools/find-email',
        method: 'POST',
        respond: {
          body: {
            domain: 'acme.com',
            company: { name: 'Acme' },
            found: false,
            maskedEmail: null,
            pattern: { pattern: 'first.last', share: 0.72, sampleSize: 18 },
            suggestion: 'jane.doe@acme.com',
            signupUrl: '/login?mode=register',
          },
        },
      },
    ]);
    renderWithProviders(<EmailFinderTool />);
    await search(user);

    const suggestion = await screen.findByText('jane.doe@acme.com');
    const guess = suggestion.parentElement;
    expect(within(guess).getByText('Unverified guess')).toBeInTheDocument();
    expect(
      within(guess).getByText(/used by 72% of the 18 addresses at acme.com/),
    ).toBeInTheDocument();
    expect(within(guess).getByRole('link', { name: /free email verifier/ })).toHaveAttribute(
      'href',
      '/tools/email-verifier',
    );
    expect(screen.getByText('Not in DataPit yet')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Jane Doe at Acme isn’t in DataPit yet' }),
    ).toBeInTheDocument();
  });

  it('says when neither the person nor the pattern is known', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/public/tools/find-email',
        method: 'POST',
        respond: {
          body: {
            domain: 'tiny.io',
            company: null,
            found: false,
            maskedEmail: null,
            pattern: null,
            suggestion: null,
            signupUrl: '/login?mode=register',
          },
        },
      },
    ]);
    renderWithProviders(<EmailFinderTool />);
    await search(user, { domain: 'tiny.io' });

    expect(await screen.findByText('Not in DataPit yet')).toBeInTheDocument();
    expect(screen.getByText(/we don’t know tiny.io’s email format yet/)).toBeInTheDocument();
    expect(screen.queryByText('Unverified guess')).not.toBeInTheDocument();
  });

  it('explains the daily limit', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/public/tools/find-email',
        method: 'POST',
        respond: {
          status: 429,
          headers: { 'Retry-After': String(20 * 3600) },
          body: { error: { message: 'slow down' } },
        },
      },
    ]);
    renderWithProviders(<EmailFinderTool />);
    await search(user);

    expect(await screen.findByText('You’ve used today’s free searches.')).toBeInTheDocument();
    expect(screen.getByText(/in about 20 hours/)).toBeInTheDocument();
  });

  it('validates every field before searching', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchRoutes([]);
    renderWithProviders(<EmailFinderTool />);

    await user.click(screen.getByRole('button', { name: 'Find email' }));
    expect(screen.getByText('Enter the person’s first name.')).toBeInTheDocument();
    expect(screen.getByText('Enter the person’s last name.')).toBeInTheDocument();
    expect(screen.getByText(/Enter the company’s website domain/)).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toHaveFocus();

    await user.type(screen.getByLabelText('Company domain'), 'acme');
    await user.click(screen.getByRole('button', { name: 'Find email' }));
    expect(screen.getByText(/That doesn’t look like a domain/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('free tool helpers', () => {
  it('formats the Retry-After wait', () => {
    expect(formatWait(null)).toBeNull();
    expect(formatWait(30)).toBe('in less than a minute');
    expect(formatWait(61)).toBe('in 2 minutes');
    expect(formatWait(3600)).toBe('in about 1 hour');
    expect(formatWait(86000)).toBe('in about 24 hours');
  });

  it('normalizes a domain, URL or email address the way the API does', () => {
    expect(normalizeDomainInput(' https://www.Acme.com/about?x=1 ')).toBe('acme.com');
    expect(normalizeDomainInput('jane@acme.co.uk')).toBe('acme.co.uk');
    expect(normalizeDomainInput('acme.com:443')).toBe('acme.com');
  });
});
