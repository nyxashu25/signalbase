import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import {
  SignalWorld,
  canRenderWorld,
  engineLoader,
  resetWorldCapabilityCache,
} from './SignalWorld.jsx';
import {
  getSnapshot,
  getWorldHandle,
  setWorldHandle,
  setWorldState,
  subscribe,
  useWorldState,
} from './worldStore.js';
import { IntroOverlay } from './IntroOverlay.jsx';
import { StoryCover } from './StoryCover.jsx';
import { CustomCursor } from './CustomCursor.jsx';
import { Magnetic } from './Magnetic.jsx';
import { Home } from '../../pages/marketing/Home.jsx';
import { Product } from '../../pages/marketing/Product.jsx';
import { Solutions } from '../../pages/marketing/Solutions.jsx';
import { Pricing } from '../../pages/marketing/Pricing.jsx';
import { About } from '../../pages/marketing/About.jsx';
import { Contact } from '../../pages/marketing/Contact.jsx';
import { Privacy } from '../../pages/marketing/Privacy.jsx';
import { Terms } from '../../pages/marketing/Terms.jsx';
import { renderWithProviders, mockFetchRoutes } from '../../test/testUtils.jsx';

const KNOWN_STATIONS = ['mark', 'tunnel', 'reveal', 'sequence', 'ledger', 'lens', 'crystals', 'city', 'blocks', 'drift'];

function resetWorld() {
  setWorldState({ active: false, ready: false });
  setWorldHandle(null);
}

beforeEach(resetWorld);
afterEach(() => {
  vi.restoreAllMocks();
  resetWorld();
});

