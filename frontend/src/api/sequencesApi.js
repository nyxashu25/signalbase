import { baseApi } from './baseApi.js';

export const sequencesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listSequences: builder.query({
      query: () => '/sequences',
      transformResponse: (res) => res.sequences,
      providesTags: ['Sequences'],
    }),
    getSequence: builder.query({
      query: (id) => `/sequences/${id}`,
      transformResponse: (res) => res.sequence,
      providesTags: (result, error, id) => [{ type: 'Sequences', id }],
    }),
    getSequencesAnalytics: builder.query({
      query: () => '/sequences/analytics',
      transformResponse: (res) => res.analytics,
      providesTags: ['Sequences'],
    }),
    getSequenceAnalytics: builder.query({
      query: (id) => `/sequences/${id}/analytics`,
      transformResponse: (res) => res.analytics,
      providesTags: (result, error, id) => [{ type: 'Sequences', id: `${id}-analytics` }],
    }),
    createSequence: builder.mutation({
      query: (body) => ({ url: '/sequences', method: 'POST', body }),
      invalidatesTags: ['Sequences', 'Onboarding'],
    }),
    activateSequence: builder.mutation({
      query: (id) => ({ url: `/sequences/${id}/activate`, method: 'POST' }),
      invalidatesTags: (result, error, id) => ['Sequences', { type: 'Sequences', id }, 'Onboarding'],
    }),
    enrollContact: builder.mutation({
      query: ({ sequenceId, contactId }) => ({
        url: `/sequences/${sequenceId}/enrollments`,
        method: 'POST',
        body: { contactId },
      }),
      invalidatesTags: (result, error, { sequenceId }) => [
        { type: 'Sequences', id: sequenceId },
        'BillingSummary',
        'Onboarding',
      ],
    }),
    pauseEnrollment: builder.mutation({
      query: ({ enrollmentId }) => ({
        url: `/sequences/enrollments/${enrollmentId}/pause`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { sequenceId }) => [{ type: 'Sequences', id: sequenceId }],
    }),
    resumeEnrollment: builder.mutation({
      query: ({ enrollmentId }) => ({
        url: `/sequences/enrollments/${enrollmentId}/resume`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { sequenceId }) => [{ type: 'Sequences', id: sequenceId }],
    }),
    unenrollContact: builder.mutation({
      query: ({ enrollmentId }) => ({
        url: `/sequences/enrollments/${enrollmentId}/unenroll`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { sequenceId }) => [{ type: 'Sequences', id: sequenceId }],
    }),
  }),
});

export const {
  useListSequencesQuery,
  useGetSequenceQuery,
  useGetSequenceAnalyticsQuery,
  useGetSequencesAnalyticsQuery,
  useCreateSequenceMutation,
  useActivateSequenceMutation,
  useEnrollContactMutation,
  usePauseEnrollmentMutation,
  useResumeEnrollmentMutation,
  useUnenrollContactMutation,
} = sequencesApi;
