import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { VerifyEmail } from './VerifyEmail.jsx';
import { renderWithProviders, mockFetchRoutes } from '../test/testUtils.jsx';

describe('VerifyEmail', () => {
  it('confirms the token and navigates to /app on success', async () => {
    mockFetchRoutes([
      {
        url: '/auth/verify-email',
        method: 'POST',
        respond: {
          body: {
            accessToken: 'tok',
            user: { id: 'u1', email: 'new@acme.test', name: 'New User' },
            workspace: { id: 'w1', name: 'Acme Workspace' },
            role: 'OWNER',
          },
        },
      },
    ]);

    renderWithProviders(
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/app" element={<div>App home</div>} />
      </Routes>,
      { route: '/verify-email?token=good-token' },
    );

    expect(screen.getByText('Confirming your email…')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('App home')).toBeInTheDocument());
  });

  it('shows the error and a resend option for an invalid token', async () => {
    mockFetchRoutes([
      {
        url: '/auth/verify-email',
        method: 'POST',
        respond: {
          status: 400,
          body: { error: { message: 'Invalid or expired verification link' } },
        },
      },
    ]);

    renderWithProviders(<VerifyEmail />, { route: '/verify-email?token=bad-token' });

    expect(await screen.findByText('Invalid or expired verification link')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument();
  });

  it('shows a missing-link message with no token at all', () => {
    renderWithProviders(<VerifyEmail />, { route: '/verify-email' });

    expect(screen.getByText('Missing verification link')).toBeInTheDocument();
  });
});
