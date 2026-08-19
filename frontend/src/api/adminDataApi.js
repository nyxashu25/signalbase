import { adminBaseApi } from './adminBaseApi.js';

export const adminDataApi = adminBaseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminOverview: builder.query({
      query: () => '/overview',
      providesTags: ['AdminSummary'],
    }),
    getAdminUsage: builder.query({
      query: () => '/usage',
      providesTags: ['AdminSummary'],
    }),
    listAdminUsers: builder.query({
      query: (params) => ({ url: '/users', params }),
      providesTags: ['AdminUsers'],
    }),
    getAdminUserDetail: builder.query({
      query: (userId) => `/users/${userId}`,
      providesTags: ['AdminUsers'],
    }),
    suspendAdminUser: builder.mutation({
      query: (userId) => ({ url: `/users/${userId}/suspend`, method: 'POST' }),
      invalidatesTags: ['AdminUsers'],
    }),
    unsuspendAdminUser: builder.mutation({
      query: (userId) => ({ url: `/users/${userId}/unsuspend`, method: 'POST' }),
      invalidatesTags: ['AdminUsers'],
    }),
    addAdminUserCredits: builder.mutation({
      query: ({ userId, amount }) => ({
        url: `/users/${userId}/credits`,
        method: 'POST',
        body: { amount },
      }),
      invalidatesTags: ['AdminUsers'],
    }),
    getAdminBillingOverview: builder.query({
      query: () => '/billing/overview',
    }),
    listAdminTransactions: builder.query({
      query: (params) => ({ url: '/billing/transactions', params }),
    }),
  }),
});

export const {
  useGetAdminOverviewQuery,
  useGetAdminUsageQuery,
  useListAdminUsersQuery,
  useGetAdminUserDetailQuery,
  useSuspendAdminUserMutation,
  useUnsuspendAdminUserMutation,
  useAddAdminUserCreditsMutation,
  useGetAdminBillingOverviewQuery,
  useListAdminTransactionsQuery,
} = adminDataApi;
