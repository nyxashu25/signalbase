import { useState } from 'react';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { useSubmitContactRequestMutation } from '../../api/marketingApi.js';
import { StoryCover } from '../../components/marketing/StoryCover.jsx';
import { Plate3D } from '../../components/marketing/Plate3D.jsx';
import { FadeIn } from '../../components/marketing/motion.jsx';

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [submit, { isLoading, isSuccess, error }] = useSubmitContactRequestMutation();

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await submit(form).unwrap();
  }

  return (
    <div className="min-h-screen">
      <StoryCover
        eyebrow="Contact"
        narration="Write in the margins. We read every note."
        sub="Questions about a plan, a bulk credit package, or whether DataPit fits your workflow — tell us and we'll get back to you."
        lines={[
          {
            content: <span className="bg-gradient-brand bg-clip-text text-transparent">Talk to us.</span>,
          },
        ]}
      />

      <section data-chapter data-chapter-title="Your note" className="relative text-white">
        <div className="mx-auto max-w-[900px] px-6 pb-28 pt-6 sm:pb-36">
          <FadeIn as="div" whileInView={false} delay={0.3} className="mx-auto max-w-[600px]">
            <Plate3D tilt={4}>
              <div className="rounded-xl border border-border bg-surface-elevated p-8 text-text shadow-dp">
                {isSuccess ? (
                  <div className="py-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                        <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-text">Message sent</h2>
                    <p className="mt-2 text-sm text-text-muted">Thanks — we'll reply to {form.email} shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Name" required value={form.name} onChange={update('name')} />
                      <Field label="Work email" type="email" required value={form.email} onChange={update('email')} />
                    </div>
                    <Field label="Company" value={form.company} onChange={update('company')} />
                    <label className="flex flex-col gap-1 text-sm text-text-muted">
                      Message
                      <textarea
                        required
                        rows={5}
                        value={form.message}
                        onChange={update('message')}
                        className="rounded-md border border-border bg-surface-elevated px-3.5 py-2.5 text-sm text-text outline-none focus:border-focus focus:shadow-[0_0_0_3px_rgba(197,82,255,0.18)]"
                      />
                    </label>

                    {error && (
                      <p className="text-sm text-red-600">
                        {error.data?.error?.message || 'Something went wrong — please try again.'}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="mt-2 rounded-md bg-gradient-action px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLoading ? 'Sending…' : 'Send message'}
                    </button>
                  </form>
                )}
              </div>
            </Plate3D>
          </FadeIn>
        </div>
      </section>

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
        className="h-[44px] rounded-md border border-border bg-surface-elevated px-3.5 text-sm text-text outline-none focus:border-focus focus:shadow-[0_0_0_3px_rgba(197,82,255,0.18)]"
      />
    </label>
  );
}
