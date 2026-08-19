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
    createSequence: builder.mutation({
      query: (body) => ({ url: '/sequences', method: 'POST', body }),
      invalidatesTags: ['Sequences'],
    }),
    activateSequence: builder.mutation({
      query: (id) => ({ url: `/sequences/${id}/activate`, method: 'POST' }),
      invalidatesTags: (result, error, id) => ['Sequences', { type: 'Sequences', id }],
    }),
    enrollContact: builder.mutation({
      query: ({ sequenceId, contactId }) => ({
        url: `/sequences/${sequenceId}/enrollments`,
        method: 'POST',
        body: { contactId },
      }),
      invalidatesTags: (result, error, { sequenceId }) => [{ type: 'Sequences', id: sequenceId }],
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
  useCreateSequenceMutation,
  useActivateSequenceMutation,
  useEnrollContactMutation,
  usePauseEnrollmentMutation,
  useResumeEnrollmentMutation,
  useUnenrollContactMutation,
} = sequencesApi;
