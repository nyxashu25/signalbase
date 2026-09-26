import { SignalRiver } from './SignalRiver.jsx';
import { useWorldState } from './worldStore.js';

/**
 * The fixed ground behind every marketing page: the deep-indigo canvas of
 * "the pit" (DESIGN_LANGUAGE.md §1 — depth), a couple of atmospheric glows
 * (glow as lighting, never as hierarchy — §11), and the 2D signal river
 * flowing over it. Mounted once by MarketingLayout, outside the page
 * transition so `position: fixed` keeps meaning the viewport.
 *
 * It is also the Signal World's loading ground and fallback: once the WebGL
 * world has drawn its first frame (worldStore `ready`) it covers the screen,
 * so the river and the pulsing glow stop to save the CPU/GPU; if the world
 * never starts or is lost, they keep running as the whole scene.
 */
export function StoryBackdrop() {
  const { ready } = useWorldState();

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-ink-950">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 70% -10%, rgba(97,0,145,0.45), transparent 60%), radial-gradient(90% 70% at 10% 110%, rgba(68,0,102,0.55), transparent 60%), linear-gradient(180deg, #110019 0%, #0d0016 50%, #110019 100%)',
        }}
      />
      <div
        className={`absolute left-1/2 top-[38%] h-[70vh] w-[70vw] -translate-x-1/2 -translate-y-1/2 rounded-full ${
          ready ? '' : 'story-pulse'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(170,0,255,0.16), transparent 62%)',
          filter: 'blur(40px)',
        }}
      />
      {!ready && <SignalRiver />}
    </div>
  );
}
