import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useAdminLoginMutation } from '../../api/adminAuthApi.js';
import { setAdminSession } from '../../store/adminAuthSlice.js';

export function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [login, { isLoading, error }] = useAdminLoginMutation();

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await login(form);
    if (result.data) {
      dispatch(setAdminSession(result.data));
      navigate('/control', { replace: true });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-ink-900 p-7 shadow-dp-md">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-mauve-magic">
          Restricted access
        </span>
        <h1 className="mt-4 text-lg font-bold text-white">DataPit Control</h1>
        <p className="mt-1 text-sm text-ink-300">Super admin sign-in only.</p>

        <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm text-ink-300">
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="h-[46px] rounded-md border border-white/15 bg-white/5 px-3.5 text-sm text-white outline-none focus:border-neon-violet"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-300">
            Password
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="h-[46px] rounded-md border border-white/15 bg-white/5 px-3.5 text-sm text-white outline-none focus:border-neon-violet"
            />
          </label>

          {error && (
            <p className="text-sm text-red-400">
              {error.data?.error?.message || 'Sign-in failed.'}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-md bg-gradient-action px-4 py-2.5 text-sm font-bold text-white transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
