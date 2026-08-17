import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createAppStore } from './store/index.js';
import { App } from './App.jsx';

function renderApp({ authenticated }) {
  const store = createAppStore({
    auth: authenticated
      ? {
          status: 'authenticated',
          accessToken: 'test-token',
          user: { id: 'u1', email: 'demo@signalbase.io', name: 'Demo User' },
          workspace: { id: 'w1', name: 'Demo Workspace' },
          role: 'OWNER',
        }
      : { status: 'anonymous', accessToken: null, user: null, workspace: null, role: null },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    </Provider>,
  );
}

describe('App', () => {
  it('renders the dashboard at the root route when authenticated', () => {
    renderApp({ authenticated: true });
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    renderApp({ authenticated: false });
    expect(screen.getByRole('heading', { name: 'SignalBase' })).toBeInTheDocument();
    expect(screen.getByText('Sign in to your workspace')).toBeInTheDocument();
  });
});
