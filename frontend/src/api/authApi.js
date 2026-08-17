import { baseApi } from './baseApi.js';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: builder.mutation({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    refresh: builder.mutation({
      query: () => ({ url: '/auth/refresh', method: 'POST' }),
    }),
    logout: builder.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    me: builder.query({
      query: () => '/auth/me',
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshMutation,
  useLogoutMutation,
  useMeQuery,
} = authApi;
