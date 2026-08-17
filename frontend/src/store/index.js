import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../api/baseApi.js';

// Feature slices (auth, etc.) land here as they're built in later phases.
export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});
