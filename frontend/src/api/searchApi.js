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
    }),
  }),
});

export const { useSearchCompaniesQuery, useSearchPeopleQuery, useGetCompanyDetailQuery } = searchApi;
