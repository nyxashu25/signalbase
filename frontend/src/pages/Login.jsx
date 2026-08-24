import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginMutation,
  useResendVerificationMutation,
} from '../api/authApi.js';
import { setSession } from '../store/authSlice.js';
import { Logo } from '../components/Logo.jsx';
import { GoogleSignInButton } from '../components/GoogleSignInButton.jsx';
import { MarketingNav } from '../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../components/marketing/MarketingFooter.jsx';

export function Login() {
  // Marketing "Start free" CTAs link here with ?mode=register so they land
  // straight on the create-workspace form instead of Sign in — a query
  // param (not router state) so it also works from a full page load/refresh.
  const location = useLocation();
  const initialMode =
    new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ email: '', password: '', name: '', orgName: '' });
  const [googleScriptError, setGoogleScriptError] = useState(null);
  // Set once register() responds with pendingVerification — swaps the form
  // for a "check your email" panel instead of navigating anywhere, since
  // there's no session to log into yet (see authService.register).
  const [pendingEmail, setPendingEmail] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const [googleLogin, googleLoginState] = useGoogleLoginMutation();
  const [resendVerification, resendState] = useResendVerificationMutation();
  const { isLoading } = mode === 'login' ? loginState : registerState;
  const error =
    (loginState.error ?? registerState.error ?? googleLoginState.error)?.data?.error?.message ??
    googleScriptError;
  // authService.login throws this exact message for an unconfirmed account —
  // matched here (not a status-code check alone) so a resend option only
  // shows up for the specific case it's useful for, not every 403.
  const needsVerification = /verify your email/i.test(error ?? '');

  async function handleSubmit(e) {
    e.preventDefault();
    const action = mode === 'login' ? login : register;
    const body =
      mode === 'login'
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, name: form.name, orgName: form.orgName };

    const result = await action(body);
    if (result.data?.pendingVerification) {
      setPendingEmail(result.data.email);
      return;
    }
    if (result.data) {
      dispatch(setSession(result.data));
      navigate('/app', { replace: true });
    }
  }

  async function handleGoogleCredential(credential) {
    const result = await googleLogin({ credential });
    if (result.data) {
      dispatch(setSession(result.data));
      navigate('/app', { replace: true });
    }
  }

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <MarketingNav />
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-7 shadow-dp">
          <Logo className="h-9" />

          {pendingEmail ? (
            <>
              <p className="mt-3 text-sm text-text-muted">Check your email to confirm your account</p>
              <p className="mt-4 text-sm leading-relaxed text-text-muted">
                We sent a confirm link to <strong className="text-text">{pendingEmail}</strong>.
                Click it to activate your workspace and sign in.
              </p>
              <button
                type="button"
                disabled={resendState.isLoading}
                className="mt-5 text-sm font-medium text-primary hover:underline disabled:opacity-50"
                onClick={() => resendVerification({ email: pendingEmail })}
              >
                {resendState.isSuccess
                  ? "Sent — check your inbox"
                  : resendState.isLoading
                    ? 'Sending…'
                    : "Didn't get it? Resend the email"}
              </button>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-text-muted">
                {mode === 'login' ? 'Sign in to your workspace' : 'Create a new workspace'}
              </p>

              <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <>
                    <Field label="Your name" value={form.name} onChange={update('name')} required />
                    <Field
                      label="Workspace / org name"
                      value={form.orgName}
                      onChange={update('orgName')}
                      required
                    />
                  </>
                )}
                <Field
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  required
                />
                <Field
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={update('password')}
                  required
                />
                {mode === 'login' && (
                  <Link
                    to="/forgot-password"
                    className="-mt-1 self-end text-xs font-medium text-text-muted hover:text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
                {needsVerification && (
                  <button
                    type="button"
                    disabled={resendState.isLoading}
                    className="-mt-1 self-start text-sm font-medium text-primary hover:underline disabled:opacity-50"
                    onClick={() => resendVerification({ email: form.email })}
                  >
                    {resendState.isSuccess
                      ? "Sent — check your inbox"
                      : resendState.isLoading
                        ? 'Sending…'
                        : 'Resend verification email'}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 rounded-md bg-gradient-action px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create workspace'}
                </button>
              </form>

              <div className="mt-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-text-muted">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="mt-4">
                <GoogleSignInButton
                  mode={mode}
                  onCredential={handleGoogleCredential}
                  onError={setGoogleScriptError}
                />
              </div>

              <button
                type="button"
                className="mt-4 text-sm font-medium text-primary hover:underline"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login'
                  ? "Don't have a workspace? Create one"
                  : 'Already have an account? Sign in'}
              </button>
            </>
          )}
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-text-muted">
      {label}
      <input
        {...props}
        className="h-[46px] rounded-md border border-border bg-surface-elevated px-3.5 text-sm text-text outline-none focus:border-focus focus:shadow-[0_0_0_3px_rgba(197,82,255,0.18)]"
      />
    </label>
  );
}
