import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsWorkspace } from './SettingsWorkspace.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../../test/testUtils.jsx';

const summary = { plan: 'FREE', seats: 1, monthlyCreditGrant: 100, balance: 100, billingInterval: 'MONTH' };

describe('SettingsWorkspace branding', () => {
  it('shows current name + motto and saves an edit', async () => {
    const calls = [];
    mockFetchRoutes([
      { url: '/workspace', method: 'GET', respond: { body: { workspace: { id: 'w1', name: 'Acme', plan: 'FREE', motto: 'Old motto', logoUrl: null } } } },
      { url: '/billing/summary', method: 'GET', respond: { body: summary } },
      {
        url: '/workspace',
        method: 'PATCH',
        respond: (url, init) => {
          calls.push(JSON.parse(init.body));
          return { body: { workspace: { id: 'w1', name: 'Acme Growth', plan: 'FREE', motto: 'New motto', logoUrl: null } } };
        },
      },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<SettingsWorkspace />, { preloadedState: authenticatedState });

    // Seeded from the profile query.
    const nameInput = await screen.findByLabelText('Workspace name');
    await waitFor(() => expect(nameInput).toHaveValue('Acme'));
    expect(screen.getByLabelText('Motto')).toHaveValue('Old motto');

    await user.clear(nameInput);
    await user.type(nameInput, 'Acme Growth');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({ name: 'Acme Growth' });
  });

  it('shows the uploaded logo when present', async () => {
    mockFetchRoutes([
      { url: '/workspace', method: 'GET', respond: { body: { workspace: { id: 'w1', name: 'Acme', plan: 'BASIC', motto: null, logoUrl: 'data:image/png;base64,AAAA' } } } },
      { url: '/billing/summary', method: 'GET', respond: { body: { ...summary, plan: 'BASIC' } } },
    ]);
    renderWithProviders(<SettingsWorkspace />, { preloadedState: authenticatedState });

    const img = await screen.findByAltText('Workspace logo');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    expect(screen.getByRole('button', { name: /Replace logo/ })).toBeInTheDocument();
  });
});
