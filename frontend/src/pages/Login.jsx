import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoginMutation, useRegisterMutation } from '../api/authApi.js';
import { setSession } from '../store/authSlice.js';
import { Logo } from '../components/Logo.jsx';

export function Login() {
  // Marketing "Start free" CTAs link here with ?mode=register so they land
  // straight on the create-workspace form instead of Sign in — a query
  // param (not router state) so it also works from a full page load/refresh.
  const location = useLocation();
  const initialMode =
    new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ email: '', password: '', name: '', orgName: '' });
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const { isLoading } = mode === 'login' ? loginState : registerState;
  const error = (loginState.error ?? registerState.error)?.data?.error?.message;

  async function handleSubmit(e) {
    e.preventDefault();
    const action = mode === 'login' ? login : register;
    const body =
      mode === 'login'
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, name: form.name, orgName: form.orgName };

    const result = await action(body);
    if (result.data) {
      dispatch(setSession(result.data));
      navigate('/app', { replace: true });
    }
  }

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-7 shadow-dp">
        <Logo className="h-7" />
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-md bg-gradient-action px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create workspace'}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 text-sm font-medium text-primary hover:underline"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login'
            ? "Don't have a workspace? Create one"
            : 'Already have an account? Sign in'}
        </button>
      </div>
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
