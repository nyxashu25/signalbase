import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { LegalDoc, LegalSection } from '../../components/marketing/LegalDoc.jsx';

export function Privacy() {
  return (
    <div className="min-h-screen bg-bg">
      <MarketingNav />
      <LegalDoc title="Privacy Policy" updated="August 19, 2026">
        <LegalSection title="1. What we collect">
          <p>
            When you create a workspace, we collect your name, email address, and a hashed copy of
            your password — never the password itself. When you use search and reveal, we record
            which contacts your workspace has revealed and when, so we can enforce workspace-wide
            reveal sharing and bill credits accurately.
          </p>
        </LegalSection>
        <LegalSection title="2. How we use it">
          <p>
            Account data is used to authenticate you, run the credit ledger, and operate the product
            features you've enrolled in — search, reveal, lists, and sequences. We do not sell your
            workspace's data to third parties.
          </p>
        </LegalSection>
        <LegalSection title="3. Contact and company data">
          <p>
            The contact and company records searchable in DataPit are sourced and enriched
            independently of any one workspace — they are not private to you. A data subject can
            request removal of their information at any time; once processed, that record is
            permanently excluded from search and reveal for every workspace, not just the one that
            requested it.
          </p>
        </LegalSection>
        <LegalSection title="4. Data retention">
          <p>
            Account and billing records are retained for as long as your workspace is active, and
            for a reasonable period afterward to satisfy legal and accounting obligations. You can
            request deletion of your account data at any time.
          </p>
        </LegalSection>
        <LegalSection title="5. Security">
          <p>
            Passwords are hashed with argon2id. Access tokens are short-lived; refresh sessions are
            stored server-side and rotated on every use, so a stolen token has a narrow window of
            use. Credit balances move through an atomic, auditable ledger.
          </p>
        </LegalSection>
        <LegalSection title="6. Your rights">
          <p>
            Depending on where you're located, you may have rights to access, correct, export, or
            delete your personal data. Contact us and we'll act on a verified request.
          </p>
        </LegalSection>
      </LegalDoc>
      <MarketingFooter />
    </div>
  );
}
