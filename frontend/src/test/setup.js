import '@testing-library/jest-dom/vitest';

// jsdom has no IntersectionObserver — framer-motion's whileInView (used by
// the marketing site's scroll-reveal components, see
// components/marketing/motion.jsx) calls it unconditionally on mount and
// throws without this. A no-op stub is enough: tests only need the
// components to render, not to actually animate on scroll.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

// RTK Query's fetchBaseQuery always builds a `new Request(url, ...)`, even
// with a stubbed global fetch (see @reduxjs/toolkit/dist/query/rtk-query.*
// — the Request is constructed outside its own try/catch). In jsdom, the
// global Request is Node's undici implementation, which — unlike a real
// browser — has no implicit document base and throws on the app's relative
// "/api/v1/..." URLs. Resolve them against jsdom's window.location instead.
const OriginalRequest = globalThis.Request;
globalThis.Request = class extends OriginalRequest {
  constructor(input, init) {
    if (typeof input === 'string' && input.startsWith('/')) {
      input = new URL(input, window.location.origin).toString();
    }
    super(input, init);
  }
};
