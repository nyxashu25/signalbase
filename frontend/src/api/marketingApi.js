import { baseApi } from './baseApi.js';

// A 429 from the public tools carries Retry-After (seconds); keep it on the
// error so the page can say how long to wait instead of a bare "slow down".
function withRetryAfter(response, meta) {
  const seconds = Number(meta?.response?.headers?.get('Retry-After'));
  return { ...response, retryAfter: Number.isFinite(seconds) && seconds > 0 ? seconds : null };
}

export const marketingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    submitContactRequest: builder.mutation({
      query: (body) => ({ url: '/contact', method: 'POST', body }),
    }),

    // Free tools (backend/src/routes/publicTools.js) — no auth, IP rate limited.
    verifyEmailPublic: builder.mutation({
      query: ({ email }) => ({
        url: '/public/tools/verify-email',
        method: 'POST',
        body: { email },
      }),
      transformErrorResponse: withRetryAfter,
    }),
    findEmailPublic: builder.mutation({
      query: ({ firstName, lastName, domain }) => ({
        url: '/public/tools/find-email',
        method: 'POST',
        body: { firstName, lastName, domain },
      }),
      transformErrorResponse: withRetryAfter,
    }),

    // Company email formats: aggregate pattern counts only.
    getEmailFormats: builder.query({
      query: () => '/public/email-formats',
    }),
    getEmailFormat: builder.query({
      query: (domain) => `/public/email-formats/${encodeURIComponent(domain)}`,
    }),
  }),
});

export const {
  useSubmitContactRequestMutation,
  useVerifyEmailPublicMutation,
  useFindEmailPublicMutation,
  useGetEmailFormatsQuery,
  useGetEmailFormatQuery,
} = marketingApi;
