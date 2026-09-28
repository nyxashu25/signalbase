import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { headElements, metaForPath } from './site.js';

const MARKER = 'data-seo';

/**
 * Keeps <head> in step with client-side navigation: the title, description,
 * canonical, robots, Open Graph / Twitter tags and JSON-LD of the page now
 * showing. The prerendered HTML ships the same elements (built from the same
 * site.js), each marked `data-seo`, so this swaps them rather than piling up
 * duplicates. Renders nothing.
 */
export function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = metaForPath(pathname);
    document.title = meta.title;
    document.head.querySelectorAll(`[${MARKER}]`).forEach((el) => el.remove());
    const frag = document.createDocumentFragment();
    headElements(meta).forEach(({ tag, attrs, text }) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      el.setAttribute(MARKER, '');
      if (text) el.textContent = text;
      frag.appendChild(el);
    });
    document.head.appendChild(frag);
  }, [pathname]);

  return null;
}
