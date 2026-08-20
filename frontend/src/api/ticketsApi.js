import { baseApi } from './baseApi.js';

export const ticketsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTicketSubjects: builder.query({
      query: () => '/tickets/subjects',
    }),
    listTickets: builder.query({
      query: (params) => ({ url: '/tickets', params }),
      providesTags: ['Tickets'],
    }),
    getTicket: builder.query({
      query: (id) => `/tickets/${id}`,
      providesTags: (result, error, id) => [{ type: 'Ticket', id }],
    }),
    createTicket: builder.mutation({
      query: (body) => ({ url: '/tickets', method: 'POST', body }),
      invalidatesTags: ['Tickets'],
    }),
    replyToTicket: builder.mutation({
      query: ({ id, body }) => ({ url: `/tickets/${id}/messages`, method: 'POST', body: { body } }),
      invalidatesTags: (result, error, { id }) => ['Tickets', { type: 'Ticket', id }],
    }),
  }),
});

export const {
  useGetTicketSubjectsQuery,
  useListTicketsQuery,
  useGetTicketQuery,
  useCreateTicketMutation,
  useReplyToTicketMutation,
} = ticketsApi;
