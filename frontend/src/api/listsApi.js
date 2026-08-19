import { baseApi } from './baseApi.js';

export const listsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listLists: builder.query({
      query: () => '/lists',
      transformResponse: (res) => res.lists,
      providesTags: ['Lists'],
    }),
    getList: builder.query({
      query: (id) => `/lists/${id}`,
      transformResponse: (res) => res.list,
      providesTags: (result, error, id) => [{ type: 'Lists', id }],
    }),
    createList: builder.mutation({
      query: (body) => ({ url: '/lists', method: 'POST', body }),
      invalidatesTags: ['Lists'],
    }),
    deleteList: builder.mutation({
      query: (id) => ({ url: `/lists/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Lists'],
    }),
    addListItem: builder.mutation({
      query: ({ listId, contactId, companyId }) => ({
        url: `/lists/${listId}/items`,
        method: 'POST',
        body: contactId ? { contactId } : { companyId },
      }),
      invalidatesTags: (result, error, { listId }) => ['Lists', { type: 'Lists', id: listId }],
    }),
    removeListItem: builder.mutation({
      query: ({ listId, itemId }) => ({ url: `/lists/${listId}/items/${itemId}`, method: 'DELETE' }),
      invalidatesTags: (result, error, { listId }) => [{ type: 'Lists', id: listId }],
    }),
  }),
});

export const {
  useListListsQuery,
  useGetListQuery,
  useCreateListMutation,
  useDeleteListMutation,
  useAddListItemMutation,
  useRemoveListItemMutation,
} = listsApi;
