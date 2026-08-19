import { adminBaseApi } from './adminBaseApi.js';

export const adminAuthApi = adminBaseApi.injectEndpoints({
  endpoints: (builder) => ({
    adminLogin: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
  }),
});

export const { useAdminLoginMutation } = adminAuthApi;
