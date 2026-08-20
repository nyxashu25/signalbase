import { baseApi } from './baseApi.js';

export const toolsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    verifyEmail: builder.mutation({
      query: (email) => ({ url: '/tools/verify-email', method: 'POST', body: { email } }),
    }),
  }),
});

export const { useVerifyEmailMutation } = toolsApi;
