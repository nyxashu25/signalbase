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

// Marketing pages arrive prerendered (scripts/prerender.mjs), so the reader
// is already looking at the page. Load its chunk before the first render:
// React then replaces the static markup with the live page in one commit,
// instead of flashing the Suspense fallback in between.
preloadRoute(window.location.pathname).then(start, start);
