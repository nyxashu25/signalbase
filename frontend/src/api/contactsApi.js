import { baseApi } from './baseApi.js';

export const contactsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    revealContact: builder.mutation({
      query: ({ contactId, idempotencyKey }) => ({
        url: `/contacts/${contactId}/reveal`,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    }),
  }),
});

export const { useRevealContactMutation } = contactsApi;
