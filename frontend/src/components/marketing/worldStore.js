import { useSyncExternalStore } from 'react';

// The Signal World's status, shared between the WebGL host (SignalWorld.jsx)
// and the parts of the storybook that change shape around it: the intro
// overlay, the backdrop (which stops drawing its 2D river once the 3D world
// is on screen), and the covers (which swap the CSS mark for a drag area over
// the 3D one). A tiny external store rather than context so the host can
// update it from outside React's render (engine callbacks, rAF) and every
// reader re-renders through useSyncExternalStore.
//
//   active — the world is being used: capability gate passed, engine
//            loading or running. Cleared again if loading fails or the GL
//            context is lost, so the CSS fallback comes back.
//   ready  — the engine has rendered its first frame.
//
// Deliberately free of any `three` import (see world/README.md): jsdom tests
// import this module and must never pull WebGL code in.

const INITIAL = Object.freeze({ active: false, ready: false });

let state = INITIAL;
let handle = null;
const listeners = new Set();

export function getSnapshot() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Shallow-merge `partial` into the state; notifies only on a real change. */
export function setWorldState(partial) {
  const next = { ...state, ...partial };
  const changed = Object.keys(next).some((key) => next[key] !== state[key]);
  if (!changed) return;
  state = Object.freeze(next);
  listeners.forEach((listener) => listener());
}

export function useWorldState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Convenience for readers that only care whether the world is in use. */
export function useWorldActive() {
  return useWorldState().active;
}

/**
 * The live engine handle (the object createSignalWorld() resolved to), for
 * components that need to drive it directly — IntroOverlay calls
 * `getWorldHandle()?.intro()`. Null whenever no world is running.
 */
export function setWorldHandle(next) {
  handle = next ?? null;
}

export function getWorldHandle() {
  return handle;
}

export const worldStore = {
  getSnapshot,
  subscribe,
  setWorldState,
  setWorldHandle,
  getWorldHandle,
};
