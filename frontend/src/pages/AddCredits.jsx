import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useListBillingPackagesQuery,
  useCreateCheckoutSessionMutation,
  useVerifyRazorpayPaymentMutation,
} from '../api/billingApi.js';

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the Razorpay checkout script'));
    document.body.appendChild(script);
  });
}

function formatPrice(pkg, currency) {
  return currency === 'INR' ? `₹${(pkg.inrPaise / 100).toLocaleString('en-IN')}` : `$${pkg.usdCents / 100}`;
}

export function AddCredits() {
  const navigate = useNavigate();
  const { data: packages } = useListBillingPackagesQuery();
  const [currency, setCurrency] = useState('USD');
  const [selected, setSelected] = useState(null);
  const [createCheckoutSession, { isLoading: startingCheckout }] = useCreateCheckoutSessionMutation();
  const [verifyPayment] = useVerifyRazorpayPaymentMutation();
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  const featured = packages?.find((p) => p.badge)?.credits;
  const activeCredits = selected ?? featured ?? packages?.[0]?.credits;
  const activePkg = packages?.find((p) => p.credits === activeCredits);

  async function handleContinue() {
    setError(null);
    try {
      const session = await createCheckoutSession({ credits: activeCredits, currency }).unwrap();

      if (session.provider === 'razorpay') {
        setPaying(true);
        await loadRazorpayScript();
        const checkout = new window.Razorpay({
          key: session.keyId,
          order_id: session.orderId,
          amount: session.amount,
          currency: session.currency,
          name: 'DataPit',
          description: `${activeCredits} credits`,
          handler: async (response) => {
            try {
              await verifyPayment({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }).unwrap();
              navigate('/app/billing');
            } catch {
              setError(
                'Payment went through but we could not verify it automatically — check Billing in a moment, or contact support if credits don’t appear.',
              );
              setPaying(false);
            }
          },
          modal: { ondismiss: () => setPaying(false) },
        });
        checkout.open();
        return;
      }

      // Stripe fallback (simulated until a real key is configured elsewhere).
      window.location.href = session.url;
    } catch (err) {
      setError(err.data?.error?.message || 'Could not start checkout. Please try again.');
      setPaying(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Link to="/app/billing" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to billing
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-text">Add credits</h1>
      <p className="mt-1 text-sm text-text-muted">
        Pick a credit package. You'll be sent to a secure payment page to complete the purchase.
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

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleContinue}
        disabled={startingCheckout || paying || !activePkg}
        className="mt-6 rounded-md bg-gradient-action px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        {startingCheckout || paying ? 'Starting checkout…' : 'Continue to payment'}
      </button>
    </div>
  );
}
