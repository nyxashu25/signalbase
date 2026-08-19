import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminSettings } from './AdminSettings.jsx';
import {
  renderWithProviders,
  authenticatedAdminState,
  mockFetchRoutes,
} from '../../test/testUtils.jsx';

describe('AdminSettings', () => {
  it('shows "Not connected" when Stripe has never been configured', async () => {
    mockFetchRoutes([
      {
        url: '/settings/stripe',
        method: 'GET',
        respond: { body: { configured: false, keySecretLast4: null, hasWebhookSecret: false } },
      },
    ]);
    renderWithProviders(<AdminSettings />, { preloadedState: authenticatedAdminState });

    expect(await screen.findByText('Not connected')).toBeInTheDocument();
    expect(screen.queryByText(/^••••/)).not.toBeInTheDocument();
  });

  it('shows "Connected" with a masked key once Stripe is configured', async () => {
    mockFetchRoutes([
      {
        url: '/settings/stripe',
        method: 'GET',
        respond: { body: { configured: true, keySecretLast4: '4242', hasWebhookSecret: true } },
      },
    ]);
    renderWithProviders(<AdminSettings />, { preloadedState: authenticatedAdminState });

    expect(await screen.findByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('••••4242')).toBeInTheDocument();
    expect(screen.getByText('Set')).toBeInTheDocument();
  });

  it('saves a new secret key and shows confirmation', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/settings/stripe',
        method: 'GET',
        respond: { body: { configured: false, keySecretLast4: null, hasWebhookSecret: false } },
      },
      {
        url: '/settings/stripe',
        method: 'PUT',
        respond: { body: { configured: true, keySecretLast4: '9999', hasWebhookSecret: false } },
      },
    ]);
    renderWithProviders(<AdminSettings />, { preloadedState: authenticatedAdminState });

    await screen.findByText('Not connected');
    await user.type(screen.getByPlaceholderText('sk_live_...'), 'sk_test_abc9999');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Saved.')).toBeInTheDocument());
    expect(screen.getByPlaceholderText('sk_live_...')).toHaveValue('');
  });
});
