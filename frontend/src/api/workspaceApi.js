import { baseApi } from './baseApi.js';

export const workspaceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listWorkspaceMembers: builder.query({
      query: () => '/workspace/members',
      // { members, seats: { total, used, members, pendingInvites, plan } }
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
    changeMemberRole: builder.mutation({
      query: ({ userId, role }) => ({
        url: `/workspace/members/${userId}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: ['Workspace'],
    }),
    getWorkspaceProfile: builder.query({
      query: () => '/workspace',
      transformResponse: (res) => res.workspace, // { id, name, plan, motto, logoUrl }
      providesTags: ['Workspace'],
    }),
    updateWorkspace: builder.mutation({
      // { name, motto } — branding, free on every plan.
      query: (body) => ({ url: '/workspace', method: 'PATCH', body }),
      transformResponse: (res) => res.workspace,
      invalidatesTags: ['Workspace'],
    }),
    uploadWorkspaceLogo: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append('logo', file);
        return { url: '/workspace/logo', method: 'POST', body: formData };
      },
      transformResponse: (res) => res.workspace,
      invalidatesTags: ['Workspace'],
    }),
    removeWorkspaceLogo: builder.mutation({
      query: () => ({ url: '/workspace/logo', method: 'DELETE' }),
      transformResponse: (res) => res.workspace,
      invalidatesTags: ['Workspace'],
    }),
  }),
});

export const {
  useListWorkspaceMembersQuery,
  useGetWorkspaceProfileQuery,
  useUpdateWorkspaceMutation,
  useUploadWorkspaceLogoMutation,
  useRemoveWorkspaceLogoMutation,
  useListInvitesQuery,
  useCreateInviteMutation,
  useRevokeInviteMutation,
  useChangeMemberRoleMutation,
} = workspaceApi;
