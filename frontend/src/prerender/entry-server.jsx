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
import { Press } from '../pages/marketing/Press.jsx';
import { Contact } from '../pages/marketing/Contact.jsx';
import { Privacy } from '../pages/marketing/Privacy.jsx';
import { Terms } from '../pages/marketing/Terms.jsx';
import { NotFound } from '../pages/marketing/NotFound.jsx';
import { BlogIndex } from '../pages/marketing/BlogIndex.jsx';
import { EmailFormatIndex } from '../pages/marketing/emailFormat/EmailFormatIndex.jsx';
import { EmailFormatPage } from '../pages/marketing/emailFormat/EmailFormatPage.jsx';
import { ContentArticle } from '../components/marketing/ContentArticle.jsx';
import { PageDataContext } from './pageData.js';

export {
  SEO_ROUTES,
  PUBLIC_ROUTES,
  NOT_FOUND_META,
  PRIVATE_META,
  EMAIL_FORMAT_INDEX_META,
  emailFormatMeta,
  metaForPath,
  headElements,
} from '../seo/site.js';
export { llmsTxt, llmsFullTxt } from '../seo/llms.js';
export { CONTENT_PAGES } from '../content/registry.generated.js';

// Every content page body, eagerly: the server renders them all.
const BODIES = import.meta.glob('../content/pages/**/*.js', { eager: true });
const BODY_BY_PATH = new Map(Object.values(BODIES).map((m) => [m.default.meta.path, m.default]));

/** A content page's full object (for its structured data), or undefined. */
export function contentBody(path) {
  return BODY_BY_PATH.get(path);
}

const PAGES = {
  '/': Home,
  '/pricing': Pricing,
  '/product': Product,
  '/solutions': Solutions,
  '/about': About,
  '/press': Press,
  '/contact': Contact,
  '/privacy': Privacy,
  '/terms': Terms,
  '/blog': BlogIndex,
  '/email-format': EmailFormatIndex,
};

function pageFor(path) {
  if (!path) return NotFound;
  if (PAGES[path]) return PAGES[path];
  const body = BODY_BY_PATH.get(path);
  if (body) return () => <ContentArticle page={body} />;
  if (/^\/email-format\/[a-z0-9.-]+$/.test(path)) return EmailFormatPage;
  return NotFound;
}

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

/**
 * HTML for the page at `path`; null means the 404 page. `data` is what a
 * data-driven page renders from (the email-format pages); the prerender
 * embeds the same object in the HTML for the client's first render.
 */
export function render(path, data = null) {
  const Page = pageFor(path);
  const location = path || '/404';
  return renderToString(
    <Provider store={createAppStore()}>
      <PageDataContext.Provider value={data ? { path, data } : null}>
        <StaticRouter location={location}>
          <Frame>
            <Page />
          </Frame>
        </StaticRouter>
      </PageDataContext.Provider>
    </Provider>,
  );
}
