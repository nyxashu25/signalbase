// Client-side loading for content pages: each page body under ./pages/ is
// its own lazy chunk, keyed by URL through the generated registry. Vite-only
// (import.meta.glob) — Node scripts read registry.generated.js instead.
import { createElement, lazy } from 'react';
import { CONTENT_PAGES } from './registry.generated.js';

const BODIES = import.meta.glob('./pages/**/*.js');

const LOADER_BY_PATH = new Map(
  CONTENT_PAGES.map((p) => [p.path, BODIES[`./${p.source.replace(/^src\/content\//, '')}`]]),
);

export function isContentPath(pathname) {
  return LOADER_BY_PATH.has(pathname);
}

// One preloadable lazy component per page, created on first use. Once its
// chunk has arrived it resolves synchronously (see lazyNamed in App.jsx), so
// the first render over prerendered HTML already holds the page.
const cache = new Map();
export function contentComponent(pathname) {
  if (!cache.has(pathname)) {
    const loader = LOADER_BY_PATH.get(pathname);
    let loaded = null;
    // The template loads with the body, so neither lands in the main bundle.
    const load = () =>
      Promise.all([loader(), import('../components/marketing/ContentArticle.jsx')]).then(
        ([mod, { ContentArticle }]) => {
          const page = mod.default;
          loaded = { default: () => createElement(ContentArticle, { page }) };
          return loaded;
        },
      );
    const Component = lazy(() => (loaded ? { then: (resolve) => resolve(loaded) } : load()));
    Component.preload = load;
    cache.set(pathname, Component);
  }
  return cache.get(pathname);
}
