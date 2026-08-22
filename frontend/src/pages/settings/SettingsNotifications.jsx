import { useDispatch, useSelector } from 'react-redux';
import { useUpdatePreferencesMutation } from '../../api/authApi.js';
import { updateUser } from '../../store/authSlice.js';
import { SettingRow, Switch } from '../../components/ui/FormField.jsx';
import { StatusPill } from '../../components/ui/StatusPill.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { SettingsSection } from './SettingsLayout.jsx';

const TRANSACTIONAL = [
  { title: 'Account', description: 'Email verification, welcome, password and sign-in related mail.' },
  { title: 'Support tickets', description: 'When we reply to, or close, a ticket you raised.' },
  { title: 'Billing & credits', description: 'Receipts, plan changes, monthly credit renewals and admin-granted credits.' },
];

export function SettingsNotifications() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const toast = useToast();
  const [updatePreferences, { isLoading }] = useUpdatePreferencesMutation();
  const optedIn = !user?.marketingOptOut;

  async function toggle(next) {
    try {
      const result = await updatePreferences({ marketingOptOut: !next }).unwrap();
      dispatch(updateUser(result.user));
      toast.success(next ? 'Subscribed to product news' : 'Unsubscribed from product news');
    } catch (err) {
      toast.error('Could not update preference', err.data?.error?.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection title="Email notifications" description={`Sent to ${user?.email ?? 'your email'}.`}>
        <SettingRow
          title="Product news & offers"
          description="Occasional emails about new features, tips and promotions. Every one has an unsubscribe link too."
        >
          <Switch checked={optedIn} onChange={toggle} disabled={isLoading} label="Product news and offers" />
        </SettingRow>
        {TRANSACTIONAL.map((row) => (
          <SettingRow key={row.title} title={row.title} description={row.description} className="border-t border-border">
            <StatusPill tone="neutral">Always on</StatusPill>
          </SettingRow>
        ))}
      </SettingsSection>
      <p className="text-xs text-text-muted">
        Transactional emails can&rsquo;t be switched off — they&rsquo;re how you confirm your account, hear back on
        tickets and get receipts. In-app, the bell in the top bar shows support replies.
      </p>
    </div>
  );
}
