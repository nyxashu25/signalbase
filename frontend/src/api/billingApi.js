import { baseApi } from './baseApi.js';

export const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBillingSummary: builder.query({
      query: () => '/billing/summary',
    }),
    createCheckoutSession: builder.mutation({
      query: (body) => ({ url: '/billing/checkout-session', method: 'POST', body }),
    }),
    listBillingTransactions: builder.query({
      query: ({ page, pageSize }) => `/billing/transactions?page=${page}&pageSize=${pageSize}`,
    }),
  }),
});

export const {
  useGetBillingSummaryQuery,
  useCreateCheckoutSessionMutation,
  useListBillingTransactionsQuery,
} = billingApi;