describe('worldStore', () => {
  it('merges partial state, notifies subscribers only on change, and unsubscribes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    expect(getSnapshot()).toEqual({ active: false, ready: false });
    setWorldState({ active: true });
    expect(getSnapshot()).toEqual({ active: true, ready: false });
    expect(listener).toHaveBeenCalledTimes(1);

    setWorldState({ active: true }); // no change → no notification
    expect(listener).toHaveBeenCalledTimes(1);

    setWorldState({ ready: true });
    expect(getSnapshot()).toEqual({ active: true, ready: true });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setWorldState({ ready: false });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('re-renders useWorldState readers and holds the live world handle', () => {
    function Probe() {
      const { active, ready } = useWorldState();
      return <p>{`${active}/${ready}`}</p>;
    }
    render(<Probe />);
    expect(screen.getByText('false/false')).toBeInTheDocument();
    act(() => setWorldState({ active: true, ready: true }));
    expect(screen.getByText('true/true')).toBeInTheDocument();

    const handle = { intro: vi.fn() };
    setWorldHandle(handle);
    expect(getWorldHandle()).toBe(handle);
    setWorldHandle(null);
    expect(getWorldHandle()).toBeNull();
  });
});

describe('SignalWorld', () => {
  it('renders no canvas in jsdom (no WebGL2) and never requests the engine chunk', async () => {
    const load = vi.spyOn(engineLoader, 'load');
    const { container } = render(<SignalWorld pathname="/" />);

    expect(canRenderWorld()).toBe(false);
    expect(container).toBeEmptyDOMElement();
    expect(document.querySelector('canvas')).toBeNull();
    // Outlast the idle-callback fallback the engine load would be scheduled on.
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(load).not.toHaveBeenCalled();
    expect(getSnapshot().active).toBe(false);
  });

  it('falls back without requesting the engine when a WebGL2 context cannot be created', async () => {
    resetWorldCapabilityCache();
    window.WebGL2RenderingContext = function WebGL2RenderingContext() {};
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const load = vi.spyOn(engineLoader, 'load');
    try {
      const { container } = render(<SignalWorld pathname="/" />);
      // The real context probe runs in the idle boot, not before paint.
      expect(getContext).not.toHaveBeenCalled();
      await waitFor(() => expect(container).toBeEmptyDOMElement());
      // Probed without accepting a software / blocklisted-GPU context.
      expect(getContext).toHaveBeenCalledWith('webgl2', { failIfMajorPerformanceCaveat: true });
      expect(load).not.toHaveBeenCalled();
      expect(getSnapshot()).toEqual({ active: false, ready: false });
    } finally {
      delete window.WebGL2RenderingContext;
      resetWorldCapabilityCache();
    }
  });

  it('boots a (mocked) engine and feeds it stations, scroll, warp and lifecycle', async () => {
    resetWorldCapabilityCache();
    window.WebGL2RenderingContext = function WebGL2RenderingContext() {};
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      getExtension: () => ({ loseContext() {} }),
    });
    const world = {
      ready: false,
      setStations: vi.fn(),
      setScroll: vi.fn(),
      setPointer: vi.fn(),
      grab: vi.fn(),
      release: vi.fn(),
      warp: vi.fn(),
      intro: vi.fn(),
      resize: vi.fn(),
      setPaused: vi.fn(),
      dispose: vi.fn(),
    };
    const createSignalWorld = vi.fn(async () => world);
    vi.spyOn(engineLoader, 'load').mockResolvedValue({ createSignalWorld });

    try {
      const { rerender, unmount } = render(
        <>
          <section data-chapter data-station="mark" />
          <section data-chapter data-station="tunnel" data-station-side="0" />
          <section data-chapter data-station="not-a-station" />
          <SignalWorld pathname="/" />
        </>,
      );
      expect(getSnapshot().active).toBe(true);

      await waitFor(() => expect(createSignalWorld).toHaveBeenCalledTimes(1));
      const opts = createSignalWorld.mock.calls[0][0];
      expect(opts.canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(opts.canvas.getAttribute('aria-hidden')).toBe('true');
      expect(['high', 'low']).toContain(opts.quality);
      expect(typeof opts.onContextLost).toBe('function');

      await waitFor(() => expect(world.setStations).toHaveBeenCalled());
      expect(world.setStations).toHaveBeenLastCalledWith([
        { key: 'mark', side: 1 },
        { key: 'tunnel', side: 0 },
        { key: 'drift', side: 1 }, // unknown key → drift; side defaults by index parity
      ]);
      expect(getWorldHandle()).toBe(world);
      expect(world.resize).toHaveBeenCalledWith(window.innerWidth, window.innerHeight);
      // Scroll is sent before the stations (the first layout snaps to it).
      // At the top of the page the coordinate is always 0 — jsdom lays
      // nothing out, so every rest point clamps to the viewport centre.
      expect(world.setScroll).toHaveBeenCalledWith(0);
      expect(world.setScroll.mock.invocationCallOrder[0]).toBeLessThan(
        world.setStations.mock.invocationCallOrder[0],
      );
      expect(document.documentElement.getAttribute('data-world-quality')).toBe(opts.quality);

      world.ready = true;
      await waitFor(() => expect(getSnapshot().ready).toBe(true));

      rerender(
        <>
          <section data-chapter data-station="mark" />
          <section data-chapter data-station="tunnel" data-station-side="0" />
          <section data-chapter data-station="not-a-station" />
          <SignalWorld pathname="/pricing" />
        </>,
      );
      expect(world.warp).toHaveBeenCalledTimes(1);
      const layouts = world.setStations.mock.calls.length;
      act(() => {
        window.dispatchEvent(new CustomEvent('story:page-ready'));
      });
      // Even an identical layout is re-sent after a route change.
      await waitFor(() => expect(world.setStations.mock.calls.length).toBe(layouts + 1));

      unmount();
      expect(world.dispose).toHaveBeenCalledTimes(1);
      expect(getWorldHandle()).toBeNull();
      expect(getSnapshot()).toEqual({ active: false, ready: false });
      expect(document.querySelector('canvas')).toBeNull();
      expect(document.documentElement.hasAttribute('data-world-quality')).toBe(false);
    } finally {
      delete window.WebGL2RenderingContext;
      resetWorldCapabilityCache();
    }
  });

  function mockWorld() {
    return {
      ready: true,
      setStations: vi.fn(),
      setScroll: vi.fn(),
      setPointer: vi.fn(),
      grab: vi.fn(),
      release: vi.fn(),
      warp: vi.fn(),
      intro: vi.fn(),
      resize: vi.fn(),
      setPaused: vi.fn(),
      dispose: vi.fn(),
    };
  }

  it('waits for the real page after a route change, and re-warps a swap that lands after the warp', async () => {
    resetWorldCapabilityCache();
    window.WebGL2RenderingContext = function WebGL2RenderingContext() {};
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      getExtension: () => ({ loseContext() {} }),
    });
    const world = mockWorld();
    vi.spyOn(engineLoader, 'load').mockResolvedValue({ createSignalWorld: async () => world });

    // Same tree shape throughout, so SignalWorld stays mounted.
    function Page({ station, side, pathname }) {
      return (
        <>
          {station && <section data-chapter data-station={station} data-station-side={side} />}
          <SignalWorld pathname={pathname} />
        </>
      );
    }

    try {
      const { rerender, unmount } = render(<Page station="mark" side="1" pathname="/" />);
      await waitFor(() => expect(world.setStations).toHaveBeenCalledTimes(1));

      // Route change; the lazy page is still loading (no chapters yet).
      rerender(<Page pathname="/pricing" />);
      expect(world.warp).toHaveBeenCalledTimes(1);
      // The enter animation's page-ready over the Suspense fallback is ignored.
      act(() => {
        window.dispatchEvent(new CustomEvent('story:page-ready'));
      });
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(world.setStations).toHaveBeenCalledTimes(1);

      // The real page commits well after the warp has faded.
      const later = performance.now() + 2000;
      vi.spyOn(performance, 'now').mockReturnValue(later);
      rerender(<Page station="blocks" side="-1" pathname="/pricing" />);
      act(() => {
        window.dispatchEvent(new CustomEvent('story:page-ready'));
      });
      await waitFor(() => expect(world.setStations).toHaveBeenCalledTimes(2));
      expect(world.setStations).toHaveBeenLastCalledWith([{ key: 'blocks', side: -1 }]);
      // A fresh warp covers the late swap, fired before the stations land.
      expect(world.warp).toHaveBeenCalledTimes(2);
      expect(world.warp.mock.invocationCallOrder[1]).toBeLessThan(
        world.setStations.mock.invocationCallOrder[1],
      );
      unmount();
    } finally {
      delete window.WebGL2RenderingContext;
      resetWorldCapabilityCache();
    }
  });

  it('tears down to the CSS fallback when reduced motion is switched on mid-visit', async () => {
    resetWorldCapabilityCache();
    window.WebGL2RenderingContext = function WebGL2RenderingContext() {};
    let reduce = false;
    const listeners = new Set();
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      media: query,
      get matches() {
        return query.includes('reduced-motion') ? reduce : false;
      },
      addEventListener: (_type, fn) => listeners.add(fn),
      removeEventListener: (_type, fn) => listeners.delete(fn),
      addListener() {},
      removeListener() {},
    }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      getExtension: () => ({ loseContext() {} }),
    });
    const world = mockWorld();
    vi.spyOn(engineLoader, 'load').mockResolvedValue({ createSignalWorld: async () => world });

    try {
      const { container } = render(<SignalWorld pathname="/" />);
      await waitFor(() => expect(getSnapshot().ready).toBe(true));
      reduce = true;
      act(() => listeners.forEach((fn) => fn()));
      expect(world.dispose).toHaveBeenCalledTimes(1);
      expect(getSnapshot()).toEqual({ active: false, ready: false });
      expect(container).toBeEmptyDOMElement();
    } finally {
      delete window.WebGL2RenderingContext;
      resetWorldCapabilityCache();
    }
  });
});

