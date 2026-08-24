-- AlterEnum: reveals made from the Chrome extension get their own ledger
-- reason so spend is attributable ("Extension reveal · −4" vs "Reveal · −2").
ALTER TYPE "CreditReason" ADD VALUE 'EXTENSION_REVEAL';
