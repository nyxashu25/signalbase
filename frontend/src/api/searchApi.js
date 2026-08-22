import { baseApi } from './baseApi.js';

// fetchBaseQuery's default params handling doesn't repeat array values as
// repeated keys (which is what the backend's zod `stringArray` preprocessor
// expects) — build the query string explicitly instead.
export function toQueryString(params) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => qs.append(key, v));
    } else {
      qs.append(key, value);
    }
  }
  return qs.toString();
}

export const searchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchCompanies: builder.query({
      query: (filters) => `/search/companies?${toQueryString(filters)}`,
    }),
    searchPeople: builder.query({
      query: (filters) => `/search/people?${toQueryString(filters)}`,
    }),
    getCompanyDetail: builder.query({
      query: (id) => `/search/companies/${id}`,
      transformResponse: (res) => res.company,
      // Only the first view per workspace actually charges (see
      // searchService.getCompanyDetail) — viewCost is 0 on every repeat
      // view, so this only triggers a billing refetch when a charge
      // really happened.
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        if (data.viewCost > 0) {
          dispatch(baseApi.util.invalidateTags(['BillingSummary']));
        }
      },
    }),
    listSavedSearches: builder.query({
      query: (type) => `/search/saved${type ? `?type=${type}` : ''}`,
      transformResponse: (res) => res.savedSearches,
      providesTags: ['SavedSearches'],
    }),
    createSavedSearch: builder.mutation({
      query: (body) => ({ url: '/search/saved', method: 'POST', body }),
      transformResponse: (res) => res.savedSearch,
      invalidatesTags: ['SavedSearches', 'Onboarding'],
    }),
    deleteSavedSearch: builder.mutation({
      query: (id) => ({ url: `/search/saved/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SavedSearches'],
    }),
  }),
});

export const {
  useSearchCompaniesQuery,
  useSearchPeopleQuery,
  useGetCompanyDetailQuery,
  useListSavedSearchesQuery,
  useCreateSavedSearchMutation,
  useDeleteSavedSearchMutation,
} = searchApi;
