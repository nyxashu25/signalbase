import { baseApi } from './baseApi.js';

export const marketingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    submitContactRequest: builder.mutation({
      query: (body) => ({ url: '/contact', method: 'POST', body }),
    }),
  }),
});

export const { useSubmitContactRequestMutation } = marketingApi;
