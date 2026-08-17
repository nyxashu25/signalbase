import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppLayout } from './layouts/AppLayout.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Login } from './pages/Login.jsx';
import { People } from './pages/People.jsx';
import { Companies } from './pages/Companies.jsx';
import { Placeholder } from './pages/Placeholder.jsx';
import { authApi } from './api/authApi.js';
import { setSession, clearSession } from './store/authSlice.js';

export function App() {
  const dispatch = useDispatch();
  const status = useSelector((s) => s.auth.status);

  // Silent-refresh-on-load: the access token lives only in memory (Redux),
  // so a page reload has none — but the httpOnly refresh cookie survives
  // reloads. Trade the cookie for a fresh access token before deciding
  // whether the user is logged in, instead of bouncing straight to /login.
  // Guarded to run only from the initial "checking" state (empty deps —
  // intentionally mount-once) so a store preloaded as already-authenticated
  // (e.g. in tests) doesn't get silently logged out by a network call.
  useEffect(() => {
    if (status !== 'checking') return;
    (async () => {
      try {
        const { accessToken } = await dispatch(authApi.endpoints.refresh.initiate()).unwrap();
        dispatch(setSession({ accessToken, user: null, workspace: null, role: null }));
        const profile = await dispatch(authApi.endpoints.me.initiate()).unwrap();
        dispatch(setSession({ accessToken, ...profile }));
      } catch {
        dispatch(clearSession());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once by design
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="people" element={<People />} />
          <Route path="companies" element={<Companies />} />
          <Route path="lists" element={<Placeholder title="Lists" />} />
          <Route path="sequences" element={<Placeholder title="Sequences" />} />
          <Route path="billing" element={<Placeholder title="Billing" />} />
        </Route>
      </Route>
    </Routes>
  );
}
