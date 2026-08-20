import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useListBillingPackagesQuery,
  useGetCustomCreditsPriceQuery,
  useCreateCheckoutSessionMutation,
} from '../api/billingApi.js';

function formatPrice(priced, currency) {
  return currency === 'INR'
    ? `₹${(priced.inrPaise / 100).toLocaleString('en-IN')}`
    : `$${priced.usdCents / 100}`;
}

export function AddCredits() {
  const { data } = useListBillingPackagesQuery();
  const packages = data?.packages;
  const customRange = data?.customRange;
  const [currency, setCurrency] = useState('USD');
  const [selected, setSelected] = useState(null); // a package's credits, or 'custom'
  const [customAmount, setCustomAmount] = useState('');
  const [createCheckoutSession, { isLoading: startingCheckout }] =
    useCreateCheckoutSessionMutation();
  const [error, setError] = useState(null);

  const featured = packages?.find((p) => p.badge)?.credits;
  const activeCredits = selected ?? featured ?? packages?.[0]?.credits;
  const isCustom = activeCredits === 'custom';
  const activePkg = !isCustom && packages?.find((p) => p.credits === activeCredits);

  const parsedCustom = Number(customAmount);
  const customValid =
    customRange &&
    Number.isInteger(parsedCustom) &&
    parsedCustom >= customRange.min &&
    parsedCustom <= customRange.max;
  const { data: customPrice } = useGetCustomCreditsPriceQuery(parsedCustom, {
    skip: !isCustom || !customValid,
  });

  const canContinue = isCustom ? customValid && customPrice : Boolean(activePkg);
  const purchaseCredits = isCustom ? parsedCustom : activeCredits;

  async function handleContinue() {
    if (!canContinue) return;
    setError(null);
    try {
      const session = await createCheckoutSession({
        credits: purchaseCredits,
        currency,
      }).unwrap();
      window.location.href = session.url;
    } catch (err) {
      setError(err.data?.error?.message || 'Could not start checkout. Please try again.');
    }
  }

  return (
    <div className="max-w-2xl">
      <Link to="/app/billing" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to billing
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-text">Add credits</h1>
      <p className="mt-1 text-sm text-text-muted">
        Pick a credit package or enter a custom amount. You'll be sent to a secure payment page to
        complete the purchase.
      </p>

      <div className="mt-4 inline-flex rounded-md border border-border p-0.5">
        {['USD', 'INR'].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            className={`rounded px-3 py-1 text-xs font-bold ${
              currency === c ? 'bg-gradient-action text-white' : 'text-text-muted'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(packages ?? []).map((pkg) => (
          <button
            key={pkg.credits}
            type="button"
            onClick={() => setSelected(pkg.credits)}
            className={`relative rounded-lg border p-5 text-left transition-colors duration-150 ease-brand ${
              activeCredits === pkg.credits
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
            <p className="mt-3 text-lg font-bold text-primary">{formatPrice(pkg, currency)}</p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setSelected('custom')}
        className={`mt-4 w-full rounded-lg border p-5 text-left transition-colors duration-150 ease-brand ${
          isCustom
            ? 'border-primary bg-surface-elevated ring-2 ring-primary'
            : 'border-border bg-surface-elevated hover:border-primary/40'
        }`}
      >
        <p className="text-sm font-bold text-text">Custom amount</p>
        <p className="text-xs text-text-muted">
          {customRange
            ? `Enter any amount from ${customRange.min.toLocaleString()} to ${customRange.max.toLocaleString()} credits`
            : 'Enter your own amount'}
        </p>

        {isCustom && (
          <div
            className="mt-4 flex flex-wrap items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="number"
              inputMode="numeric"
              min={customRange?.min}
              max={customRange?.max}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`e.g. ${customRange ? customRange.min * 2 : 500}`}
              className="w-40 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-focus focus:outline-none"
            />
            <span className="text-sm text-text-muted">credits</span>
            {customAmount && !customValid && customRange && (
              <span className="text-xs text-red-600">
                Must be between {customRange.min.toLocaleString()} and{' '}
                {customRange.max.toLocaleString()}
              </span>
            )}
            {customValid && customPrice && (
              <span className="text-lg font-bold text-primary">
                {formatPrice(customPrice, currency)}
              </span>
            )}
          </div>
        )}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleContinue}
        disabled={startingCheckout || !canContinue}
        className="mt-6 rounded-md bg-gradient-action px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        {startingCheckout ? 'Starting checkout…' : 'Continue to payment'}
      </button>
    </div>
  );
}
