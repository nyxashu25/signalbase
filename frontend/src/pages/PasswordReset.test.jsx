import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPassword } from './ForgotPassword.jsx';
import { ResetPassword } from './ResetPassword.jsx';
import { renderWithProviders, mockFetchRoutes } from '../test/testUtils.jsx';

describe('ForgotPassword', () => {
  it('submits the email and shows the enumeration-safe confirmation', async () => {
    const calls = [];
    mockFetchRoutes([
      {
        url: '/auth/forgot-password',
        method: 'POST',
        respond: (url, init) => {
          calls.push(JSON.parse(init.body));
          return { body: { sent: true } };
        },
      },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<ForgotPassword />);
    await user.type(screen.getByLabelText('Email'), 'owner@acme.test');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(calls).toEqual([{ email: 'owner@acme.test' }]);
  });
});

describe('ResetPassword', () => {
  it('requires matching passwords, posts the token, and links to sign in on success', async () => {
    const calls = [];
    mockFetchRoutes([
      {
        url: '/auth/reset-password',
        method: 'POST',
        respond: (url, init) => {
          calls.push(JSON.parse(init.body));
          return { body: { reset: true } };
        },
      },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<ResetPassword />, { route: '/reset-password?token=tok-123' });

    await user.type(screen.getByLabelText('New password'), 'a-fresh-password-1');
    await user.type(screen.getByLabelText('Confirm new password'), 'wrong');
    expect(screen.getByText('Passwords don’t match.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set new password' })).toBeDisabled();

    await user.clear(screen.getByLabelText('Confirm new password'));
    await user.type(screen.getByLabelText('Confirm new password'), 'a-fresh-password-1');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));

    expect(await screen.findByText('Password changed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(calls).toEqual([{ token: 'tok-123', newPassword: 'a-fresh-password-1' }]);
  });

  it('shows the server error for an invalid token', async () => {
    mockFetchRoutes([
      {
        url: '/auth/reset-password',
        method: 'POST',
        respond: {
          status: 400,
          body: { error: { message: 'Invalid or expired reset link — request a new one' } },
        },
      },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<ResetPassword />, { route: '/reset-password?token=stale' });
    await user.type(screen.getByLabelText('New password'), 'a-fresh-password-1');
    await user.type(screen.getByLabelText('Confirm new password'), 'a-fresh-password-1');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(
      await screen.findByText('Invalid or expired reset link — request a new one'),
    ).toBeInTheDocument();
  });
});
