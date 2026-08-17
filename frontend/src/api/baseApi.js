import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Single RTK Query API slice, injected into as each domain (auth, search,
// companies, lists, sequences, billing) is built — see ARCHITECTURE.md §7.
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    credentials: 'include',
  }),
  tagTypes: [],
  endpoints: () => ({}),
});
