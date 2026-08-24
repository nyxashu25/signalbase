import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsProfile } from './SettingsProfile.jsx';
import { SettingsSecurity } from './SettingsSecurity.jsx';
import { SettingsNotifications } from './SettingsNotifications.jsx';
import { SettingsMembers } from './SettingsMembers.jsx';
import { renderWithProviders, authenticatedState, mockFetchRoutes } from '../../test/testUtils.jsx';

const state = {
  auth: {
    ...authenticatedState.auth,
    user: {
      ...authenticatedState.auth.user,
      emailVerified: true,
      marketingOptOut: false,
      hasPassword: true,
      googleLinked: false,
    },
  },
};

describe('Settings', () => {
  it('Profile: saves a new name and updates the session', async () => {
    const calls = [];
    mockFetchRoutes([
      {
        url: '/auth/me',
        method: 'PATCH',
        respond: (url, init) => {
          calls.push(JSON.parse(init.body));
          return { body: { user: { ...state.auth.user, name: 'Ada Lovelace' } } };
        },
      },
    ]);
    const user = userEvent.setup();
    const { store } = renderWithProviders(<SettingsProfile />, { preloadedState: state });

    const save = screen.getByRole('button', { name: 'Save changes' });
    expect(save).toBeDisabled();
    const input = screen.getByLabelText('Full name');
    await user.clear(input);
    await user.type(input, 'Ada Lovelace');
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() => expect(calls).toEqual([{ name: 'Ada Lovelace' }]));
    await waitFor(() => expect(store.getState().auth.user.name).toBe('Ada Lovelace'));
  });

  it('Security: requires matching passwords, then posts current + new', async () => {
    const calls = [];
    mockFetchRoutes([
      {
        url: '/auth/change-password',
        method: 'POST',
        respond: (url, init) => {
          calls.push(JSON.parse(init.body));
          return { body: { user: { ...state.auth.user } } };
        },
      },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<SettingsSecurity />, { preloadedState: state });

    const submit = screen.getByRole('button', { name: 'Change password' });
    await user.type(screen.getByLabelText('Current password'), 'old-password-1');
    await user.type(screen.getByLabelText('New password'), 'brand-new-password');
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-passwor');
    expect(screen.getByText('Passwords don’t match.')).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Confirm new password'), 'd');
    expect(submit).toBeEnabled();
    await user.click(submit);
    await waitFor(() =>
      expect(calls).toEqual([{ currentPassword: 'old-password-1', newPassword: 'brand-new-password' }]),
    );
  });

  it('Security: a Google-only account sets a first password without a current one', () => {
    mockFetchRoutes([]);
    renderWithProviders(<SettingsSecurity />, {
      preloadedState: {
        auth: { ...state.auth, user: { ...state.auth.user, hasPassword: false, googleLinked: true } },
      },
    });
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set password' })).toBeInTheDocument();
    expect(screen.getByText('Linked')).toBeInTheDocument();
  });

  it('Notifications: the marketing switch posts the inverted opt-out flag', async () => {
    const calls = [];
    mockFetchRoutes([
      {
        url: '/auth/me/preferences',
        method: 'PATCH',
        respond: (url, init) => {
          calls.push(JSON.parse(init.body));
          return { body: { user: { ...state.auth.user, marketingOptOut: true } } };
        },
      },
    ]);
    const user = userEvent.setup();
    const { store } = renderWithProviders(<SettingsNotifications />, { preloadedState: state });
    const toggle = screen.getByRole('switch', { name: 'Product news and offers' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    await waitFor(() => expect(calls).toEqual([{ marketingOptOut: true }]));
    await waitFor(() => expect(store.getState().auth.user.marketingOptOut).toBe(true));
    expect(screen.getAllByText('Always on').length).toBeGreaterThan(0);
  });

  it('Members: lists seats, sends an invite, and shows the pending list with a copyable link', async () => {
    const created = [];
    const pending = [];
    mockFetchRoutes([
      {
        url: '/workspace/members',
        respond: {
          body: {
            members: [
              { id: 'm1', role: 'OWNER', joinedAt: '2026-08-01T00:00:00.000Z', user: { id: 'u1', name: 'Demo User', email: 'demo@datapit.io' } },
              { id: 'm2', role: 'MEMBER', joinedAt: '2026-08-10T00:00:00.000Z', user: { id: 'u2', name: 'Grace Hopper', email: 'grace@datapit.io' } },
            ],
          },
        },
      },
      {
        url: '/workspace/invites',
        method: 'POST',
        respond: (url, init) => {
          const body = JSON.parse(init.body);
          created.push(body);
          const invite = {
            id: 'inv1',
            email: body.email,
            role: body.role,
            invitedBy: { id: 'u1', name: 'Demo User' },
            createdAt: '2026-08-24T00:00:00.000Z',
            expiresAt: '2026-08-31T00:00:00.000Z',
            inviteUrl: 'https://datapit.io/accept-invite?token=tok-1',
          };
          pending.push(invite);
          return { status: 201, body: { invite } };
        },
      },
      { url: '/workspace/invites', method: 'GET', respond: () => ({ body: { invites: [...pending] } }) },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<SettingsMembers />, { preloadedState: state });

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('(you)')).toBeInTheDocument();
    expect(screen.getByText('2 seats in use.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Invite teammate' }));
    await user.type(screen.getByLabelText('Email'), 'new@hire.test');
    await user.click(screen.getByRole('button', { name: 'Admin' }));
    await user.click(screen.getByRole('button', { name: 'Send invite' }));

    await waitFor(() => expect(created).toEqual([{ email: 'new@hire.test', role: 'ADMIN' }]));
    expect(await screen.findByText('Pending invites')).toBeInTheDocument();
    expect(screen.getByText('new@hire.test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy invite link for new@hire.test' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke invite for new@hire.test' })).toBeInTheDocument();
  });

  it('Members: a MEMBER sees the invite button disabled', async () => {
    mockFetchRoutes([
      {
        url: '/workspace/members',
        respond: { body: { members: [{ id: 'm1', role: 'MEMBER', joinedAt: '2026-08-01T00:00:00.000Z', user: { id: 'u1', name: 'Demo User', email: 'demo@datapit.io' } }] } },
      },
    ]);
    renderWithProviders(<SettingsMembers />, {
      preloadedState: { auth: { ...state.auth, role: 'MEMBER' } },
    });
    expect(await screen.findByRole('button', { name: 'Invite teammate' })).toBeDisabled();
  });
});
