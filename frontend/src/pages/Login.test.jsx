import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { Login } from './Login.jsx';
import { renderWithProviders, mockFetchRoutes } from '../test/testUtils.jsx';

describe('Login', () => {
  // GoogleSignInButton checks window.google.accounts.id synchronously before
  // falling back to injecting the real (network-fetched, unresolvable-in-
  // jsdom) Google script — pre-populating it here for every test keeps that
  // fallback path, and its test-file-scoped script-load promise cache, out
  // of the picture entirely.
  beforeEach(() => {
    window.google = {
      accounts: {
        id: {
          initialize: (opts) => {
            window.__gisCallback = opts.callback;
          },
          renderButton: () => {},
        },
      },
    };
  });

  afterEach(() => {
    delete window.google;
    delete window.__gisCallback;
  });

  it('defaults to sign-in mode at /login', () => {
    renderWithProviders(<Login />, { route: '/login' });

    expect(screen.getByText('Sign in to your workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Workspace / org name')).not.toBeInTheDocument();
  });

  it('opens straight into create-workspace mode at /login?mode=register', () => {
    renderWithProviders(<Login />, { route: '/login?mode=register' });

    expect(screen.getByText('Create a new workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Workspace / org name')).toBeInTheDocument();
  });

  it('signs in via the Google credential callback and navigates to /app', async () => {
    mockFetchRoutes([
      {
        url: '/auth/google',
        method: 'POST',
        respond: {
          body: {
            accessToken: 'tok',
            user: { id: 'u1', email: 'g@datapit.io', name: 'G User' },
            workspace: { id: 'w1', name: 'G Workspace' },
            role: 'OWNER',
          },
        },
      },
    ]);

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<div>App home</div>} />
      </Routes>,
      { route: '/login' },
    );

    await waitFor(() => expect(window.__gisCallback).toBeTypeOf('function'));
    window.__gisCallback({ credential: 'fake-id-token' });

    await waitFor(() => expect(screen.getByText('App home')).toBeInTheDocument());
  });

  it('registering shows a check-your-email panel instead of logging in', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/auth/register',
        method: 'POST',
        respond: { status: 202, body: { pendingVerification: true, email: 'new@acme.test' } },
      },
    ]);

    renderWithProviders(<Login />, { route: '/login?mode=register' });

    await user.type(screen.getByLabelText('Your name'), 'New User');
    await user.type(screen.getByLabelText('Workspace / org name'), 'Acme');
    await user.type(screen.getByLabelText('Email'), 'new@acme.test');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: 'Create workspace' }));

    expect(await screen.findByText('Check your email to confirm your account')).toBeInTheDocument();
    expect(screen.getByText('new@acme.test')).toBeInTheDocument();
  });

  it('shows a resend-verification action when login is blocked on confirmation', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/auth/login',
        method: 'POST',
        respond: {
          status: 403,
          body: { error: { message: 'Please verify your email address before signing in' } },
        },
      },
      {
        url: '/auth/resend-verification',
        method: 'POST',
        respond: { body: { sent: true } },
      },
    ]);

    renderWithProviders(<Login />, { route: '/login' });

    await user.type(screen.getByLabelText('Email'), 'unverified@acme.test');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const resendButton = await screen.findByRole('button', { name: 'Resend verification email' });
    await user.click(resendButton);

    expect(await screen.findByText('Sent — check your inbox')).toBeInTheDocument();
  });
});
