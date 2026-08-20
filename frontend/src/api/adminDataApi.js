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
    updateAdminUserPlan: builder.mutation({
      query: ({ userId, plan }) => ({
        url: `/users/${userId}/plan`,
        method: 'PUT',
        body: { plan },
      }),
      invalidatesTags: ['AdminUsers'],
    }),
    getAdminBillingOverview: builder.query({
      query: () => '/billing/overview',
    }),
    listAdminTransactions: builder.query({
      query: (params) => ({ url: '/billing/transactions', params }),
    }),
    getAdminStripeSettings: builder.query({
      query: () => '/settings/stripe',
      providesTags: ['StripeSettings'],
    }),
    saveAdminStripeSettings: builder.mutation({
      query: (body) => ({ url: '/settings/stripe', method: 'PUT', body }),
      invalidatesTags: ['StripeSettings'],
    }),
    listDatabaseImports: builder.query({
      query: () => '/database-imports',
      providesTags: ['DatabaseImports'],
    }),
    uploadDatabaseImport: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: '/database-imports', method: 'POST', body: formData };
      },
      invalidatesTags: ['DatabaseImports'],
    }),
    approveDatabaseImport: builder.mutation({
      query: (batchId) => ({ url: `/database-imports/${batchId}/approve`, method: 'POST' }),
      invalidatesTags: ['DatabaseImports'],
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
  useUpdateAdminUserPlanMutation,
  useGetAdminBillingOverviewQuery,
  useListAdminTransactionsQuery,
  useGetAdminStripeSettingsQuery,
  useSaveAdminStripeSettingsMutation,
  useListDatabaseImportsQuery,
  useUploadDatabaseImportMutation,
  useApproveDatabaseImportMutation,
} = adminDataApi;
