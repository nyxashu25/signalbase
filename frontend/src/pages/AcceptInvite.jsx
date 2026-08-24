import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGetInviteInfoQuery, useAcceptInviteMutation } from '../api/authApi.js';
import { setSession } from '../store/authSlice.js';
import { Logo } from '../components/Logo.jsx';
import { MarketingNav } from '../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../components/marketing/MarketingFooter.jsx';

const MIN_LENGTH = 8;

// Landing page for the emailed (or copied) workspace-invite link. The token
// proves control of the invited inbox, so an existing account joins with one
// click and a new one only needs a name + password — no separate signup.
export function AcceptInvite() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: info, isLoading, error: infoError } = useGetInviteInfoQuery(token, { skip: !token });
  const [acceptInvite, acceptState] = useAcceptInviteMutation();
  const [form, setForm] = useState({ name: '', password: '' });

  async function handleAccept(e) {
    e?.preventDefault();
    const body = info.accountExists ? { token } : { token, ...form };
    const result = await acceptInvite(body);
    if (result.data) {
      dispatch(setSession(result.data));
      navigate('/app', { replace: true });
    }
  }

  const error =
    (!token && 'Missing invite link') ||
    (infoError && (infoError.data?.error?.message || 'Invalid or expired invite link')) ||
    (acceptState.error &&
      (acceptState.error.data?.error?.message || 'Could not accept the invite. Please try again.'));

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <MarketingNav />
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-7 shadow-dp">
          <Logo className="h-9" />

          {!token || infoError ? (
            <>
              <p className="mt-4 text-sm text-red-600">{error}</p>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Invites expire after 7 days and can be revoked — ask the person who invited you to
                send a fresh one.
              </p>
              <Link to="/login" className="mt-4 block text-sm font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </>
          ) : isLoading || !info ? (
            <p className="mt-4 text-sm text-text-muted">Checking your invite…</p>
          ) : (
            <>
              <p className="mt-3 text-sm font-semibold text-text">
                Join {info.workspaceName} on DataPit
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                <strong className="text-text">{info.inviterName}</strong> invited{' '}
                <strong className="text-text">{info.email}</strong> to join as{' '}
                {info.role === 'ADMIN' ? 'an admin' : 'a member'}.
              </p>

              {info.accountExists ? (
                <>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    You already have a DataPit account with this email — accepting adds{' '}
                    {info.workspaceName} to it. You can switch workspaces any time from the account
                    menu.
                  </p>
                  {acceptState.error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                  <button
                    type="button"
                    disabled={acceptState.isLoading}
                    onClick={handleAccept}
                    className="mt-5 w-full rounded-md bg-gradient-action px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {acceptState.isLoading ? 'Joining…' : `Accept & open ${info.workspaceName}`}
                  </button>
                </>
              ) : (
                <form className="mt-5 flex flex-col gap-3" onSubmit={handleAccept}>
                  <label className="flex flex-col gap-1 text-sm text-text-muted">
                    Your name
                    <input
                      type="text"
                      required
                      autoFocus
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="h-[46px] rounded-md border border-border bg-surface-elevated px-3.5 text-sm text-text outline-none focus:border-focus focus:shadow-[0_0_0_3px_rgba(197,82,255,0.18)]"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-text-muted">
                    Choose a password
                    <input
                      type="password"
                      required
                      minLength={MIN_LENGTH}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="h-[46px] rounded-md border border-border bg-surface-elevated px-3.5 text-sm text-text outline-none focus:border-focus focus:shadow-[0_0_0_3px_rgba(197,82,255,0.18)]"
                    />
                  </label>
                  {acceptState.error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={acceptState.isLoading || !form.name || form.password.length < MIN_LENGTH}
                    className="mt-2 rounded-md bg-gradient-action px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {acceptState.isLoading ? 'Creating your account…' : 'Create account & join'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
