import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsApi } from './SettingsApi.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../../test/testUtils.jsx';

const existingKey = {
  id: 'k1',
  name: 'Work laptop',
  prefix: 'dpk_a1b2c3d4',
  createdAt: '2026-08-20T10:00:00.000Z',
  lastUsedAt: null,
};

describe('SettingsApi', () => {
  it('lists keys with prefix only and shows the empty state without any', async () => {
    mockFetchRoutes([
      { url: '/api-keys', method: 'GET', respond: { body: { keys: [existingKey] } } },
    ]);
    renderWithProviders(<SettingsApi />, { preloadedState: authenticatedState });

    expect(await screen.findByText('Work laptop')).toBeInTheDocument();
    expect(screen.getByText('dpk_a1b2c3d4…')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('always offers the extension download (the permanent home for updates)', async () => {
    mockFetchRoutes([{ url: '/api-keys', method: 'GET', respond: { body: { keys: [] } } }]);
    renderWithProviders(<SettingsApi />, { preloadedState: authenticatedState });

    const download = await screen.findByRole('link', { name: /Download extension · v/ });
    expect(download).toHaveAttribute('href', '/downloads/datapit-extension.zip');
    expect(download).toHaveAttribute('download');
  });

  it('creates a key and surfaces the full secret exactly once', async () => {
    const user = userEvent.setup();
    let created = false;
    mockFetchRoutes([
      {
        url: '/api-keys',
        method: 'POST',
        respond: (url, init) => {
          created = true;
          expect(JSON.parse(init.body)).toEqual({ name: 'Chrome — laptop' });
          return {
            status: 201,
            body: {
              id: 'k2',
              name: 'Chrome — laptop',
              prefix: 'dpk_99887766',
              key: 'dpk_99887766aabbccddeeff00112233445566778899',
              createdAt: '2026-08-24T09:00:00.000Z',
              lastUsedAt: null,
            },
          };
        },
      },
      {
        url: '/api-keys',
        method: 'GET',
        respond: () => ({
          body: {
            keys: created
              ? [{ id: 'k2', name: 'Chrome — laptop', prefix: 'dpk_99887766', createdAt: '2026-08-24T09:00:00.000Z', lastUsedAt: null }]
              : [],
          },
        }),
      },
    ]);
    renderWithProviders(<SettingsApi />, { preloadedState: authenticatedState });

    await user.click(await screen.findByRole('button', { name: 'Create your first key' }));
    await user.type(screen.getByLabelText('Key name'), 'Chrome — laptop');
    await user.click(screen.getByRole('button', { name: 'Create key' }));

    expect(
      await screen.findByText('dpk_99887766aabbccddeeff00112233445566778899'),
    ).toBeInTheDocument();
    expect(screen.getByText(/only this once/)).toBeInTheDocument();

    // Dismissing the banner removes the secret from the page
    await user.click(screen.getByRole('button', { name: 'Done — hide it' }));
    expect(
      screen.queryByText('dpk_99887766aabbccddeeff00112233445566778899'),
    ).not.toBeInTheDocument();
  });

  it('revokes a key', async () => {
    const user = userEvent.setup();
    let revoked = false;
    mockFetchRoutes([
      {
        url: '/api-keys/k1',
        method: 'DELETE',
        respond: () => {
          revoked = true;
          return { body: { revoked: true } };
        },
      },
      {
        url: '/api-keys',
        method: 'GET',
        respond: () => ({ body: { keys: revoked ? [] : [existingKey] } }),
      },
    ]);
    renderWithProviders(<SettingsApi />, { preloadedState: authenticatedState });
    await screen.findByText('Work laptop');

    await user.click(screen.getByRole('button', { name: 'Revoke API key Work laptop' }));
    await waitFor(() => expect(screen.getByText('No API keys yet')).toBeInTheDocument());
  });
});
