import { baseApi } from './baseApi.js';

export const workspaceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listWorkspaceMembers: builder.query({
      query: () => '/workspace/members',
      transformResponse: (res) => res.members,
      providesTags: ['Workspace'],
    }),
    listInvites: builder.query({
      query: () => '/workspace/invites',
      transformResponse: (res) => res.invites,
      providesTags: ['Workspace'],
    }),
    createInvite: builder.mutation({
      query: (body) => ({ url: '/workspace/invites', method: 'POST', body }),
      invalidatesTags: ['Workspace'],
    }),
    revokeInvite: builder.mutation({
      query: (id) => ({ url: `/workspace/invites/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Workspace'],
    }),
    renameWorkspace: builder.mutation({
      query: (body) => ({ url: '/workspace', method: 'PATCH', body }),
      transformResponse: (res) => res.workspace,
      invalidatesTags: ['Workspace'],
    }),
  }),
});

export const {
  useListWorkspaceMembersQuery,
  useRenameWorkspaceMutation,
  useListInvitesQuery,
  useCreateInviteMutation,
  useRevokeInviteMutation,
} = workspaceApi;
