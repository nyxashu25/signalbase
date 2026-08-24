import { baseApi } from './baseApi.js';

export const apiKeysApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listApiKeys: builder.query({
      query: () => '/api-keys',
      transformResponse: (res) => res.keys,
      providesTags: ['ApiKeys'],
    }),
    createApiKey: builder.mutation({
      // Response includes `key` — the full secret, returned exactly once.
      query: (body) => ({ url: '/api-keys', method: 'POST', body }),
      invalidatesTags: ['ApiKeys'],
    }),
    revokeApiKey: builder.mutation({
      query: (id) => ({ url: `/api-keys/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ApiKeys'],
    }),
  }),
});

export const { useListApiKeysQuery, useCreateApiKeyMutation, useRevokeApiKeyMutation } = apiKeysApi;
