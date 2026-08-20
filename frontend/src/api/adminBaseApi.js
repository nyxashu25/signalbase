import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Separate RTK Query instance (own reducerPath, own auth header source) —
// never shares a cache or a token with `baseApi`. See store/adminAuthSlice.js.
export const adminBaseApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1/admin',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().adminAuth.accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['AdminUsers', 'AdminSummary', 'StripeSettings', 'DatabaseImports'],
  endpoints: () => ({}),
});
