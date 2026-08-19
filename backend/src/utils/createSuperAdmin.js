// One-off CLI to bootstrap a super admin — there is deliberately no public
// signup form for this role (see routes/admin.js).
//
// Usage: node src/utils/createSuperAdmin.js <email> <password> <name>
import { prisma } from '../config/db.js';
import { hashPassword } from './password.js';

async function main() {
  const [, , email, password, ...nameParts] = process.argv;
  const name = nameParts.join(' ');

  if (!email || !password || !name) {
    console.error('Usage: node src/utils/createSuperAdmin.js <email> <password> <name>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.superAdmin.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });

  console.log(`Super admin ready: ${admin.email} (${admin.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
