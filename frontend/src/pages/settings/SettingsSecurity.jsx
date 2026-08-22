import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { KeyRound } from 'lucide-react';
import { useChangePasswordMutation } from '../../api/authApi.js';
import { updateUser } from '../../store/authSlice.js';
import { Button } from '../../components/ui/Button.jsx';
import { FormField, SettingRow } from '../../components/ui/FormField.jsx';
import { StatusPill } from '../../components/ui/StatusPill.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { SettingsSection } from './SettingsLayout.jsx';

const MIN_LENGTH = 8;

export function SettingsSecurity() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const toast = useToast();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState(null);
  const hasPassword = user?.hasPassword !== false; // unknown → assume yes (older sessions)

  const mismatch = form.confirm.length > 0 && form.next !== form.confirm;
  const tooShort = form.next.length > 0 && form.next.length < MIN_LENGTH;
  const canSubmit =
    form.next.length >= MIN_LENGTH && form.next === form.confirm && (!hasPassword || form.current.length > 0);

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const result = await changePassword({
        ...(hasPassword ? { currentPassword: form.current } : {}),
        newPassword: form.next,
      }).unwrap();
      dispatch(updateUser(result.user));
      setForm({ current: '', next: '', confirm: '' });
      toast.success(hasPassword ? 'Password changed' : 'Password set', 'Use it the next time you sign in.');
    } catch (err) {
      setError(err.data?.error?.message || 'Could not change password. Please try again.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit}>
        <SettingsSection
          title={hasPassword ? 'Change password' : 'Set a password'}
          description={
            hasPassword
              ? 'Pick something long — a phrase beats a jumble. Other sessions stay signed in.'
              : 'You signed up with Google. Setting a password gives you a second way in.'
          }
          footer={
            <Button type="submit" variant="primary" icon={KeyRound} loading={isLoading} disabled={!canSubmit}>
              {hasPassword ? 'Change password' : 'Set password'}
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {hasPassword && (
              <FormField
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={form.current}
                onChange={set('current')}
                required
                error={error}
                className="sm:col-span-2"
              />
            )}
            <FormField
              label="New password"
              type="password"
              autoComplete="new-password"
              value={form.next}
              onChange={set('next')}
              minLength={MIN_LENGTH}
              required
              hint={`At least ${MIN_LENGTH} characters.`}
              error={tooShort ? `At least ${MIN_LENGTH} characters.` : !hasPassword ? error : null}
            />
            <FormField
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={set('confirm')}
              required
              error={mismatch ? 'Passwords don’t match.' : null}
            />
          </div>
        </SettingsSection>
      </form>

      <SettingsSection title="Connected accounts" description="Other ways to sign in to this account.">
        <SettingRow
          title="Google"
          description={
            user?.googleLinked
              ? 'Linked — you can sign in with Google using this email.'
              : 'Not linked. Use “Sign in with Google” on the sign-in page with this email to link it.'
          }
        >
          <StatusPill tone={user?.googleLinked ? 'success' : 'neutral'} dot>
            {user?.googleLinked ? 'Linked' : 'Not linked'}
          </StatusPill>
        </SettingRow>
        <SettingRow
          title="Email & password"
          description={hasPassword ? 'A password is set on this account.' : 'No password yet — set one above.'}
          className="border-t border-border"
        >
          <StatusPill tone={hasPassword ? 'success' : 'neutral'} dot>
            {hasPassword ? 'Enabled' : 'Not set'}
          </StatusPill>
        </SettingRow>
      </SettingsSection>
    </div>
  );
}
