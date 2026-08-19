import { useState } from 'react';
import {
  useGetAdminStripeSettingsQuery,
  useSaveAdminStripeSettingsMutation,
} from '../../api/adminDataApi.js';

export function AdminSettings() {
  const { data: settings, isLoading } = useGetAdminStripeSettingsQuery();
  const [save, { isLoading: saving, error }] = useSaveAdminStripeSettingsMutation();

  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [feedback, setFeedback] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setFeedback(null);
    const body = {};
    if (secretKey.trim()) body.secretKey = secretKey.trim();
    if (webhookSecret.trim()) body.webhookSecret = webhookSecret.trim();
    if (Object.keys(body).length === 0) return;

    await save(body).unwrap();
    setSecretKey('');
    setWebhookSecret('');
    setFeedback('Saved.');
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-white">Settings</h1>

      <div className="mt-6 rounded-lg border border-white/10 bg-ink-900 p-6">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-white">Stripe</p>
          {!isLoading && (
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                settings?.configured
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${settings?.configured ? 'bg-emerald-400' : 'bg-amber-400'}`}
              />
              {settings?.configured ? 'Connected' : 'Not connected'}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-ink-300">
          Once a secret key is saved here, credit purchases across every workspace switch from
          simulated checkout to real Stripe Checkout Sessions automatically — no deploy needed.
        </p>

        {settings?.configured && (
          <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">Secret key</dt>
              <dd className="mt-1 font-mono text-sm text-white">••••{settings.keySecretLast4}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">
                Webhook secret
              </dt>
              <dd className="mt-1 text-sm text-white">
                {settings.hasWebhookSecret ? 'Set' : 'Not set'}
              </dd>
            </div>
          </dl>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6">
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-ink-300">
            Secret key
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder={settings?.configured ? 'Leave blank to keep the saved secret' : 'sk_live_...'}
              className="h-10 rounded-md border border-white/15 bg-white/5 px-3 font-mono text-sm font-normal normal-case text-white outline-none focus:border-neon-violet"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-ink-300">
            Webhook secret <span className="normal-case text-ink-300">(optional, recommended)</span>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={
                settings?.hasWebhookSecret ? 'Leave blank to keep the saved secret' : 'whsec_...'
              }
              className="h-10 rounded-md border border-white/15 bg-white/5 px-3 font-mono text-sm font-normal normal-case text-white outline-none focus:border-neon-violet"
            />
          </label>

          {error && (
            <p className="text-xs text-red-400">
              {error.data?.error?.message || 'Could not save settings.'}
            </p>
          )}
          {feedback && <p className="text-xs text-emerald-400">{feedback}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 w-fit rounded-md bg-gradient-action px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
