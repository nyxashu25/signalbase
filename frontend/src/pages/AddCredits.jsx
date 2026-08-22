import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  useListBillingPackagesQuery,
  useGetCustomCreditsPriceQuery,
  useCreateCheckoutSessionMutation,
} from '../api/billingApi.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { StatusPill } from '../components/ui/StatusPill.jsx';

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

  const optionBase =
    'relative rounded-lg border bg-surface-elevated p-5 text-left transition-colors duration-150 ease-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';
  const optionActive = 'border-primary ring-1 ring-primary';
  const optionIdle = 'border-border hover:border-text-muted/40';

  return (
    <div className="max-w-2xl">
      <PageHeader
        backTo="/app/billing"
        backLabel="Billing"
        title="Add credits"
        description="Pick a credit package or enter a custom amount. You'll be sent to a secure payment page to complete the purchase."
        actions={
          <SegmentedControl
            ariaLabel="Currency"
            value={currency}
            onChange={setCurrency}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'INR', label: 'INR' },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(packages ?? []).map((pkg) => (
          <button
            key={pkg.credits}
            type="button"
            onClick={() => setSelected(pkg.credits)}
            className={`${optionBase} ${activeCredits === pkg.credits ? optionActive : optionIdle}`}
          >
            {pkg.badge && (
              <StatusPill tone="accent" className="absolute -top-2.5 left-4">
                {pkg.badge}
              </StatusPill>
            )}
            <p className="text-2xl font-extrabold tabular-nums text-text">
              {pkg.credits.toLocaleString()}
            </p>
            <p className="text-xs font-medium text-text-muted">credits</p>
            <p className="mt-3 text-lg font-bold text-primary">{formatPrice(pkg, currency)}</p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setSelected('custom')}
        className={`${optionBase} mt-3 w-full ${isCustom ? optionActive : optionIdle}`}
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
              className="h-9 w-40 rounded-md border border-border bg-surface-elevated px-3 text-sm text-text focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25"
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

      {error && (
        <Banner tone="danger" className="mt-4">
          {error}
        </Banner>
      )}

      <div className="mt-6">
        <Button
          variant="hero"
          size="lg"
          iconRight={ArrowRight}
          onClick={handleContinue}
          loading={startingCheckout}
          disabled={!canContinue}
        >
          Continue to payment
        </Button>
      </div>
    </div>
  );
}
