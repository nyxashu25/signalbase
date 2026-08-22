import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Single RTK Query API slice, injected into as each domain (auth, search,
// companies, lists, sequences, billing) is built — see ARCHITECTURE.md §7.
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    // Sends the httpOnly refresh-token cookie on same-origin requests; the
    // access token below is attached separately since it lives in Redux,
    // not a cookie.
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Lists', 'Sequences', 'BillingSummary', 'Tickets', 'Ticket', 'SavedSearches', 'Onboarding', 'Workspace'],
  endpoints: () => ({}),
});
