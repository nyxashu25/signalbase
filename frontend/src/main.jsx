import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/montserrat';
import '@fontsource-variable/montserrat/wght-italic.css';
import { store } from './store/index.js';
import { App, preloadRoute } from './App.jsx';
import './index.css';

function start() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </React.StrictMode>,
  );
}

// Marketing pages arrive prerendered (scripts/prerender.mjs), so the reader
// is already looking at the page. Load its chunk before the first render:
// React then replaces the static markup with the live page in one commit,
// instead of flashing the Suspense fallback in between.
preloadRoute(window.location.pathname).then(start, start);
