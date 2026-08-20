import { verifyEmail } from '../services/emailVerifierService.js';

export async function checkEmail(req, res) {
  const { email } = req.body;
  const result = await verifyEmail(email);
  res.json({ email, ...result });
}
