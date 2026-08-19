import { prisma } from '../config/db.js';
import { verifyPassword } from '../utils/password.js';
import { signAdminToken } from './adminTokenService.js';
import { ApiError } from '../middleware/errorHandler.js';

export async function login({ email, password }) {
  const admin = await prisma.superAdmin.findUnique({ where: { email } });

  // Constant-shape failure: whether the email doesn't exist or the password
  // is wrong, the response and timing profile should look the same — never
  // let this endpoint confirm which admin emails exist.
  const passwordHash =
    admin?.passwordHash ?? '$argon2id$v=19$m=65536,t=3,p=4$invalidinvalidinvalid';
  const valid = await verifyPassword(passwordHash, password);

  if (!admin || !valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = signAdminToken({ adminId: admin.id });
  return { accessToken, admin: { id: admin.id, email: admin.email, name: admin.name } };
}
