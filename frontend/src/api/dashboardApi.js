import { baseApi } from './baseApi.js';

// Home-screen data. `getOnboarding` is the getting-started checklist; the
// server pays out any newly-earned reward as part of answering it, so the
// response's `justRewarded` is what useOnboardingRewards turns into toasts.
// Mutations that can complete a task invalidate 'Onboarding' so the next
// Home visit (and the sidebar card) catch up without a reload.
export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOnboarding: builder.query({
      query: () => '/dashboard/onboarding',
      providesTags: ['Onboarding'],
    }),
    getDashboardStats: builder.query({
      query: () => '/dashboard/stats',
      providesTags: ['Onboarding'],
    }),
  }),
});

export const { useGetOnboardingQuery, useGetDashboardStatsQuery } = dashboardApi;
