import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createAppStore } from './store/index.js';
import { App, preloadRoute } from './App.jsx';

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

// Routes are code-split (React.lazy), so every page assertion awaits the
// chunk via findBy*.
describe('App', () => {
  it('renders the dashboard at /app when authenticated', async () => {
    renderApp({ authenticated: true, path: '/app' });
    // Generous timeout: the route chunk is lazy-loaded and CI/parallel runs can be slow.
    expect(
      await screen.findByRole('heading', { name: 'Welcome back, Demo' }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('renders the in-app help guide at /app/help', async () => {
    renderApp({ authenticated: true, path: '/app/help' });
    expect(await screen.findByRole('heading', { name: 'Help & guide' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How credits work' })).toBeInTheDocument();
  });

  it('redirects to login when visiting /app unauthenticated', async () => {
    renderApp({ authenticated: false, path: '/app' });
    // Logo renders both theme variants (light/dark) — CSS picks the visible
    // one in a real browser; that stylesheet isn't loaded in this test env.
    expect((await screen.findAllByAltText('DataPit')).length).toBeGreaterThan(0);
    expect(screen.getByText('Sign in to your workspace')).toBeInTheDocument();
  });

  it('renders the public marketing home page at / without requiring auth', async () => {
    renderApp({ authenticated: false, path: '/' });
    expect(await screen.findByRole('heading', { level: 1 }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('renders the public pricing page at /pricing without requiring auth', async () => {
    renderApp({ authenticated: false, path: '/pricing' });
    expect(await screen.findByRole('heading', { name: 'Professional' })).toBeInTheDocument();
  });

  it('shows the 404 page, noindexed, for a URL no route claims', async () => {
    renderApp({ authenticated: false, path: '/no-such-page' });
    expect(
      await screen.findByRole('heading', { level: 1, name: /Page not found/ }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Page Not Found | DataPit');
    expect(document.head.querySelector('meta[name="robots"]').getAttribute('content')).toMatch(
      /^noindex/,
    );
  });
});

describe('chat widget', () => {
  it('loads after the page settles (its first interaction here), not with the page', async () => {
    renderApp({ authenticated: false, path: '/' });
    await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
    // A lazy chunk that isn't part of the page's first render.
    window.dispatchEvent(new Event('pointerdown'));
    // Generous timeout: the widget is a lazy chunk, slow under parallel test load.
    expect(
      await screen.findByRole('button', { name: 'Open chat' }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('stays off the admin panel', async () => {
    renderApp({ authenticated: false, path: '/control/login' });
    window.dispatchEvent(new Event('pointerdown'));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.queryByRole('button', { name: 'Open chat' })).toBeNull();
  });
});

describe('preloadRoute', () => {
  it('loads a marketing page chunk and resolves at once for app routes', async () => {
    await expect(preloadRoute('/pricing')).resolves.toBeUndefined();
    await expect(preloadRoute('/login')).resolves.toBeUndefined();
    await expect(preloadRoute('/app/people')).resolves.toBeUndefined();
    await expect(preloadRoute('/not-a-page')).resolves.toBeUndefined();
  });
});
