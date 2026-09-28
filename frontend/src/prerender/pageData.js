// Data a data-driven page (the email-format pages) was prerendered with.
// The prerender embeds it as <script id="dp-page-data" type="application/json">
// {"path": "...", "data": ...}</script>; main.jsx reads it once and provides
// it here, and the server render provides it directly. A page uses it for
// its first render (so the live page matches the static HTML exactly) and
// fetches from the API on client-side navigation.
import { createContext, useContext } from 'react';

export const PageDataContext = createContext(null);

/** The embedded page data, or null (server, or a page prerendered without data). */
export function readEmbeddedPageData() {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById('dp-page-data');
  if (!el) return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

/** The prerendered data for `pathname`, if this is the page it was rendered for. */
export function usePageData(pathname) {
  const embedded = useContext(PageDataContext);
  return embedded && embedded.path === pathname ? embedded.data : null;
}
