import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation, useRegisterMutation } from '../api/authApi.js';
import { setSession } from '../store/authSlice.js';

export function Login() {
  const [mode, setMode] = useState('login');
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
      navigate('/', { replace: true });
    }
  }

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">SignalBase</h1>
        <p className="mt-1 text-sm text-slate-500">
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
            className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isLoading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create workspace'}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 text-sm text-slate-500 hover:text-slate-700"
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
    <label className="flex flex-col gap-1 text-sm text-slate-600">
      {label}
      <input
        {...props}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
      />
    </label>
  );
}
