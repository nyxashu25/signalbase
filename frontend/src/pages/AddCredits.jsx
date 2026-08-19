import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreateCheckoutSessionMutation } from '../api/billingApi.js';

const PACKAGES = [
  { credits: 250, price: 15 },
  { credits: 600, price: 30, badge: 'Best value' },
  { credits: 1500, price: 65 },
];

export function AddCredits() {
  const [selected, setSelected] = useState(PACKAGES[1].credits);
  const [createCheckoutSession, { isLoading, error }] = useCreateCheckoutSessionMutation();

  async function handleContinue() {
    const session = await createCheckoutSession({ credits: selected }).unwrap();
    window.location.href = session.url;
  }

  return (
    <div className="max-w-2xl">
      <Link to="/app/profile" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to profile
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-text">Add credits</h1>
      <p className="mt-1 text-sm text-text-muted">
        Pick a credit package. You'll be sent to a secure payment page to complete the purchase.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <button
            key={pkg.credits}
            type="button"
            onClick={() => setSelected(pkg.credits)}
            className={`relative rounded-lg border p-5 text-left transition-colors duration-150 ease-brand ${
              selected === pkg.credits
                ? 'border-primary bg-surface-elevated ring-2 ring-primary'
                : 'border-border bg-surface-elevated hover:border-primary/40'
            }`}
          >
            {pkg.badge && (
              <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {pkg.badge}
              </span>
            )}
            <p className="text-2xl font-extrabold text-text">{pkg.credits.toLocaleString()}</p>
            <p className="text-xs font-medium text-text-muted">credits</p>
            <p className="mt-3 text-lg font-bold text-primary">${pkg.price}</p>
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600">
          {error.data?.error?.message || 'Could not start checkout. Please try again.'}
        </p>
      )}

      <button
        type="button"
        onClick={handleContinue}
        disabled={isLoading}
        className="mt-6 rounded-md bg-gradient-action px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Starting checkout…' : 'Continue to payment'}
      </button>
    </div>
  );
}
