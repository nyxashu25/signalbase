import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import { RequireAuth } from './components/RequireAuth.jsx';
import { RequireSuperAdmin } from './components/RequireSuperAdmin.jsx';
import { authApi } from './api/authApi.js';
import { setSession, clearSession } from './store/authSlice.js';
import { RouteMeta } from './seo/RouteMeta.jsx';
import { isPrivatePath } from './seo/site.js';
import { endPrerenderHandoff } from './prerender/handoff.js';
import { contentComponent, isContentPath } from './content/loaders.js';

// Route-level code splitting (TODO.md): the marketing site (framer-motion,
// GSAP, Lenis), the authenticated app (cmdk, Radix, lucide-heavy shell) and
// the admin panel are three different audiences — each now downloads only
// its own routes. Vite hoists whatever they share into common chunks. The
// marketing shell (MarketingLayout, which brings framer-motion, GSAP and
// Lenis) is split the same way, so the entry chunk holds only what every
// route needs; the auth screens too, which are the landing points for every
// emailed link — preloadRoute fetches the one at hand before the first
// render, so they still open without a loading flash.
//
// `preload()` fetches a route's chunk ahead of render. Once it has arrived the
// lazy component resolves synchronously (a thenable that calls back at once),
// so the first commit already holds the page — main.jsx relies on that to
// swap the prerendered HTML for the live page without a blank frame between.
function lazyNamed(loader, name) {
  let loaded = null;
  const load = () =>
    loader().then((m) => {
      loaded = { default: m[name] };
      return loaded;
    });
  const Component = lazy(() => (loaded ? { then: (resolve) => resolve(loaded) } : load()));
  Component.preload = load;
  return Component;
}

// Marketing
const MarketingLayout = lazyNamed(
  () => import('./components/marketing/MarketingLayout.jsx'),
  'MarketingLayout',
);
const Home = lazyNamed(() => import('./pages/marketing/Home.jsx'), 'Home');
const Pricing = lazyNamed(() => import('./pages/marketing/Pricing.jsx'), 'Pricing');
const Product = lazyNamed(() => import('./pages/marketing/Product.jsx'), 'Product');
const Solutions = lazyNamed(() => import('./pages/marketing/Solutions.jsx'), 'Solutions');
const About = lazyNamed(() => import('./pages/marketing/About.jsx'), 'About');
const Press = lazyNamed(() => import('./pages/marketing/Press.jsx'), 'Press');
const Contact = lazyNamed(() => import('./pages/marketing/Contact.jsx'), 'Contact');
const Privacy = lazyNamed(() => import('./pages/marketing/Privacy.jsx'), 'Privacy');
const Terms = lazyNamed(() => import('./pages/marketing/Terms.jsx'), 'Terms');
const NotFound = lazyNamed(() => import('./pages/marketing/NotFound.jsx'), 'NotFound');
const BlogIndex = lazyNamed(() => import('./pages/marketing/BlogIndex.jsx'), 'BlogIndex');
const EmailFormatIndex = lazyNamed(
  () => import('./pages/marketing/emailFormat/EmailFormatIndex.jsx'),
  'EmailFormatIndex',
);
const EmailFormatPage = lazyNamed(
  () => import('./pages/marketing/emailFormat/EmailFormatPage.jsx'),
  'EmailFormatPage',
);

const MARKETING_PAGES = {
  '/': Home,
  '/pricing': Pricing,
  '/product': Product,
  '/solutions': Solutions,
  '/about': About,
  '/press': Press,
  '/contact': Contact,
  '/privacy': Privacy,
  '/terms': Terms,
  '/blog': BlogIndex,
  '/email-format': EmailFormatIndex,
};

const EMAIL_FORMAT_PAGE = /^\/email-format\/[a-z0-9.-]+$/;

/**
 * The marketing page for a path no fixed route claims: a content page from
 * the registry (comparisons, features, guides, tools — content/loaders.js),
 * a company's email-format page, or the 404 page.
 */
function pageForPath(path) {
  if (isContentPath(path)) return contentComponent(path);
  if (EMAIL_FORMAT_PAGE.test(path)) return EmailFormatPage;
  return NotFound;
}

