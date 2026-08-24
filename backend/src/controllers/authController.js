import * as authService from '../services/authService.js';
import { env, isProduction } from '../config/env.js';

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: env.REFRESH_TOKEN_TTL_SECONDS * 1000,
  path: '/api/v1/auth',
};

function setRefreshCookie(res, value) {
  res.cookie(REFRESH_COOKIE, value, cookieOptions);
}

export async function register(req, res) {
  const result = await authService.register(req.body);
  // No cookie/session here — registration now only creates the account and
  // emails a confirm link; verifyEmail below is what actually logs them in.
  res.status(202).json({ pendingVerification: true, email: result.email });
}

export async function verifyEmail(req, res) {
  const result = await authService.verifyEmail(req.body.token);
  setRefreshCookie(res, result.refreshCookieValue);
  res.json({
    accessToken: result.accessToken,
    user: result.user,
    workspace: result.workspace,
    role: result.role,
  });
}

export async function forgotPassword(req, res) {
  res.json(await authService.requestPasswordReset(req.body.email));
}

export async function resetPassword(req, res) {
  res.json(await authService.resetPassword(req.body.token, req.body.newPassword));
}

export async function inviteInfo(req, res) {
  res.json(await authService.getInviteInfo(req.validatedQuery.token));
}

export async function acceptInvite(req, res) {
  const result = await authService.acceptInvite(req.body.token, req.body);
  setRefreshCookie(res, result.refreshCookieValue);
  res.json({
    accessToken: result.accessToken,
    user: result.user,
    workspace: result.workspace,
    role: result.role,
  });
}

export async function listWorkspaces(req, res) {
  res.json({ workspaces: await authService.listMyWorkspaces(req.auth) });
}

export async function switchWorkspace(req, res) {
  const result = await authService.switchWorkspace(req.auth.userId, req.body.workspaceId);
  setRefreshCookie(res, result.refreshCookieValue);
  res.json({
    accessToken: result.accessToken,
    user: result.user,
    workspace: result.workspace,
    role: result.role,
  });
}

export async function resendVerification(req, res) {
  res.json(await authService.resendVerificationEmail(req.body.email));
}

export async function login(req, res) {
  const result = await authService.login(req.body);
  setRefreshCookie(res, result.refreshCookieValue);
  res.json({
    accessToken: result.accessToken,
    user: result.user,
    workspace: result.workspace,
    role: result.role,
  });
}

export async function google(req, res) {
  const result = await authService.loginWithGoogle(req.body.credential);
  setRefreshCookie(res, result.refreshCookieValue);
  res.json({
    accessToken: result.accessToken,
    user: result.user,
    workspace: result.workspace,
    role: result.role,
  });
}

export async function refresh(req, res) {
  const result = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
  setRefreshCookie(res, result.refreshCookieValue);
  res.json({ accessToken: result.accessToken });
}

export async function logout(req, res) {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, { path: cookieOptions.path });
  res.status(204).end();
}

export async function completeTutorial(req, res) {
  res.json(await authService.completeTutorial(req.auth.userId));
}

export async function updateProfile(req, res) {
  res.json(await authService.updateProfile(req.auth.userId, req.body));
}

export async function updatePreferences(req, res) {
  res.json(await authService.updatePreferences(req.auth.userId, req.body));
}

export async function changePassword(req, res) {
  res.json(await authService.changePassword(req.auth.userId, req.body));
}

export async function me(req, res) {
  const result = await authService.getCurrentUser(req.auth);
  res.json(result);
}
