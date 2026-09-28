import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/montserrat';
import '@fontsource-variable/montserrat/wght-italic.css';
import { store } from './store/index.js';
import { App, preloadRoute } from './App.jsx';
import { beginPrerenderHandoff } from './prerender/handoff.js';
import { PageDataContext, readEmbeddedPageData } from './prerender/pageData.js';
import './index.css';

const root = document.getElementById('root');
const pageData = readEmbeddedPageData();

function start() {
  if (root.firstElementChild) beginPrerenderHandoff();
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Provider store={store}>
        <PageDataContext.Provider value={pageData}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </PageDataContext.Provider>
      </Provider>
    </React.StrictMode>,
  );
}

/**
 * Run `fn` once the prerendered page has painted. Fetching and building the
 * live page is the biggest job of the load; begun before the browser has
 * shown the static markup (a warm cache, a slow GPU start), it holds the
 * reader's first sight of the page back by its whole length. Often the
 * paint has already happened by the time this module runs, and `fn` runs at
 * once. Hidden tabs don't paint, so a timeout stops the wait there.
 */
function afterFirstPaint(fn) {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    fn();
  };
  try {
    if (!PerformanceObserver.supportedEntryTypes?.includes('paint')) {
      run();
      return;
    }
    const observer = new PerformanceObserver((list) => {
      if (list.getEntries().length === 0) return;
      observer.disconnect();
      run();
    });
    observer.observe({ type: 'paint', buffered: true });
  } catch {
    run();
    return;
  }
  window.setTimeout(run, 1500);
}

// Marketing pages arrive prerendered (scripts/prerender.mjs), so the reader
// is already looking at the page. Load its chunks before the first render:
// React then replaces the static markup with the live page in one commit,
// instead of flashing the Suspense fallback in between.
const boot = () => preloadRoute(window.location.pathname).then(start, start);
if (root.firstElementChild) afterFirstPaint(boot);
else boot();
