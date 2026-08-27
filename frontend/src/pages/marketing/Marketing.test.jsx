import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from './Home.jsx';
import { Pricing } from './Pricing.jsx';
import { Contact } from './Contact.jsx';
import { Privacy } from './Privacy.jsx';
import { Terms } from './Terms.jsx';
import { About } from './About.jsx';
import { renderWithProviders, mockFetchRoutes } from '../../test/testUtils.jsx';

describe('marketing: Home', () => {
  it('renders the hero and sends "Start free" into register mode', () => {
    mockFetchRoutes([]);
    renderWithProviders(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    const ctas = screen.getAllByRole('link', { name: /Start free/ });
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) expect(cta).toHaveAttribute('href', '/login?mode=register');
  });
});

describe('marketing: Pricing', () => {
  it('shows all four tiers with per-block monthly prices', () => {
    mockFetchRoutes([]);
    renderWithProviders(<Pricing />);
    for (const name of ['Free', 'Basic', 'Professional', 'Organization']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    // Per-block prices: Basic $29, Organization $99.
    expect(screen.getAllByText('$29').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$99').length).toBeGreaterThan(0);
    // Each paid tier states its block composition.
    expect(screen.getAllByText(/14 paid \+ 5 free seats/).length).toBeGreaterThan(0);
  });

  it('recomputes prices when the billing interval changes (annual = 12 months − 20%)', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([]);
    renderWithProviders(<Pricing />);

    await user.click(screen.getByRole('button', { name: /Annually/ }));
    // 29 * 12 * 0.8 per block — the same math the backend charges.
    await waitFor(() => expect(screen.getAllByText('$278.40').length).toBeGreaterThan(0));
    expect(screen.getAllByText('$566.40').length).toBeGreaterThan(0); // 59 * 12 * 0.8

    await user.click(screen.getByRole('button', { name: /Quarterly/ }));
    await waitFor(() => expect(screen.getAllByText('$78.30').length).toBeGreaterThan(0)); // 29 * 3 * 0.9
  });
});

describe('marketing: Contact', () => {
  it('submits the lead form and shows the sent confirmation', async () => {
    const user = userEvent.setup();
    const calls = [];
    mockFetchRoutes([
      {
        url: '/contact',
        method: 'POST',
        respond: (url, init) => {
          calls.push(JSON.parse(init.body));
          return { status: 202, body: { received: true } };
        },
      },
    ]);
    renderWithProviders(<Contact />);

    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Work email'), 'ada@acme.test');
    await user.type(screen.getByLabelText('Company'), 'Acme');
    await user.type(screen.getByLabelText(/Message|How can we help/), 'Tell me about bulk credits.');
    await user.click(screen.getByRole('button', { name: /Send/ }));

    expect(await screen.findByText('Message sent')).toBeInTheDocument();
    expect(calls).toEqual([
      { name: 'Ada Lovelace', email: 'ada@acme.test', company: 'Acme', message: 'Tell me about bulk credits.' },
    ]);
  });
});

describe('marketing: Privacy opt-out form', () => {
  it('submits the erasure request and confirms', async () => {
    const user = userEvent.setup();
    const calls = [];
    mockFetchRoutes([
      {
        url: '/privacy/opt-out',
        method: 'POST',
        respond: (url, init) => {
          calls.push(JSON.parse(init.body));
          return { status: 202, body: { acknowledged: true, redactedContacts: 1 } };
        },
      },
    ]);
    renderWithProviders(<Privacy />);

    expect(screen.getByText('7. Remove my data (GDPR/CCPA opt-out)')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Your email address'), 'me@personal.test');
    await user.type(screen.getByLabelText('Reason (optional)'), 'please remove');
    await user.click(screen.getByRole('button', { name: 'Remove my data' }));

    expect(await screen.findByText(/Done — any records matching/)).toBeInTheDocument();
    expect(calls).toEqual([{ email: 'me@personal.test', reason: 'please remove' }]);
  });

  it('explains the rate limit instead of a raw 429', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/privacy/opt-out',
        method: 'POST',
        respond: { status: 429, body: { error: { message: 'Too many requests' } } },
      },
    ]);
    renderWithProviders(<Privacy />);

    await user.type(screen.getByLabelText('Your email address'), 'me@personal.test');
    await user.click(screen.getByRole('button', { name: 'Remove my data' }));

    expect(await screen.findByText(/Too many requests from this connection/)).toBeInTheDocument();
  });
});

describe('marketing: legal + about render', () => {
  it('Terms and About mount without crashing and carry their headings', () => {
    mockFetchRoutes([]);
    const { unmount } = renderWithProviders(<Terms />);
    expect(screen.getAllByText(/Terms of Service/).length).toBeGreaterThan(0);
    unmount();
    renderWithProviders(<About />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
