import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { RequireAuth } from './RequireAuth.jsx';
import { renderWithProviders, authenticatedState } from '../test/testUtils.jsx';

function renderGuard(preloadedState, route = '/app') {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<div>Login page</div>} />
      <Route element={<RequireAuth />}>
        <Route path="/app" element={<div>Protected dashboard</div>} />
      </Route>
    </Routes>,
    { preloadedState, route },
  );
}

describe('RequireAuth', () => {
  it('renders nothing while the session check is still in flight', () => {
    renderGuard({
      auth: { status: 'checking', accessToken: null, user: null, workspace: null, role: null },
    });
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('redirects to /login when anonymous', () => {
    renderGuard({
      auth: { status: 'anonymous', accessToken: null, user: null, workspace: null, role: null },
    });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders the protected route when authenticated', () => {
    renderGuard(authenticatedState);
    expect(screen.getByText('Protected dashboard')).toBeInTheDocument();
  });
});
