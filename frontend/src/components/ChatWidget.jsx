import { useState } from 'react';
import { useSubmitContactRequestMutation } from '../api/marketingApi.js';
import { RabbitAvatar } from './RabbitAvatar.jsx';

// Answers pulled verbatim from the real Pricing page copy (pages/marketing/
// Pricing.jsx) so this never drifts out of sync with what the pricing page
// itself says.
const FAQS = [
  {
    q: 'What does DataPit do?',
    a: 'DataPit is a B2B sales intelligence platform — search verified contacts and companies, reveal emails on credit, and run outreach sequences, all on one credit ledger.',
  },
  {
    q: "What's a credit, and what does a reveal cost?",
    a: "Revealing a contact's verified email costs 2 credits. Search and masked results never cost a credit — only the reveal action does. Once any teammate reveals a contact, the whole workspace can see it for free going forward.",
  },
  {
    q: "What's included in the Free plan?",
    a: '800 personal credits every month, 1 seat, 1 saved list, and full people & company search — no credit card required.',
  },
  {
    q: 'What are the paid plans?',
    a: 'Paid plans come in seat blocks — buy as many as you need. Basic is $29/mo per block (5 paid + 1 free seat; paid seats earn 900 credits/mo each). Professional is $59/mo per block (5 paid + 3 free; 2,000 credits per paid seat + a 2,000 owner bonus) — our most popular. Organization is $99/mo per block (14 paid + 5 free; 2,000 per paid seat + a 3,000 owner bonus). Free bonus seats always earn 1,500/mo, and every newly covered teammate gets a one-time 1,500-credit gift.',
  },
  {
    q: 'Do unused credits roll over?',
    a: 'No — credits reset each billing cycle and don’t roll over. You can upgrade, downgrade, or cancel from your workspace billing page at any time.',
  },
];

const emptyForm = { name: '', email: '', message: '' };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('menu'); // menu | answer | ticket | ticket-sent
  const [activeFaq, setActiveFaq] = useState(null);
  const [ticketCategory, setTicketCategory] = useState('support');
  const [form, setForm] = useState(emptyForm);
  const [submit, { isLoading, error, reset }] = useSubmitContactRequestMutation();

  function openTicket(category) {
    setTicketCategory(category);
    setView('ticket');
  }

  function backToMenu() {
    setView('menu');
    setActiveFaq(null);
    reset();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await submit({ ...form, category: ticketCategory }).unwrap();
      setView('ticket-sent');
    } catch {
      // Rejection is already reflected in `error` below via the mutation's
      // own state — nothing else to do here.
    }
  }

  function updateField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <div className="mb-3 flex h-[480px] w-[92vw] max-w-[340px] flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-dp-md">
          <header className="flex items-center justify-between gap-2 bg-gradient-action px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                <RabbitAvatar className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">DataPit</p>
                <p className="text-[11px] text-white/80">Ask us anything</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="shrink-0 rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            {view === 'menu' && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-text-muted">
                  Hi! Pick a question below, or reach a real person if you'd rather talk to us
                  directly.
                </p>
                <div className="flex flex-col gap-2">
                  {FAQS.map((faq) => (
                    <button
                      key={faq.q}
                      type="button"
                      onClick={() => {
                        setActiveFaq(faq);
                        setView('answer');
                      }}
                      className="rounded-md border border-border px-3 py-2 text-left text-sm text-text transition-colors hover:border-primary/40 hover:bg-surface"
                    >
                      {faq.q}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Need a human?
                  </p>
                  <button
                    type="button"
                    onClick={() => openTicket('support')}
                    className="rounded-md bg-surface px-3 py-2 text-left text-sm font-medium text-text hover:bg-border/60"
                  >
                    Contact support
                  </button>
                  <button
                    type="button"
                    onClick={() => openTicket('enterprise')}
                    className="rounded-md bg-surface px-3 py-2 text-left text-sm font-medium text-text hover:bg-border/60"
                  >
                    Talk to Enterprise sales
                  </button>
                </div>
              </div>
            )}

            {view === 'answer' && activeFaq && (
              <div className="flex flex-col gap-4">
                <BackButton onClick={backToMenu} />
                <div className="rounded-md bg-surface p-3">
                  <p className="text-sm font-bold text-text">{activeFaq.q}</p>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{activeFaq.a}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openTicket('support')}
                  className="w-fit text-xs font-bold text-primary hover:underline"
                >
                  Still need help? Contact support →
                </button>
              </div>
            )}

            {view === 'ticket' && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <BackButton onClick={backToMenu} />
                <p className="text-sm font-bold text-text">
                  {ticketCategory === 'enterprise' ? 'Talk to Enterprise sales' : 'Contact support'}
                </p>
                <p className="text-xs text-text-muted">
                  Use the email registered to your DataPit workspace — we can't send this without
                  it.
                </p>
                <Field label="Name" value={form.name} onChange={updateField('name')} required />
                <Field
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={updateField('email')}
                  required
                />
                <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
                  Message
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={updateField('message')}
                    className="rounded-md border border-border bg-surface-elevated px-2.5 py-2 text-sm text-text outline-none focus:border-focus"
                  />
                </label>
                {error && (
                  <p className="text-xs text-red-600">
                    {error.data?.error?.message || 'Could not send your message. Please try again.'}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-1 rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Sending…' : 'Send'}
                </button>
              </form>
            )}

            {view === 'ticket-sent' && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckIcon className="h-5 w-5 text-emerald-500" />
                </span>
                <p className="text-sm font-bold text-text">Message sent</p>
                <p className="text-xs text-text-muted">We'll reply to {form.email} shortly.</p>
                <button
                  type="button"
                  onClick={() => {
                    setForm(emptyForm);
                    backToMenu();
                  }}
                  className="mt-2 text-xs font-bold text-primary hover:underline"
                >
                  Ask something else
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-action text-white shadow-[0_10px_30px_rgba(148,0,222,0.4)] transition-transform duration-150 ease-brand hover:-translate-y-0.5"
      >
        {open ? <CloseIcon className="h-6 w-6" /> : <RabbitAvatar className="h-7 w-7" />}
      </button>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-fit text-xs font-bold text-primary hover:underline"
    >
      ← Back
    </button>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
      {label}
      <input
        {...props}
        className="h-9 rounded-md border border-border bg-surface-elevated px-2.5 text-sm text-text outline-none focus:border-focus"
      />
    </label>
  );
}

function CloseIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={className}
    >
      <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
