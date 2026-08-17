import { prisma } from '../config/db.js';

export async function isSuppressed(workspaceId, email) {
  const entry = await prisma.suppressionEntry.findUnique({
    where: { workspaceId_email: { workspaceId, email } },
  });
  return Boolean(entry);
}

export async function addSuppression(workspaceId, email, reason) {
  await prisma.suppressionEntry.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    update: {},
    create: { workspaceId, email, reason },
  });
}