function ContentOrNotFound() {
  const { pathname } = useLocation();
  const Page = pageForPath(pathname);
  return <Page />;
}

// Auth screens (see the note at the top).
const Login = lazyNamed(() => import('./pages/Login.jsx'), 'Login');
const VerifyEmail = lazyNamed(() => import('./pages/VerifyEmail.jsx'), 'VerifyEmail');
const ForgotPassword = lazyNamed(() => import('./pages/ForgotPassword.jsx'), 'ForgotPassword');
const ResetPassword = lazyNamed(() => import('./pages/ResetPassword.jsx'), 'ResetPassword');
const AcceptInvite = lazyNamed(() => import('./pages/AcceptInvite.jsx'), 'AcceptInvite');
const Unsubscribe = lazyNamed(() => import('./pages/Unsubscribe.jsx'), 'Unsubscribe');

const AUTH_PAGES = {
  '/login': Login,
  '/verify-email': VerifyEmail,
  '/forgot-password': ForgotPassword,
  '/reset-password': ResetPassword,
  '/accept-invite': AcceptInvite,
  '/unsubscribe': Unsubscribe,
};

/**
 * Fetch the chunks for the page at `pathname` before the first render: a
 * marketing page (the 404 page for an unknown path) together with the
 * marketing shell, or an auth screen. Resolves immediately for app and admin
 * routes, which have no prerendered HTML to hand over from and show their
 * own loading state.
 */
export function preloadRoute(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (AUTH_PAGES[path]) return AUTH_PAGES[path].preload().then(() => undefined);
  // An /app visit bounces to /login when the session check fails; fetch the
  // screen alongside so the redirect lands without a spinner. Not awaited.
  if (path === '/app' || path.startsWith('/app/')) Login.preload().catch(() => {});
  const page = MARKETING_PAGES[path] ?? (isPrivatePath(path) ? null : pageForPath(path));
  if (!page) return Promise.resolve();
  return Promise.all([MarketingLayout.preload(), page.preload()]).then(() => undefined);
}

// The support chat: not part of any page's first view, so its chunk loads
// once the page has settled — the first idle moment or the reader's first
// interaction, whichever comes first.
const ChatWidget = lazyNamed(() => import('./components/ChatWidget.jsx'), 'ChatWidget');
const SETTLED_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'];

function useAfterSettle() {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (settled) return undefined;
    const opts = { capture: true, passive: true };
    let idleId = 0;
    let timerId = 0;
    const done = () => setSettled(true);
    SETTLED_EVENTS.forEach((type) => window.addEventListener(type, done, opts));
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(done, { timeout: 4000 });
    } else {
      timerId = window.setTimeout(done, 1500);
    }
    return () => {
      SETTLED_EVENTS.forEach((type) => window.removeEventListener(type, done, opts));
      if (idleId) window.cancelIdleCallback?.(idleId);
      window.clearTimeout(timerId);
    };
  }, [settled]);
  return settled;
}

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
const AddCredits = lazyNamed(() => import('./pages/AddCredits.jsx'), 'AddCredits');
const Tickets = lazyNamed(() => import('./pages/Tickets.jsx'), 'Tickets');
const NewTicket = lazyNamed(() => import('./pages/NewTicket.jsx'), 'NewTicket');
const TicketDetail = lazyNamed(() => import('./pages/TicketDetail.jsx'), 'TicketDetail');
const Help = lazyNamed(() => import('./pages/Help.jsx'), 'Help');
const SettingsLayout = lazyNamed(() => import('./pages/settings/SettingsLayout.jsx'), 'SettingsLayout');
const SettingsProfile = lazyNamed(() => import('./pages/settings/SettingsProfile.jsx'), 'SettingsProfile');
const SettingsWorkspace = lazyNamed(
  () => import('./pages/settings/SettingsWorkspace.jsx'),
  'SettingsWorkspace',
);
const SettingsMembers = lazyNamed(() => import('./pages/settings/SettingsMembers.jsx'), 'SettingsMembers');
const SettingsSecurity = lazyNamed(() => import('./pages/settings/SettingsSecurity.jsx'), 'SettingsSecurity');
const SettingsNotifications = lazyNamed(
  () => import('./pages/settings/SettingsNotifications.jsx'),
  'SettingsNotifications',
);
const SettingsIntegrations = lazyNamed(
  () => import('./pages/settings/SettingsIntegrations.jsx'),
  'SettingsIntegrations',
);
const SettingsApi = lazyNamed(() => import('./pages/settings/SettingsApi.jsx'), 'SettingsApi');

