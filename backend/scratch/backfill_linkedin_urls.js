// One-off data fix: contacts seeded before Contact.linkedinUrl existed
// never got backfilled, because seed.js's upsert uses `update: {}` (a
// deliberate no-op on existing rows) — so re-running the seed script does
// not fix this. Sets a demo LinkedIn URL for every contact that's missing
// one. No reindex needed: search hydrates the full contact row from
// Postgres per request (see searchService.js), so the ES document body
// doesn't need to carry this field.
import { prisma } from '../src/config/db.js';

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  const contacts = await prisma.contact.findMany({
    where: { linkedinUrl: null, redactedAt: null },
    select: { id: true, firstName: true, lastName: true },
  });

  console.log(`Backfilling linkedinUrl for ${contacts.length} contacts...`);

  for (const contact of contacts) {
    // Same names repeat across the demo dataset (e.g. multiple "Avery
    // Bennett" at different companies) — append a short id suffix so each
    // contact still gets a distinct URL rather than colliding slugs.
    const slug = `${slugify(contact.firstName)}-${slugify(contact.lastName)}-${contact.id.slice(0, 6)}`;
    await prisma.contact.update({
      where: { id: contact.id },
      data: { linkedinUrl: `https://www.linkedin.com/in/${slug}` },
    });
  }

  console.log('Backfill complete.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
