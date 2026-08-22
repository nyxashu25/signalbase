import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUpdateProfileMutation } from '../../api/authApi.js';
import { updateUser } from '../../store/authSlice.js';
import { Button } from '../../components/ui/Button.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { LetterAvatar } from '../../components/ui/LetterAvatar.jsx';
import { StatusPill } from '../../components/ui/StatusPill.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { SettingsSection } from './SettingsLayout.jsx';

export function SettingsProfile() {
  const user = useSelector((s) => s.auth.user);
  const role = useSelector((s) => s.auth.role);
  const dispatch = useDispatch();
  const toast = useToast();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const [name, setName] = useState(user?.name ?? '');
  const dirty = name.trim() !== (user?.name ?? '') && name.trim().length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const result = await updateProfile({ name: name.trim() }).unwrap();
      dispatch(updateUser(result.user));
      toast.success('Profile saved');
    } catch (err) {
      toast.error('Could not save profile', err.data?.error?.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit}>
        <SettingsSection
          title="Profile"
          description="How you appear to teammates and on the tickets you raise."
          footer={
            <Button type="submit" variant="primary" loading={isLoading} disabled={!dirty}>
              Save changes
            </Button>
          }
        >
          <div className="flex items-center gap-4">
            <LetterAvatar name={name || user?.name || '?'} size="xl" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-text">{user?.name}</p>
              <p className="truncate text-sm text-text-muted">{user?.email}</p>
              {role && (
                <StatusPill tone="accent" className="mt-1.5">
                  {role}
                </StatusPill>
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              autoComplete="name"
            />
            <FormField label="Email" hint="Your sign-in identity — contact support to change it.">
              <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface-sunken px-3 text-sm text-text-muted">
                <span className="truncate">{user?.email}</span>
                {user?.emailVerified && (
                  <StatusPill tone="success" className="ml-auto">
                    Verified
                  </StatusPill>
                )}
              </div>
            </FormField>
          </div>
        </SettingsSection>
      </form>
    </div>
  );
}
