import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useVerifyEmailMutation, useResendVerificationMutation } from '../api/authApi.js';
import { setSession } from '../store/authSlice.js';
import { Logo } from '../components/Logo.jsx';
import { MarketingNav } from '../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../components/marketing/MarketingFooter.jsx';

export function VerifyEmail() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [verifyEmail, verifyState] = useVerifyEmailMutation();
  const [resendVerification, resendState] = useResendVerificationMutation();
  const [resendEmail, setResendEmail] = useState('');
  // StrictMode/dev double-invokes effects — this guards against firing the
  // (rate-limited, one-shot) verify call twice for the same mount.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    (async () => {
      const result = await verifyEmail({ token });
      if (result.data) {
        dispatch(setSession(result.data));
        navigate('/app', { replace: true });
      }
    })();
  }, [token, verifyEmail, dispatch, navigate]);

  const error = token
    ? (verifyState.error?.data?.error?.message ?? 'Invalid or expired verification link')
    : 'Missing verification link';
  // Covers the brief window between a successful verify and the navigate()
  // that follows it, not just the uninitialized/loading states — a success
  // should never flash the error panel before redirecting.
  const stillConfirming = token && !verifyState.isError;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <MarketingNav />
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-7 shadow-dp">
          <Logo className="h-9" />

          {stillConfirming ? (
            <p className="mt-4 text-sm text-text-muted">Confirming your email…</p>
          ) : (
            <>
              <p className="mt-4 text-sm text-red-600">{error}</p>
              <p className="mt-4 text-sm text-text-muted">
                Enter your email and we&rsquo;ll send a fresh confirm link.
              </p>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-3 h-[46px] w-full rounded-md border border-border bg-surface-elevated px-3.5 text-sm text-text outline-none focus:border-focus focus:shadow-[0_0_0_3px_rgba(197,82,255,0.18)]"
              />
              <button
                type="button"
                disabled={!resendEmail || resendState.isLoading}
                className="mt-3 w-full rounded-md bg-gradient-action px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => resendVerification({ email: resendEmail })}
              >
                {resendState.isSuccess
                  ? 'Sent — check your inbox'
                  : resendState.isLoading
                    ? 'Sending…'
                    : 'Resend verification email'}
              </button>
              <Link to="/login" className="mt-4 block text-sm font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
