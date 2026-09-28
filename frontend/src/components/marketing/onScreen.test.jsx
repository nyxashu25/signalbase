import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useStepLoop, whenNear } from './onScreen.js';

// A controllable IntersectionObserver: tests decide when (and whether) an
// element is on screen.
let observers = [];
class FakeIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.targets = new Set();
    observers.push(this);
  }
  observe(el) {
    this.targets.add(el);
  }
  unobserve(el) {
    this.targets.delete(el);
  }
  disconnect() {
    this.targets.clear();
  }
  takeRecords() {
    return [];
  }
}

function report(el, isIntersecting) {
  act(() => {
    observers
      .filter((o) => o.targets.has(el))
      .forEach((o) => o.callback([{ target: el, isIntersecting }], o));
  });
}

const DURATIONS = [100, 200, 300];

function Demo() {
  const ref = useRef(null);
  const step = useStepLoop(ref, DURATIONS, 2);
  return (
    <div ref={ref} data-testid="demo">
      step {step}
    </div>
  );
}

let originalIO;
beforeEach(() => {
  observers = [];
  originalIO = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = FakeIntersectionObserver;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  globalThis.IntersectionObserver = originalIO;
  vi.restoreAllMocks();
});

describe('useStepLoop', () => {
  it('steps through the durations and loops', () => {
    render(<Demo />);
    expect(screen.getByText('step 0')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByText('step 1')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByText('step 2')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByText('step 0')).toBeInTheDocument();
  });

  it('pauses offscreen and resumes where it stopped', () => {
    render(<Demo />);
    const el = screen.getByTestId('demo');
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByText('step 1')).toBeInTheDocument();

    report(el, false);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('step 1')).toBeInTheDocument();

    report(el, true);
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByText('step 2')).toBeInTheDocument();
  });

  it('rests on the reduced-motion step without ticking', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      media: query,
      matches: query.includes('reduced-motion'),
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    }));
    render(<Demo />);
    expect(screen.getByText('step 2')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('step 2')).toBeInTheDocument();
  });
});

describe('whenNear', () => {
  it('runs the setup once the element nears the screen, and cleans up after it', () => {
    const el = document.createElement('div');
    const undo = vi.fn();
    const setup = vi.fn(() => undo);
    const cancel = whenNear(el, setup);
    expect(setup).not.toHaveBeenCalled();
    // A screen's height of look-ahead below (and above) the viewport.
    expect(observers[0].options.rootMargin).toBe('100% 0px');

    report(el, false);
    expect(setup).not.toHaveBeenCalled();
    report(el, true);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(el);
    report(el, true);
    expect(setup).toHaveBeenCalledTimes(1);

    cancel();
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('never runs the setup when cancelled first', () => {
    const el = document.createElement('div');
    const setup = vi.fn();
    const cancel = whenNear(el, setup);
    cancel();
    report(el, true);
    expect(setup).not.toHaveBeenCalled();
  });

  it('runs the setup at once without IntersectionObserver', () => {
    delete globalThis.IntersectionObserver;
    const el = document.createElement('div');
    const undo = vi.fn();
    const cancel = whenNear(el, () => undo);
    cancel();
    expect(undo).toHaveBeenCalledTimes(1);
  });
});
