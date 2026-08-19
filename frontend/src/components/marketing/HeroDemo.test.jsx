import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import { HeroDemo } from './HeroDemo.jsx';

// The demo advances on real setTimeout chains driven by each phase's own
// duration (not a fixed interval), so fake timers + advanceTimersByTime is
// the only reliable way to step through it deterministically — real-time
// browser polling is at the mercy of background-tab timer throttling.
// Wrapped in act() because the timer callbacks call setState outside of any
// React-triggered event, so React won't flush them to the DOM otherwise.
// Each call advances BY the given amount from wherever the fake clock
// currently sits, so every call below states the delta since the previous
// checkpoint in the same test, not a cumulative total.
function advanceBy(ms) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('HeroDemo', () => {
  it('starts on the login screen', () => {
    render(<HeroDemo />);
    expect(screen.getByText('Sign in to your workspace')).toBeInTheDocument();
  });

  it('reaches the companies screen and shows the industry filter chip', () => {
    render(<HeroDemo />);
    // login(1800) + login-click(450) + people(1300) + move-to-reveal(900) +
    // click-reveal(500) + revealed(1300) + move-to-list(700) +
    // click-list(450) + added-to-list(1600) + to-companies(400) = 9400ms
    // is the start of "companies"; +50 lands just inside it.
    advanceBy(9450);
    expect(screen.getByText('40 companies')).toBeInTheDocument();
    expect(screen.getByText('Industry: SaaS')).toBeInTheDocument();
    const table = within(screen.getByTestId('hero-companies-table'));
    expect(table.getByText('Drift Labs')).toBeInTheDocument();
  });

  it('dims the non-matching company once the filter phase is reached', () => {
    render(<HeroDemo />);
    // companies(1300) + move-to-facet(800) + click-facet(450) = 2550 past
    // the companies-screen start reached above lands inside "filtered".
    advanceBy(9450 + 1300 + 800 + 450 + 10);
    expect(screen.getByText('3 companies')).toBeInTheDocument();
    const table = within(screen.getByTestId('hero-companies-table'));
    const haloRow = table.getByText('Halo Labs').closest('tr');
    expect(haloRow).toHaveStyle({ opacity: '0.3' });
  });

  it('shows the "+ List" action once the contact is revealed, then "Added" after clicking it', () => {
    render(<HeroDemo />);
    // login(1800) + login-click(450) + people(1300) + move-to-reveal(900) +
    // click-reveal(500) = 4950 is the start of "revealed"; +10 lands inside it.
    advanceBy(1800 + 450 + 1300 + 900 + 500 + 10);
    expect(screen.getByText('+ List')).toBeInTheDocument();

    // From here (4960), added-to-list starts at 4950 + 1300 + 700 + 450 =
    // 7400, so the remaining delta needed is 7400 - 4960 = 2440, +10 to land
    // inside it (not right on the boundary).
    advanceBy(2440 + 10);
    expect(screen.getByText('✓ Added')).toBeInTheDocument();
    expect(screen.getByText('Added to “Q3 outbound — Marketing leaders”')).toBeInTheDocument();
  });

  it('reaches the sequences screen using the same list name shown on the people screen', () => {
    render(<HeroDemo />);
    // Full path through companies/filtered to the start of "sequences":
    // companies-start(9400) + companies(1300) + move-to-facet(800) +
    // click-facet(450) + filtered(1700) + to-sequences(400) = 14050.
    advanceBy(14050 + 10);
    expect(screen.getByText('Q3 outbound — Marketing leaders')).toBeInTheDocument();
    expect(screen.getByText('41 enrolled · Active')).toBeInTheDocument();
  });
});
