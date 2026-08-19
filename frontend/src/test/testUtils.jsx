import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createAppStore } from '../store/index.js';

export const authenticatedState = {
  auth: {
    status: 'authenticated',
    accessToken: 'test-token',
    user: { id: 'u1', email: 'demo@datapit.io', name: 'Demo User' },
    workspace: { id: 'w1', name: 'Demo Workspace' },
    role: 'OWNER',
  },
};

export const authenticatedAdminState = {
  adminAuth: {
    status: 'authenticated',
    accessToken: 'test-admin-token',
    admin: { id: 'sa1', email: 'admin@datapit.io', name: 'Super Admin' },
  },
};

export function renderWithProviders(ui, { preloadedState, route = '/', ...renderOptions } = {}) {
  const store = createAppStore(preloadedState);
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </Provider>
    );
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

// Routes a stubbed global fetch by URL/method, since RTK Query's
// fetchBaseQuery is just a wrapper around fetch() — this lets a single test
// serve every endpoint a component touches (queries + mutations) without
// juggling a queue of one-shot mockResolvedValueOnce calls.
export function mockFetchRoutes(routes) {
  const fetchMock = vi.fn(async (input, init = {}) => {
    // RTK Query's fetchBaseQuery calls fetch(request) with a real Request
    // object, not a (url, init) pair — Request.toString() isn't the URL, so
    // url/method have to be read off its properties instead.
    const isRequest = typeof Request !== 'undefined' && input instanceof Request;
    const url = isRequest ? input.url : typeof input === 'string' ? input : input.toString();
    const method = (isRequest ? input.method : (init.method ?? 'GET')).toUpperCase();
    const match = routes.find((r) =>
      r.method === undefined || r.method === method
        ? r.url instanceof RegExp
          ? r.url.test(url)
          : url.includes(r.url)
        : false,
    );
    if (!match) {
      throw new Error(`Unhandled fetch in test: ${method} ${url}`);
    }
    const result = typeof match.respond === 'function' ? match.respond(url, init) : match.respond;
    const status = result.status ?? 200;
    const body = result.body ?? {};
    // The Fetch spec forbids a body on these statuses — the real Response
    // constructor throws if you pass one, same as it would for a real 204
    // reply with a stray JSON body.
    const nullBodyStatus = status === 204 || status === 205 || status === 304;
    return new Response(
      nullBodyStatus ? null : typeof body === 'string' ? body : JSON.stringify(body),
      {
        status,
        headers: { 'Content-Type': 'application/json', ...(result.headers ?? {}) },
      },
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
