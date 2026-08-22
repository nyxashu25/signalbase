import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import { ChatWidget } from './components/ChatWidget.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';
import { RequireSuperAdmin } from './components/RequireSuperAdmin.jsx';
import { Login } from './pages/Login.jsx';
import { VerifyEmail } from './pages/VerifyEmail.jsx';
import { Unsubscribe } from './pages/Unsubscribe.jsx';
import { authApi } from './api/authApi.js';
import { setSession, clearSession } from './store/authSlice.js';

// Route-level code splitting (TODO.md): the marketing site (framer-motion,
// GSAP, Lenis), the authenticated app (cmdk, Radix, lucide-heavy shell) and
// the admin panel are three different audiences — each now downloads only
// its own routes. Vite hoists whatever they share into common chunks.
// Login/verify/unsubscribe stay eager: they're tiny and are the landing
// points for every emailed link.
const lazyNamed = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));

// Marketing
const Home = lazyNamed(() => import('./pages/marketing/Home.jsx'), 'Home');
const Pricing = lazyNamed(() => import('./pages/marketing/Pricing.jsx'), 'Pricing');
const Product = lazyNamed(() => import('./pages/marketing/Product.jsx'), 'Product');
const Solutions = lazyNamed(() => import('./pages/marketing/Solutions.jsx'), 'Solutions');
const About = lazyNamed(() => import('./pages/marketing/About.jsx'), 'About');
const Contact = lazyNamed(() => import('./pages/marketing/Contact.jsx'), 'Contact');
const Privacy = lazyNamed(() => import('./pages/marketing/Privacy.jsx'), 'Privacy');
const Terms = lazyNamed(() => import('./pages/marketing/Terms.jsx'), 'Terms');

// Authenticated app
const AppLayout = lazyNamed(() => import('./layouts/AppLayout.jsx'), 'AppLayout');
const Dashboard = lazyNamed(() => import('./pages/Dashboard.jsx'), 'Dashboard');
const People = lazyNamed(() => import('./pages/People.jsx'), 'People');
const Companies = lazyNamed(() => import('./pages/Companies.jsx'), 'Companies');
const CompanyDetail = lazyNamed(() => import('./pages/CompanyDetail.jsx'), 'CompanyDetail');
const Billing = lazyNamed(() => import('./pages/Billing.jsx'), 'Billing');
const Lists = lazyNamed(() => import('./pages/Lists.jsx'), 'Lists');
const ListDetail = lazyNamed(() => import('./pages/ListDetail.jsx'), 'ListDetail');
const Sequences = lazyNamed(() => import('./pages/Sequences.jsx'), 'Sequences');
const SequenceBuilder = lazyNamed(() => import('./pages/SequenceBuilder.jsx'), 'SequenceBuilder');
const SequenceDetail = lazyNamed(() => import('./pages/SequenceDetail.jsx'), 'SequenceDetail');
const Profile = lazyNamed(() => import('./pages/Profile.jsx'), 'Profile');
const AddCredits = lazyNamed(() => import('./pages/AddCredits.jsx'), 'AddCredits');
const Tickets = lazyNamed(() => import('./pages/Tickets.jsx'), 'Tickets');
const NewTicket = lazyNamed(() => import('./pages/NewTicket.jsx'), 'NewTicket');
const TicketDetail = lazyNamed(() => import('./pages/TicketDetail.jsx'), 'TicketDetail');
const Help = lazyNamed(() => import('./pages/Help.jsx'), 'Help');

// Admin panel
const AdminLayout = lazyNamed(() => import('./layouts/AdminLayout.jsx'), 'AdminLayout');
const AdminLogin = lazyNamed(() => import('./pages/admin/AdminLogin.jsx'), 'AdminLogin');
const AdminDashboard = lazyNamed(() => import('./pages/admin/AdminDashboard.jsx'), 'AdminDashboard');
const AdminUsers = lazyNamed(() => import('./pages/admin/AdminUsers.jsx'), 'AdminUsers');
const AdminUserDetail = lazyNamed(() => import('./pages/admin/AdminUserDetail.jsx'), 'AdminUserDetail');
const AdminBilling = lazyNamed(() => import('./pages/admin/AdminBilling.jsx'), 'AdminBilling');
const AdminSettings = lazyNamed(() => import('./pages/admin/AdminSettings.jsx'), 'AdminSettings');
const AdminExtendDatabase = lazyNamed(
  () => import('./pages/admin/AdminExtendDatabase.jsx'),
  'AdminExtendDatabase',
);
const AdminAuditLog = lazyNamed(() => import('./pages/admin/AdminAuditLog.jsx'), 'AdminAuditLog');
const AdminTickets = lazyNamed(() => import('./pages/admin/AdminTickets.jsx'), 'AdminTickets');
const AdminTicketDetail = lazyNamed(
  () => import('./pages/admin/AdminTicketDetail.jsx'),
  'AdminTicketDetail',
);

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
      <Loader2 className="h-5 w-5 animate-spin text-text-muted" aria-hidden="true" />
    </div>
  );
}

export function App() {
  const dispatch = useDispatch();
  const status = useSelector((s) => s.auth.status);
  const location = useLocation();
  const showChatWidget = !location.pathname.startsWith('/control');

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
    <>
      <Suspense fallback={<RouteFallback />}>
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
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />

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
              <Route path="billing" element={<Billing />} />
              <Route path="billing/add-credits" element={<AddCredits />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="tickets/new" element={<NewTicket />} />
              <Route path="tickets/:id" element={<TicketDetail />} />
              <Route path="profile" element={<Profile />} />
              <Route path="help" element={<Help />} />
            </Route>
          </Route>

          <Route path="/control/login" element={<AdminLogin />} />
          <Route path="/control" element={<RequireSuperAdmin />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/:userId" element={<AdminUserDetail />} />
              <Route path="billing" element={<AdminBilling />} />
              <Route path="extend-database" element={<AdminExtendDatabase />} />
              <Route path="audit-log" element={<AdminAuditLog />} />
              <Route path="tickets" element={<AdminTickets />} />
              <Route path="tickets/:ticketId" element={<AdminTicketDetail />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      {showChatWidget && <ChatWidget />}
    </>
  );
}
