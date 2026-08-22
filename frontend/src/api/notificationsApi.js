import { baseApi } from './baseApi.js';

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    unsubscribe: builder.mutation({
      query: (body) => ({ url: '/notifications/unsubscribe', method: 'POST', body }),
    }),
  }),
});

export const { useUnsubscribeMutation } = notificationsApi;
