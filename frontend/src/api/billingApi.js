import { baseApi } from './baseApi.js';

export const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBillingSummary: builder.query({
      query: () => '/billing/summary',
    }),
    createCheckoutSession: builder.mutation({
      query: (body) => ({ url: '/billing/checkout-session', method: 'POST', body }),
    }),
  }),
});

export const { useGetBillingSummaryQuery, useCreateCheckoutSessionMutation } = billingApi;
