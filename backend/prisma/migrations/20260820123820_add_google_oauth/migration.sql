-- Make passwordHash optional: a Google-only account never sets one.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Google "sub" claim, set once an account signs in with Google.
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
