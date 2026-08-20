import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuidedTour } from './GuidedTour.jsx';
import { renderWithProviders, mockFetchRoutes } from '../test/testUtils.jsx';

function stateWithUser(tutorialCompletedAt) {
  return {
    auth: {
      status: 'authenticated',
      accessToken: 'test-token',
      user: { id: 'u1', email: 'demo@datapit.io', name: 'Demo', tutorialCompletedAt },
      workspace: { id: 'w1', name: 'Demo Workspace' },
      role: 'OWNER',
    },
  };
}

// A minimal stand-in for AppLayout's nav — GuidedTour looks these up on the
// real document via document.querySelector, not through its own subtree.
function NavFixture() {
  return (
    <div>
      <button type="button" data-tour="nav-dashboard">
        Dashboard
      </button>
    </div>
  );
}

// The 400ms reveal delay is the only thing that needs fake timers here —
// everything after that (userEvent clicks, the mutation) resolves through
// ordinary promise microtasks and real waitFor/findBy polling, so timers
// are switched back to real before any interaction happens.
async function renderAndReveal(ui, options) {
  vi.useFakeTimers();
  const result = renderWithProviders(ui, options);
  act(() => {
    vi.advanceTimersByTime(400);
  });
  vi.useRealTimers();
  await screen.findByText('Welcome to DataPit');
  return result;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('GuidedTour', () => {
  it('renders nothing when the tutorial was already completed', () => {
    vi.useFakeTimers();
    renderWithProviders(<GuidedTour />, { preloadedState: stateWithUser('2026-01-01T00:00:00Z') });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the welcome step once the reveal delay elapses', async () => {
    await renderAndReveal(<GuidedTour />, { preloadedState: stateWithUser(null) });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('advances through steps with Next and back up with Back', async () => {
    const user = userEvent.setup();
    await renderAndReveal(
      <>
        <NavFixture />
        <GuidedTour />
      </>,
      { preloadedState: stateWithUser(null) },
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 10')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Welcome to DataPit')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
  });

  it('marks the tutorial complete and dismisses on Skip', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/auth/tutorial-complete',
        method: 'POST',
        respond: { body: { tutorialCompletedAt: '2026-08-20T00:00:00.000Z' } },
      },
    ]);
    const { store } = await renderAndReveal(<GuidedTour />, {
      preloadedState: stateWithUser(null),
    });

    await user.click(screen.getByRole('button', { name: 'Skip tour' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(store.getState().auth.user.tutorialCompletedAt).toBeTruthy(),
    );
  });

  it('still dismisses locally even if the complete request fails', async () => {
    const user = userEvent.setup();
    mockFetchRoutes([
      {
        url: '/auth/tutorial-complete',
        method: 'POST',
        respond: { status: 500, body: { error: { message: 'boom' } } },
      },
    ]);
    await renderAndReveal(<GuidedTour />, { preloadedState: stateWithUser(null) });

    await user.click(screen.getByRole('button', { name: 'Skip tour' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
