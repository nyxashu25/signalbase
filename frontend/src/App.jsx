import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppLayout } from './layouts/AppLayout.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Login } from './pages/Login.jsx';
import { People } from './pages/People.jsx';
import { Companies } from './pages/Companies.jsx';
import { CompanyDetail } from './pages/CompanyDetail.jsx';
import { Placeholder } from './pages/Placeholder.jsx';
import { Lists } from './pages/Lists.jsx';
import { ListDetail } from './pages/ListDetail.jsx';
import { Sequences } from './pages/Sequences.jsx';
import { SequenceBuilder } from './pages/SequenceBuilder.jsx';
import { SequenceDetail } from './pages/SequenceDetail.jsx';
import { Profile } from './pages/Profile.jsx';
import { AddCredits } from './pages/AddCredits.jsx';
import { Home } from './pages/marketing/Home.jsx';
import { Pricing } from './pages/marketing/Pricing.jsx';
import { Product } from './pages/marketing/Product.jsx';
import { Solutions } from './pages/marketing/Solutions.jsx';
import { About } from './pages/marketing/About.jsx';
import { Contact } from './pages/marketing/Contact.jsx';
import { Privacy } from './pages/marketing/Privacy.jsx';
import { Terms } from './pages/marketing/Terms.jsx';
import { AdminLayout } from './layouts/AdminLayout.jsx';
import { RequireSuperAdmin } from './components/RequireSuperAdmin.jsx';
import { AdminLogin } from './pages/admin/AdminLogin.jsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.jsx';
import { AdminUsers } from './pages/admin/AdminUsers.jsx';
import { AdminUserDetail } from './pages/admin/AdminUserDetail.jsx';
import { AdminBilling } from './pages/admin/AdminBilling.jsx';
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
      <Route path="/" element={<Home />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/product" element={<Product />} />
      <Route path="/solutions" element={<Solutions />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/login" element={<Login />} />

      <Route path="/app" element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="people" element={<People />} />
          <Route path="companies" element={<Companies />} />
          <Route path="companies/:id" element={<CompanyDetail />} />
          <Route path="lists" element={<Lists />} />
          <Route path="lists/:id" element={<ListDetail />} />
          <Route path="sequences" element={<Sequences />} />
          <Route path="sequences/new" element={<SequenceBuilder />} />
          <Route path="sequences/:id" element={<SequenceDetail />} />
          <Route path="billing" element={<Placeholder title="Billing" />} />
          <Route path="billing/add-credits" element={<AddCredits />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="/control/login" element={<AdminLogin />} />
      <Route path="/control" element={<RequireSuperAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:userId" element={<AdminUserDetail />} />
          <Route path="billing" element={<AdminBilling />} />
        </Route>
      </Route>
    </Routes>
  );
}
