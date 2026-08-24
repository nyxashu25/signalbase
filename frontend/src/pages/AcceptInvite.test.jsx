import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AcceptInvite } from './AcceptInvite.jsx';
import { renderWithProviders, mockFetchRoutes } from '../test/testUtils.jsx';

const info = (over = {}) => ({
  email: 'new@hire.test',
  role: 'MEMBER',
  workspaceName: 'Acme Workspace',
  inviterName: 'Owner',
  accountExists: false,
  expiresAt: '2026-08-31T00:00:00.000Z',
  ...over,
});

const session = {
  accessToken: 'tok',
  user: { id: 'u2', email: 'new@hire.test', name: 'New Hire' },
  workspace: { id: 'w1', name: 'Acme Workspace' },
  role: 'MEMBER',
};

describe('AcceptInvite', () => {
  it('new email: shows the invite details and creates an account with name + password', async () => {
    const calls = [];
    mockFetchRoutes([
      { url: /\/auth\/invite\?/, respond: { body: info() } },
      {
        url: '/auth/accept-invite',
        method: 'POST',
        respond: (url, init) => {
          calls.push(JSON.parse(init.body));
          return { body: session };
        },
      },
    ]);
    const user = userEvent.setup();
    const { store } = renderWithProviders(<AcceptInvite />, { route: '/accept-invite?token=tok-1' });

    expect(await screen.findByText('Join Acme Workspace on DataPit')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Your name'), 'New Hire');
    await user.type(screen.getByLabelText('Choose a password'), 'a-solid-password-1');
    await user.click(screen.getByRole('button', { name: 'Create account & join' }));

    await waitFor(() =>
      expect(calls).toEqual([{ token: 'tok-1', name: 'New Hire', password: 'a-solid-password-1' }]),
    );
    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'));
    expect(store.getState().auth.workspace.id).toBe('w1');
  });

  it('existing account: one-click accept without a password form', async () => {
    const calls = [];
    mockFetchRoutes([
      { url: /\/auth\/invite\?/, respond: { body: info({ accountExists: true, role: 'ADMIN' }) } },
      {
        url: '/auth/accept-invite',
        method: 'POST',
        respond: (url, init) => {
          calls.push(JSON.parse(init.body));
          return { body: { ...session, role: 'ADMIN' } };
        },
      },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<AcceptInvite />, { route: '/accept-invite?token=tok-2' });

    expect(await screen.findByText(/an admin/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Choose a password')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Accept & open Acme Workspace' }));
    await waitFor(() => expect(calls).toEqual([{ token: 'tok-2' }]));
  });

  it('shows a clear error for a dead link', async () => {
    mockFetchRoutes([
      {
        url: /\/auth\/invite\?/,
        respond: { status: 400, body: { error: { message: 'Invalid or expired invite link' } } },
      },
    ]);
    renderWithProviders(<AcceptInvite />, { route: '/accept-invite?token=dead' });
    expect(await screen.findByText('Invalid or expired invite link')).toBeInTheDocument();
  });
});
