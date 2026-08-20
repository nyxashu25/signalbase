import { useEffect, useLayoutEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCompleteTutorialMutation } from '../api/authApi.js';
import { markTutorialCompleted } from '../store/authSlice.js';
import { TOUR_STEPS } from '../data/tourSteps.js';

const MOBILE_BREAKPOINT = 768; // matches Tailwind's `md:` used throughout AppLayout
const CARD_WIDTH = 320;
const CARD_HEIGHT_ESTIMATE = 170;
const GAP = 14;

function isNavTarget(selector) {
  return selector?.startsWith('[data-tour="nav-') ?? false;
}

// AppLayout's mobile sidebar is hidden off-canvas by default (see its
// `navOpen` state) — a spotlighted nav item on mobile has to be opened via
// the same hamburger button a real user would tap, so it drives AppLayout
// through the DOM rather than duplicating its open/close state here.
async function ensureMobileNavStateFor(targetSelector) {
  if (window.innerWidth >= MOBILE_BREAKPOINT) return false;
  const wantOpen = isNavTarget(targetSelector);
  const closeBtn = document.querySelector('button[aria-label="Close navigation"]');
  const isOpen = Boolean(closeBtn);
  if (wantOpen && !isOpen) {
    document.querySelector('button[aria-label="Open navigation"]')?.click();
    return true;
  }
  if (!wantOpen && isOpen) {
    closeBtn.click();
    return true;
  }
  return false;
}

function computeTooltipPos(rect) {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  if (rect.bottom + GAP + CARD_HEIGHT_ESTIMATE < viewportH) {
    return { top: rect.bottom + GAP, left: clampLeft(rect.left, viewportW) };
  }
  if (rect.top - GAP - CARD_HEIGHT_ESTIMATE > 0) {
    return { top: rect.top - GAP - CARD_HEIGHT_ESTIMATE, left: clampLeft(rect.left, viewportW) };
  }
  const top = Math.max(GAP, Math.min(rect.top, viewportH - CARD_HEIGHT_ESTIMATE - GAP));
  const rightSideLeft = rect.right + GAP;
  const left =
    rightSideLeft + CARD_WIDTH < viewportW ? rightSideLeft : Math.max(GAP, rect.left - GAP - CARD_WIDTH);
  return { top, left };
}

function clampLeft(left, viewportW) {
  return Math.max(GAP, Math.min(left, viewportW - CARD_WIDTH - GAP));
}

export function GuidedTour() {
  const user = useSelector((s) => s.auth.user);
  const status = useSelector((s) => s.auth.status);
  const dispatch = useDispatch();
  const [completeTutorial] = useCompleteTutorialMutation();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [visible, setVisible] = useState(false);

  const eligible = status === 'authenticated' && Boolean(user) && !user.tutorialCompletedAt;
  const step = TOUR_STEPS[stepIndex];

  // Let the page render first — popping a full-screen tour before layout
  // settles reads as a flash, not a welcome.
  useEffect(() => {
    if (!eligible) return undefined;
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, [eligible]);

  useLayoutEffect(() => {
    if (!eligible || !visible) return undefined;
    let cancelled = false;

    async function measure() {
      const toggled = await ensureMobileNavStateFor(step.target);
      if (toggled) await new Promise((r) => setTimeout(r, 260));
      if (cancelled) return;
      if (!step.target) {
        setRect(null);
        return;
      }
      const el = document.querySelector(step.target);
      setRect(el ? el.getBoundingClientRect() : null);
    }
    measure();

    function onResize() {
      if (!step.target) return;
      const el = document.querySelector(step.target);
      if (el) setRect(el.getBoundingClientRect());
    }
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
    };
  }, [stepIndex, eligible, visible, step.target]);

  if (!eligible || !visible) return null;

  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const tooltipPos = rect ? computeTooltipPos(rect) : null;

  async function finishTour() {
    await ensureMobileNavStateFor(null);
    setVisible(false);
    try {
      await completeTutorial().unwrap();
    } catch {
      // Nothing else to do — the tour stays dismissed for this session
      // either way; it'll simply reappear next login if the write failed.
    }
    dispatch(markTutorialCompleted());
  }

  function next() {
    if (isLast) {
      finishTour();
      return;
    }
    setRect(null);
    setStepIndex((i) => i + 1);
  }

  function back() {
    setRect(null);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Guided tour">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-lg transition-all duration-300 ease-brand"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: '0 0 0 9999px rgba(10, 0, 24, 0.72)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(10,0,24,0.72)] transition-opacity duration-300 ease-brand" />
      )}

      <div
        className={`fixed w-[320px] max-w-[calc(100vw-32px)] rounded-lg border border-border bg-surface-elevated p-5 text-text shadow-dp-md transition-all duration-300 ease-brand ${
          rect ? '' : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
        }`}
        style={rect && tooltipPos ? { top: tooltipPos.top, left: tooltipPos.left } : undefined}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </p>
        <h2 className="mt-1 text-base font-bold text-text">{step.title}</h2>
        <p className="mt-2 text-sm text-text-muted">{step.body}</p>
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={finishTour}
            className="text-xs font-bold text-text-muted hover:text-text"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-bold text-text hover:bg-surface"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-md bg-gradient-action px-3 py-1.5 text-xs font-bold text-white transition-transform duration-150 ease-brand hover:-translate-y-px"
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