describe('IntroOverlay', () => {
  it('renders nothing while the world is inactive', () => {
    const { container } = render(<IntroOverlay />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('plays once per session: loads, then descends via world.intro() when ready', async () => {
    window.sessionStorage.removeItem('dp-intro-seen');
    const intro = vi.fn();
    setWorldHandle({ intro });
    const { container } = render(<IntroOverlay />);
    act(() => setWorldState({ active: true }));
    expect(screen.getByRole('progressbar', { name: 'Loading the DataPit world' })).toBeInTheDocument();
    expect(screen.getByText('Descending into the pit')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('dp-intro-seen')).toBe('1');

    act(() => setWorldState({ ready: true }));
    await waitFor(() => expect(intro).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(container).toBeEmptyDOMElement(), { timeout: 2000 });
  });
});

describe('StoryCover', () => {
  const lines = [{ content: 'Find verified' }];

  it('renders the CSS 3D mark fallback while the world is inactive', () => {
    const { container } = render(<StoryCover eyebrow="Test" lines={lines} />);
    const section = container.querySelector('[data-chapter]');
    expect(section).toHaveAttribute('data-station', 'mark');
    expect(section).toHaveAttribute('data-station-side', '1');
    expect(container.querySelector('linearGradient[id^="dp-mark-gradient"]')).not.toBeNull();
    expect(container.querySelector('[data-world-grab]')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Find verified');
  });

  it('names the split headline with one plain-text copy and hides the visual lines', () => {
    const { container } = render(
      <StoryCover
        eyebrow="Test"
        lines={[
          { content: 'Find verified' },
          { content: <span className="bg-gradient-brand bg-clip-text text-transparent">contacts.</span> },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Find verified contacts.' })).toBeInTheDocument();
    const h1 = container.querySelector('h1');
    expect(h1.querySelectorAll('[aria-label]')).toHaveLength(0);
    for (const line of h1.querySelectorAll('[data-line]')) {
      expect(line.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('keeps the CSS mark while the world is loading (active, not yet ready)', () => {
    setWorldState({ active: true, ready: false });
    const { container } = render(<StoryCover eyebrow="Test" lines={lines} />);
    expect(container.querySelector('linearGradient[id^="dp-mark-gradient"]')).not.toBeNull();
    expect(container.querySelector('[data-world-grab]')).toBeNull();
    expect(screen.queryByText('Drag to spin')).toBeNull();
  });

  it('swaps the CSS mark for a drag-to-spin grab area once the world has drawn', () => {
    setWorldState({ active: true, ready: true });
    const { container } = render(<StoryCover eyebrow="Test" lines={lines} />);
    expect(container.querySelector('[data-world-grab]')).not.toBeNull();
    expect(screen.getByText('Drag to spin')).toBeInTheDocument();
    expect(container.querySelector('linearGradient[id^="dp-mark-gradient"]')).toBeNull();
  });

  it('gives other cover stations a same-size spacer without the grab area', () => {
    setWorldState({ active: true, ready: true });
    const { container } = render(<StoryCover eyebrow="Test" lines={lines} station="blocks" side={-1} />);
    const section = container.querySelector('[data-chapter]');
    expect(section).toHaveAttribute('data-station', 'blocks');
    expect(section).toHaveAttribute('data-station-side', '-1');
    expect(container.querySelector('[data-world-grab]')).toBeNull();
    expect(screen.queryByText('Drag to spin')).toBeNull();
    expect(container.querySelector('linearGradient[id^="dp-mark-gradient"]')).toBeNull();
  });
});

describe('pointer niceties in jsdom', () => {
  it('CustomCursor renders nothing without a fine pointer; Magnetic still renders its child', () => {
    const { container } = render(<CustomCursor />);
    expect(container).toBeEmptyDOMElement();
    render(
      <Magnetic>
        <button type="button">Pull</button>
      </Magnetic>,
    );
    expect(screen.getByRole('button', { name: 'Pull' })).toBeInTheDocument();
  });
});

describe('page stations', () => {
  function stationsOf(container) {
    return Array.from(container.querySelectorAll('[data-chapter]')).map((el) => el.dataset.station);
  }

  it.each([
    ['Home', Home, ['mark', 'tunnel', 'reveal', 'sequence', 'ledger', 'drift', 'drift', 'city', 'drift', 'mark']],
    ['Product', Product, ['mark', 'lens', 'reveal', 'sequence', 'ledger', 'drift', 'tunnel']],
    ['Solutions', Solutions, ['crystals', 'city', 'mark']],
    ['Pricing', Pricing, ['blocks', 'drift', 'ledger', 'drift', 'mark']],
    ['About', About, ['ledger', 'crystals', 'drift', 'tunnel', 'mark']],
    ['Contact', Contact, ['mark', 'drift']],
    ['Privacy', Privacy, ['drift']],
    ['Terms', Terms, ['drift']],
  ])('%s assigns a known station to every chapter', (_name, Page, expected) => {
    mockFetchRoutes([]);
    const { container } = renderWithProviders(<Page />);
    const stations = stationsOf(container);
    expect(stations).toEqual(expected);
    for (const el of container.querySelectorAll('[data-chapter]')) {
      expect(KNOWN_STATIONS).toContain(el.dataset.station);
      expect(['-1', '0', '1']).toContain(el.dataset.stationSide);
    }
  });

  it('Home keeps the How it works steps rendering inside its glass pane', () => {
    mockFetchRoutes([]);
    const { container } = renderWithProviders(<Home />);
    const steps = container.querySelector('[data-chapter-title="How it works"]');
    expect(steps).not.toBeNull();
    expect(steps.querySelector('.story-glass')).not.toBeNull();
    expect(steps).toHaveTextContent('Find verified contacts');
    expect(steps).toHaveTextContent('Reveal what you need');
    expect(steps).toHaveTextContent('Track buying signals');
  });
});
