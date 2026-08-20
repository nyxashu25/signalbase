import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailVerifier } from './EmailVerifier.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../test/testUtils.jsx';

describe('EmailVerifier', () => {
  it('shows Deliverable for a confirmed email', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/tools/verify-email',
        method: 'POST',
        respond: {
          body: { email: 'real@acme.com', verified: true, checked: true, reason: 'valid' },
        },
      },
    ]);
    renderWithProviders(<EmailVerifier />, { preloadedState: authenticatedState });

    await user.type(screen.getByPlaceholderText('name@company.com'), 'real@acme.com');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('Deliverable')).toBeInTheDocument();
    expect(screen.getByText('real@acme.com')).toBeInTheDocument();
  });

  it('shows the reason for an undeliverable email', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/tools/verify-email',
        method: 'POST',
        respond: {
          body: { email: 'fake@acme.com', verified: false, checked: true, reason: 'invalid' },
        },
      },
    ]);
    renderWithProviders(<EmailVerifier />, { preloadedState: authenticatedState });

    await user.type(screen.getByPlaceholderText('name@company.com'), 'fake@acme.com');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('Not deliverable (invalid)')).toBeInTheDocument();
  });

  it('shows an unknown result when no provider is configured', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/tools/verify-email',
        method: 'POST',
        respond: {
          body: {
            email: 'someone@acme.com',
            verified: false,
            checked: false,
            reason: 'no_provider_configured',
          },
        },
      },
    ]);
    renderWithProviders(<EmailVerifier />, { preloadedState: authenticatedState });

    await user.type(screen.getByPlaceholderText('name@company.com'), 'someone@acme.com');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(
      await screen.findByText('Could not verify — no provider configured'),
    ).toBeInTheDocument();
  });

  it('shows a server error message when the request fails', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/tools/verify-email',
        method: 'POST',
        respond: { status: 429, body: { error: { message: 'Too many requests' } } },
      },
    ]);
    renderWithProviders(<EmailVerifier />, { preloadedState: authenticatedState });

    await user.type(screen.getByPlaceholderText('name@company.com'), 'someone@acme.com');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(screen.getByText('Too many requests')).toBeInTheDocument());
  });
});
