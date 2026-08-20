// Shown once, on first login — see GuidedTour.jsx. `target` is a
// data-tour selector on the live nav/header; steps without one render as a
// centered card instead of a spotlight.
export const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to DataPit',
    body: "Here's a 60-second tour of where everything lives. Skip any time — you can always find your way around from here.",
  },
  {
    id: 'nav-dashboard',
    target: '[data-tour="nav-dashboard"]',
    title: 'Dashboard',
    body: 'Your credit balance, active sequences, and recent activity at a glance — this is home base.',
  },
  {
    id: 'nav-people',
    target: '[data-tour="nav-people"]',
    title: 'People',
    body: 'Search verified contacts by title, seniority, and company. Emails stay masked until you reveal them, so you only spend credits on people you actually want to reach.',
  },
  {
    id: 'nav-companies',
    target: '[data-tour="nav-companies"]',
    title: 'Companies',
    body: 'Filter accounts by industry, headcount, and location, then drill into any company for its full contact list.',
  },
  {
    id: 'nav-lists',
    target: '[data-tour="nav-lists"]',
    title: 'Lists',
    body: 'Save people and companies you find into named lists — the starting point for building a sequence or exporting a CSV.',
  },
  {
    id: 'nav-sequences',
    target: '[data-tour="nav-sequences"]',
    title: 'Sequences',
    body: 'Build multi-step outreach cadences with wait steps, enroll a list in one click, and track opens as they come in.',
  },
  {
    id: 'nav-billing',
    target: '[data-tour="nav-billing"]',
    title: 'Billing',
    body: 'See your current plan, balance, and monthly grant, and upgrade for more credits and features when you outgrow the Free plan.',
  },
  {
    id: 'theme-toggle',
    target: '[data-tour="theme-toggle"]',
    title: 'Theme',
    body: 'DataPit follows your system light/dark preference automatically — click here any time to override it.',
  },
  {
    id: 'profile-menu',
    target: '[data-tour="profile-menu"]',
    title: 'Your profile',
    body: 'Manage your account and sign out from here.',
  },
  {
    id: 'finish',
    title: "You're all set",
    body: 'Head to People or Companies to find your first contacts — every reveal only costs 2 credits.',
  },
];
