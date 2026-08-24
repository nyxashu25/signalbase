import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useResetPasswordMutation } from '../api/authApi.js';
import { Logo } from '../components/Logo.jsx';
import { MarketingNav } from '../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../components/marketing/MarketingFooter.jsx';

const MIN_LENGTH = 8;

export function ResetPassword() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  const [form, setForm] = useState({ next: '', confirm: '' });
  const [resetPassword, { isLoading, isSuccess, error }] = useResetPasswordMutation();

  const mismatch = form.confirm.length > 0 && form.next !== form.confirm;
  const canSubmit = token && form.next.length >= MIN_LENGTH && form.next === form.confirm;

  async function handleSubmit(e) {
    e.preventDefault();
    await resetPassword({ token, newPassword: form.next });
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <MarketingNav />
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-7 shadow-dp">
          <Logo className="h-9" />

          {isSuccess ? (
            <>
              <p className="mt-3 text-sm font-semibold text-text">Password changed</p>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Your new password is set. Sign in with it to get back to your workspace.
              </p>
              <Link
                to="/login"
                className="mt-5 inline-block rounded-md bg-gradient-action px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px"
              >
                Sign in
              </Link>
            </>
          ) : !token ? (
            <>
              <p className="mt-4 text-sm text-red-600">Missing reset link</p>
              <Link to="/forgot-password" className="mt-4 block text-sm font-medium text-primary hover:underline">
                Request a new reset link
              </Link>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-text-muted">Choose a new password</p>
              <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-1 text-sm text-text-muted">
                  New password
                  <input
                    type="password"
                    required
                    autoFocus
                    minLength={MIN_LENGTH}
                    autoComplete="new-password"
                    value={form.next}
                    onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
                    className="h-[46px] rounded-md border border-border bg-surface-elevated px-3.5 text-sm text-text outline-none focus:border-focus focus:shadow-[0_0_0_3px_rgba(197,82,255,0.18)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-text-muted">
                  Confirm new password
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={form.confirm}
                    onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                    className="h-[46px] rounded-md border border-border bg-surface-elevated px-3.5 text-sm text-text outline-none focus:border-focus focus:shadow-[0_0_0_3px_rgba(197,82,255,0.18)]"
                  />
                </label>
                {mismatch && <p className="text-sm text-red-600">Passwords don&rsquo;t match.</p>}
                {error && (
                  <p className="text-sm text-red-600">
                    {error.data?.error?.message || 'Could not reset the password. Please try again.'}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !canSubmit}
                  className="mt-2 rounded-md bg-gradient-action px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Saving…' : 'Set new password'}
                </button>
              </form>
              <p className="mt-4 text-xs text-text-muted">
                At least {MIN_LENGTH} characters. Link expired?{' '}
                <Link to="/forgot-password" className="font-medium text-primary hover:underline">
                  Request a new one
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
