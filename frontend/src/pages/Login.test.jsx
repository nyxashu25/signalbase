import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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
});
