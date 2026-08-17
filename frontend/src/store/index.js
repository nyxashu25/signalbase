import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../api/baseApi.js';
import authReducer from './authSlice.js';

// Factory (not just a singleton) so tests can create an isolated store with
// preloaded state (e.g. already-authenticated) instead of sharing — and
// fighting over — one global instance.
export function createAppStore(preloadedState) {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    preloadedState,
  });
}

export const store = createAppStore();
