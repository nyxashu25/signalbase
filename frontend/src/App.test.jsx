import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createAppStore } from './store/index.js';
import { App } from './App.jsx';

function renderApp({ authenticated, path = '/app' }) {
  const store = createAppStore({
    auth: authenticated
      ? {
          status: 'authenticated',
          accessToken: 'test-token',
          user: { id: 'u1', email: 'demo@datapit.io', name: 'Demo User' },
          workspace: { id: 'w1', name: 'Demo Workspace' },
          role: 'OWNER',
        }
      : { status: 'anonymous', accessToken: null, user: null, workspace: null, role: null },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </Provider>,
  );
}

describe('App', () => {
  it('renders the dashboard at /app when authenticated', () => {
    renderApp({ authenticated: true, path: '/app' });
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('redirects to login when visiting /app unauthenticated', () => {
    renderApp({ authenticated: false, path: '/app' });
    expect(screen.getByAltText('DataPit')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your workspace')).toBeInTheDocument();
  });

  it('renders the public marketing home page at / without requiring auth', () => {
    renderApp({ authenticated: false, path: '/' });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the public pricing page at /pricing without requiring auth', () => {
    renderApp({ authenticated: false, path: '/pricing' });
    expect(screen.getByRole('heading', { name: 'Professional' })).toBeInTheDocument();
  });
});
