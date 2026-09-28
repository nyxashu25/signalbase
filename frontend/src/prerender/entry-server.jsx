// Build-time renderer for the marketing pages (scripts/prerender.mjs). Turns
// each public route into static HTML so crawlers — including AI crawlers,
// which don't run JavaScript — read the full page text without the client
// bundle. The browser never hydrates this markup: main.jsx renders the live
// app over it in one commit once the page's chunk has loaded.
//
// Only the page and its static frame are rendered. The WebGL world, intro
// overlay, custom cursor, smooth scroller and bookmark rail are
// browser-only and arrive with the client render.
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { Provider } from 'react-redux';
import { createAppStore } from '../store/index.js';
import { StoryBackdrop } from '../components/marketing/StoryBackdrop.jsx';
import { MarketingNav } from '../components/marketing/MarketingNav.jsx';
import { Home } from '../pages/marketing/Home.jsx';
import { Pricing } from '../pages/marketing/Pricing.jsx';
import { Product } from '../pages/marketing/Product.jsx';
import { Solutions } from '../pages/marketing/Solutions.jsx';
import { About } from '../pages/marketing/About.jsx';
import { Contact } from '../pages/marketing/Contact.jsx';
import { Privacy } from '../pages/marketing/Privacy.jsx';
import { Terms } from '../pages/marketing/Terms.jsx';
import { NotFound } from '../pages/marketing/NotFound.jsx';

export { SEO_ROUTES, NOT_FOUND_META, PRIVATE_META, headElements } from '../seo/site.js';

const PAGES = {
  '/': Home,
  '/pricing': Pricing,
  '/product': Product,
  '/solutions': Solutions,
  '/about': About,
  '/contact': Contact,
  '/privacy': Privacy,
  '/terms': Terms,
};

/** The same static frame MarketingLayout draws around every page. */
function Frame({ children }) {
  return (
    <div className="relative min-h-screen bg-ink-950">
      <StoryBackdrop />
      <MarketingNav />
      <div className="relative z-[2]">
        <div>{children}</div>
      </div>
    </div>
  );
}

/** HTML for the page at `path`; null means the 404 page. */
export function render(path) {
  const Page = (path && PAGES[path]) || NotFound;
  const location = path || '/404';
  return renderToString(
    <Provider store={createAppStore()}>
      <StaticRouter location={location}>
        <Frame>
          <Page />
        </Frame>
      </StaticRouter>
    </Provider>,
  );
}
