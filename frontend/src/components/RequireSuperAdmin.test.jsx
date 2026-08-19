import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { RequireSuperAdmin } from './RequireSuperAdmin.jsx';
import { renderWithProviders, authenticatedAdminState } from '../test/testUtils.jsx';

function renderGuard(preloadedState, route = '/control') {
  return renderWithProviders(
    <Routes>
      <Route path="/control/login" element={<div>Admin login page</div>} />
      <Route element={<RequireSuperAdmin />}>
        <Route path="/control" element={<div>Admin overview</div>} />
      </Route>
    </Routes>,
    { preloadedState, route },
  );
}

describe('RequireSuperAdmin', () => {
  it('redirects to /control/login when not authenticated', () => {
    renderGuard({ adminAuth: { status: 'anonymous', accessToken: null, admin: null } });
    expect(screen.getByText('Admin login page')).toBeInTheDocument();
  });

  it('renders the protected route when authenticated', () => {
    renderGuard(authenticatedAdminState);
    expect(screen.getByText('Admin overview')).toBeInTheDocument();
  });

  it('never falls back to the tenant auth state, even if tenant is authenticated', () => {
    renderGuard({
      adminAuth: { status: 'anonymous', accessToken: null, admin: null },
      auth: {
        status: 'authenticated',
        accessToken: 'tenant-token',
        user: { id: 'u1' },
        workspace: { id: 'w1' },
        role: 'OWNER',
      },
    });
    expect(screen.getByText('Admin login page')).toBeInTheDocument();
  });
});
