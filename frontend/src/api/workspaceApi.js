import { baseApi } from './baseApi.js';

export const workspaceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listWorkspaceMembers: builder.query({
      query: () => '/workspace/members',
      transformResponse: (res) => res.members,
      providesTags: ['Workspace'],
    }),
    renameWorkspace: builder.mutation({
      query: (body) => ({ url: '/workspace', method: 'PATCH', body }),
      transformResponse: (res) => res.workspace,
      invalidatesTags: ['Workspace'],
    }),
  }),
});

export const { useListWorkspaceMembersQuery, useRenameWorkspaceMutation } = workspaceApi;
