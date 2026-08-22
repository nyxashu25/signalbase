import { useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useUnsubscribeMutation } from '../api/notificationsApi.js';
import { Logo } from '../components/Logo.jsx';
import { MarketingNav } from '../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../components/marketing/MarketingFooter.jsx';

export function Unsubscribe() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  const [unsubscribe, state] = useUnsubscribeMutation();
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    unsubscribe({ token });
  }, [token, unsubscribe]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <MarketingNav />
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-7 shadow-dp text-center">
          <Logo className="mx-auto h-9" />

          {!token ? (
            <p className="mt-4 text-sm text-red-600">Missing unsubscribe link.</p>
          ) : state.isSuccess ? (
            <p className="mt-4 text-sm text-text-muted">
              You&rsquo;re unsubscribed from DataPit promotional emails. You&rsquo;ll still receive
              account and billing notifications.
            </p>
          ) : state.isError ? (
            <p className="mt-4 text-sm text-red-600">
              {state.error?.data?.error?.message ?? 'This unsubscribe link is invalid.'}
            </p>
          ) : (
            <p className="mt-4 text-sm text-text-muted">Unsubscribing…</p>
          )}

          <Link to="/" className="mt-5 block text-sm font-medium text-primary hover:underline">
            Back to DataPit
          </Link>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
