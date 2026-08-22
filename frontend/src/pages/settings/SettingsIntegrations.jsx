import { Download, MailCheck, LifeBuoy } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Illustration } from '../../components/ui/illustrations.jsx';
import { SettingRow } from '../../components/ui/FormField.jsx';
import { SettingsSection } from './SettingsLayout.jsx';

// Honest state (docs/FEATURES.md): there are no third-party integrations
// yet. The section still earns its place by pointing at the two ways data
// leaves or enters DataPit today.
export function SettingsIntegrations() {
  return (
    <div className="flex flex-col gap-4">
      <SettingsSection title="Integrations">
        <EmptyState
          illustration={<Illustration.Plug />}
          title="No integrations yet"
          actions={
            <Button variant="secondary" icon={LifeBuoy} to="/app/tickets/new">
              Tell us which one you need
            </Button>
          }
        >
          CRM sync (Salesforce, HubSpot) and a Chrome extension are on the roadmap. Nothing is connected to
          this workspace today, and nothing leaves it unless you export it.
        </EmptyState>
      </SettingsSection>

      <SettingsSection title="Getting data in and out" description="What works right now.">
        <SettingRow
          title="CSV export"
          description="Export any list, or the current search results, as a CSV you can load into a CRM or a spreadsheet."
        >
          <Button variant="secondary" size="sm" icon={Download} to="/app/lists">
            Open lists
          </Button>
        </SettingRow>
        <SettingRow
          title="Email verifier"
          description="Check whether any email address is deliverable — free, not tied to a contact record."
          className="border-t border-border"
        >
          <Button variant="secondary" size="sm" icon={MailCheck} to="/app?view=tools">
            Open tool
          </Button>
        </SettingRow>
      </SettingsSection>
    </div>
  );
}
