import { baseApi } from './baseApi.js';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: builder.mutation({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    googleLogin: builder.mutation({
      query: (body) => ({ url: '/auth/google', method: 'POST', body }),
    }),
    verifyEmail: builder.mutation({
      query: (body) => ({ url: '/auth/verify-email', method: 'POST', body }),
    }),
    resendVerification: builder.mutation({
      query: (body) => ({ url: '/auth/resend-verification', method: 'POST', body }),
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
    forgotPassword: builder.mutation({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
    getInviteInfo: builder.query({
      query: (token) => `/auth/invite?token=${encodeURIComponent(token)}`,
    }),
    acceptInvite: builder.mutation({
      query: (body) => ({ url: '/auth/accept-invite', method: 'POST', body }),
    }),
    listMyWorkspaces: builder.query({
      query: () => '/auth/workspaces',
      transformResponse: (res) => res.workspaces,
      providesTags: ['Workspace'],
    }),
    switchWorkspace: builder.mutation({
      query: (body) => ({ url: '/auth/switch-workspace', method: 'POST', body }),
    }),
    updateProfile: builder.mutation({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
    }),
    updatePreferences: builder.mutation({
      query: (body) => ({ url: '/auth/me/preferences', method: 'PATCH', body }),
    }),
    changePassword: builder.mutation({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),
    completeTutorial: builder.mutation({
      query: () => ({ url: '/auth/tutorial-complete', method: 'POST' }),
      invalidatesTags: ['Onboarding'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useRefreshMutation,
  useLogoutMutation,
  useMeQuery,
  useCompleteTutorialMutation,
  useUpdateProfileMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetInviteInfoQuery,
  useAcceptInviteMutation,
  useListMyWorkspacesQuery,
  useSwitchWorkspaceMutation,
  useUpdatePreferencesMutation,
  useChangePasswordMutation,
} = authApi;
