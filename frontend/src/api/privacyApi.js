import { baseApi } from './baseApi.js';

export const privacyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    privacyOptOut: builder.mutation({
      query: (body) => ({ url: '/privacy/opt-out', method: 'POST', body }),
    }),
  }),
});

export const { usePrivacyOptOutMutation } = privacyApi;
