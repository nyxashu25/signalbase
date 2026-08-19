import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../api/baseApi.js';
import { adminBaseApi } from '../api/adminBaseApi.js';
import authReducer from './authSlice.js';
import adminAuthReducer from './adminAuthSlice.js';

// Factory (not just a singleton) so tests can create an isolated store with
// preloaded state (e.g. already-authenticated) instead of sharing — and
// fighting over — one global instance.
export function createAppStore(preloadedState) {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      [adminBaseApi.reducerPath]: adminBaseApi.reducer,
      auth: authReducer,
      adminAuth: adminAuthReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware, adminBaseApi.middleware),
    preloadedState,
  });
}

export const store = createAppStore();
