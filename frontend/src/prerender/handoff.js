// The prerender handoff: true while the first client render is replacing a
// page the reader is already looking at (the static HTML from
// scripts/prerender.mjs), and on the server while that HTML is rendered.
//
// Mount-time entrances (the hero's fade-ups, the headline's character flip)
// read it once, at mount, and skip themselves: the content is already on
// screen, so hiding it only to animate it back in would blink the page and
// push Largest Contentful Paint back to the end of the animation. Client-side
// navigations start with it false and animate as usual.
let handoff = typeof window === 'undefined';

export function isPrerenderHandoff() {
  return handoff;
}

/** main.jsx: the root arrived with prerendered markup in it. */
export function beginPrerenderHandoff() {
  handoff = true;
}

/** App: the first commit is on screen; later mounts animate normally. */
export function endPrerenderHandoff() {
  handoff = false;
}
