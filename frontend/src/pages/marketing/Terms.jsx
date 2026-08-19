import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { LegalDoc, LegalSection } from '../../components/marketing/LegalDoc.jsx';

export function Terms() {
  return (
    <div className="min-h-screen bg-bg">
      <MarketingNav />
      <LegalDoc title="Terms of Service" updated="August 19, 2026">
        <LegalSection title="1. Your account">
          <p>
            You're responsible for the activity that happens under your workspace, including actions
            taken by anyone you invite into it. Keep your credentials to yourself — we'll never ask
            for your password outside the sign-in form.
          </p>
        </LegalSection>
        <LegalSection title="2. Credits">
          <p>
            Credits are granted monthly per your plan and can be purchased in addition. A credit is
            spent only when a reveal succeeds — search itself is always free, and a failed or
            expired reveal is automatically refunded. Credits do not roll over between billing
            cycles and have no cash value.
          </p>
        </LegalSection>
        <LegalSection title="3. Acceptable use">
          <p>
            Don't use DataPit to scrape, resell, or bulk-export the underlying contact and company
            database outside of normal product use, and don't use revealed contact information for
            anything unlawful, including unsolicited bulk email that violates CAN-SPAM, GDPR, or
            equivalent regulations in your jurisdiction.
          </p>
        </LegalSection>
        <LegalSection title="4. Plans and billing">
          <p>
            Paid plans renew automatically until cancelled. You can upgrade, downgrade, or cancel
            from your workspace's billing page at any time; changes take effect at the next billing
            cycle unless stated otherwise at checkout.
          </p>
        </LegalSection>
        <LegalSection title="5. Termination">
          <p>
            We may suspend or terminate a workspace that violates these terms, including abuse of
            the credit system or the acceptable-use policy above. You can close your workspace at
            any time; we'll retain records only as required by law or as described in our Privacy
            Policy.
          </p>
        </LegalSection>
        <LegalSection title="6. No warranty">
          <p>
            DataPit is provided as-is. We work to keep contact data accurate and verification
            reliable, but we don't guarantee that every revealed email will be deliverable
            indefinitely — people change jobs.
          </p>
        </LegalSection>
      </LegalDoc>
      <MarketingFooter />
    </div>
  );
}
