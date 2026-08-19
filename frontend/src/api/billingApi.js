import { baseApi } from './baseApi.js';

export const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBillingSummary: builder.query({
      query: () => '/billing/summary',
    }),
    listBillingPackages: builder.query({
      query: () => '/billing/packages',
      transformResponse: (res) => res.packages,
    }),
    createCheckoutSession: builder.mutation({
      query: (body) => ({ url: '/billing/checkout-session', method: 'POST', body }),
    }),
    verifyRazorpayPayment: builder.mutation({
      query: (body) => ({ url: '/billing/razorpay/verify', method: 'POST', body }),
    }),
    listBillingTransactions: builder.query({
      query: ({ page, pageSize }) => `/billing/transactions?page=${page}&pageSize=${pageSize}`,
    }),
  }),
});

export const {
  useGetBillingSummaryQuery,
  useListBillingPackagesQuery,
  useCreateCheckoutSessionMutation,
  useVerifyRazorpayPaymentMutation,
  useListBillingTransactionsQuery,
} = billingApi;