// Admin panel
const AdminLayout = lazyNamed(() => import('./layouts/AdminLayout.jsx'), 'AdminLayout');
const AdminLogin = lazyNamed(() => import('./pages/admin/AdminLogin.jsx'), 'AdminLogin');
const AdminDashboard = lazyNamed(() => import('./pages/admin/AdminDashboard.jsx'), 'AdminDashboard');
const AdminUsers = lazyNamed(() => import('./pages/admin/AdminUsers.jsx'), 'AdminUsers');
const AdminUserDetail = lazyNamed(() => import('./pages/admin/AdminUserDetail.jsx'), 'AdminUserDetail');
const AdminBilling = lazyNamed(() => import('./pages/admin/AdminBilling.jsx'), 'AdminBilling');
const AdminSettings = lazyNamed(() => import('./pages/admin/AdminSettings.jsx'), 'AdminSettings');
const AdminPendingPeoples = lazyNamed(
  () => import('./pages/admin/AdminPendingPeoples.jsx'),
  'AdminPendingPeoples',
);
const AdminChildsFound = lazyNamed(
  () => import('./pages/admin/AdminChildsFound.jsx'),
  'AdminChildsFound',
);
const AdminExtendDatabase = lazyNamed(
  () => import('./pages/admin/AdminExtendDatabase.jsx'),
  'AdminExtendDatabase',
);
const AdminAuditLog = lazyNamed(() => import('./pages/admin/AdminAuditLog.jsx'), 'AdminAuditLog');
const AdminDeleted = lazyNamed(() => import('./pages/admin/AdminDeleted.jsx'), 'AdminDeleted');
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
  const settled = useAfterSettle();
  const showChatWidget = settled && !location.pathname.startsWith('/control');

  // Every "Start free" and "Log in" leads to /login: have its chunk in hand
  // by the time the reader taps one.
  useEffect(() => {
    if (settled) Login.preload().catch(() => {});
  }, [settled]);

  // The first commit has replaced any prerendered page; from here on,
  // entrance animations play (prerender/handoff.js).
  useEffect(() => {
    endPrerenderHandoff();
  }, []);

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
      <RouteMeta />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* The public storybook: one layout owns the smooth scroller, the
              signal-river backdrop, the nav, and the 3D page turn between
              these routes. */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/product" element={<Product />} />
            <Route path="/solutions" element={<Solutions />} />
            <Route path="/about" element={<About />} />
            <Route path="/press" element={<Press />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/email-format" element={<EmailFormatIndex />} />
            <Route path="*" element={<ContentOrNotFound />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
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
              {/* Profile moved into Settings (UX roadmap Phase 5); old links keep working. */}
              <Route path="profile" element={<Navigate to="/app/settings/profile" replace />} />
              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="/app/settings/profile" replace />} />
                <Route path="profile" element={<SettingsProfile />} />
                <Route path="workspace" element={<SettingsWorkspace />} />
                <Route path="members" element={<SettingsMembers />} />
                <Route path="security" element={<SettingsSecurity />} />
                <Route path="notifications" element={<SettingsNotifications />} />
                <Route path="integrations" element={<SettingsIntegrations />} />
                <Route path="api" element={<SettingsApi />} />
              </Route>
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
              <Route path="pending-peoples" element={<AdminPendingPeoples />} />
              <Route path="childs-found" element={<AdminChildsFound />} />
              <Route path="audit-log" element={<AdminAuditLog />} />
              <Route path="deleted" element={<AdminDeleted />} />
              <Route path="tickets" element={<AdminTickets />} />
              <Route path="tickets/:ticketId" element={<AdminTicketDetail />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      {showChatWidget && (
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      )}
    </>
  );
}
