import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPasswordMutation } from '../api/authApi.js';
import { Logo } from '../components/Logo.jsx';
import { MarketingNav } from '../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../components/marketing/MarketingFooter.jsx';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [forgotPassword, { isLoading, isSuccess, error }] = useForgotPasswordMutation();

  async function handleSubmit(e) {
    e.preventDefault();
    await forgotPassword({ email });
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <MarketingNav />
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-7 shadow-dp">
          <Logo className="h-9" />

          {isSuccess ? (
            <>
              <p className="mt-3 text-sm font-semibold text-text">Check your email</p>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                If an account exists for <strong className="text-text">{email}</strong>, we&rsquo;ve
                sent it a link to choose a new password. The link works once and expires in an hour.
              </p>
              <Link to="/login" className="mt-5 block text-sm font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-text-muted">Reset your password</p>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                Enter your account email and we&rsquo;ll send you a link to choose a new one.
              </p>
              <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-1 text-sm text-text-muted">
                  Email
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-[46px] rounded-md border border-border bg-surface-elevated px-3.5 text-sm text-text outline-none focus:border-focus focus:shadow-[0_0_0_3px_rgba(197,82,255,0.18)]"
                  />
                </label>
                {error && (
                  <p className="text-sm text-red-600">
                    {error.data?.error?.message || 'Something went wrong. Please try again.'}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="mt-2 rounded-md bg-gradient-action px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
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
