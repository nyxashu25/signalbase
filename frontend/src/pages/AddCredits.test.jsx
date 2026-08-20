import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddCredits } from './AddCredits.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

const packages = [
  { credits: 250, usdCents: 1500, inrPaise: 125000 },
  { credits: 600, usdCents: 3000, inrPaise: 250000, badge: 'Best value' },
  { credits: 1500, usdCents: 6500, inrPaise: 540000 },
];
const customRange = { min: 200, max: 50000 };

describe('AddCredits', () => {
  it('lists packages priced in USD by default', async () => {
    mockFetchRoutes([{ url: '/billing/packages', respond: { body: { packages } } }]);
    renderWithProviders(<AddCredits />, { preloadedState: authenticatedState });

    expect(await screen.findByText('$15')).toBeInTheDocument();
    expect(screen.getByText('$30')).toBeInTheDocument();
    expect(screen.getByText('$65')).toBeInTheDocument();
  });

  it('switches to INR pricing when the currency toggle is used', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([{ url: '/billing/packages', respond: { body: { packages } } }]);
    renderWithProviders(<AddCredits />, { preloadedState: authenticatedState });

    await screen.findByText('$15');
    await user.click(screen.getByRole('button', { name: 'INR' }));
    expect(screen.getByText('₹1,250')).toBeInTheDocument();
  });

  it('redirects the browser to the checkout session url on continue', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      { url: '/billing/packages', respond: { body: { packages } } },
      {
        url: '/billing/checkout-session',
        method: 'POST',
        respond: {
          body: {
            provider: 'stripe',
            sessionId: 'cs_test_1',
            url: 'https://checkout.stripe.com/test-session',
          },
        },
      },
    ]);
    const original = window.location;
    delete window.location;
    window.location = { ...original, href: '' };

    renderWithProviders(<AddCredits />, { preloadedState: authenticatedState });
    await screen.findByText('$15');
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));

    await waitFor(() =>
      expect(window.location.href).toBe('https://checkout.stripe.com/test-session'),
    );
    window.location = original;
  });

  it('shows an error message when checkout fails to start', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      { url: '/billing/packages', respond: { body: { packages } } },
      {
        url: '/billing/checkout-session',
        method: 'POST',
        respond: { status: 400, body: { error: { message: 'Unknown credit package' } } },
      },
    ]);
    renderWithProviders(<AddCredits />, { preloadedState: authenticatedState });
    await screen.findByText('$15');
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));

    expect(await screen.findByText('Unknown credit package')).toBeInTheDocument();
  });

  it('shows a live price as a valid custom amount is entered', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      { url: '/billing/packages', respond: { body: { packages, customRange } } },
      {
        url: '/billing/custom-credits-price',
        respond: { body: { usdCents: 4995, inrPaise: 416_250 } },
      },
    ]);
    renderWithProviders(<AddCredits />, { preloadedState: authenticatedState });
    await screen.findByText('$15');

    await user.click(screen.getByText('Custom amount'));
    await user.type(screen.getByPlaceholderText(/e\.g\./), '999');

    expect(await screen.findByText('$49.95')).toBeInTheDocument();
  });

  it('rejects a custom amount outside the allowed range', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([{ url: '/billing/packages', respond: { body: { packages, customRange } } }]);
    renderWithProviders(<AddCredits />, { preloadedState: authenticatedState });
    await screen.findByText('$15');

    await user.click(screen.getByText('Custom amount'));
    await user.type(screen.getByPlaceholderText(/e\.g\./), '100');

    expect(await screen.findByText(/Must be between 200 and 50,000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeDisabled();
  });

  it('checks out with the custom credit amount', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      { url: '/billing/packages', respond: { body: { packages, customRange } } },
      {
        url: '/billing/custom-credits-price',
        respond: { body: { usdCents: 4995, inrPaise: 416_250 } },
      },
      {
        url: '/billing/checkout-session',
        method: 'POST',
        respond: {
          body: {
            provider: 'stripe',
            sessionId: 'cs_custom',
            url: 'https://checkout.stripe.com/custom-session',
          },
        },
      },
    ]);
    const original = window.location;
    delete window.location;
    window.location = { ...original, href: '' };

    renderWithProviders(<AddCredits />, { preloadedState: authenticatedState });
    await screen.findByText('$15');

    await user.click(screen.getByText('Custom amount'));
    await user.type(screen.getByPlaceholderText(/e\.g\./), '999');
    await screen.findByText('$49.95');
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));

    await waitFor(() =>
      expect(window.location.href).toBe('https://checkout.stripe.com/custom-session'),
    );
    window.location = original;
  });
});
