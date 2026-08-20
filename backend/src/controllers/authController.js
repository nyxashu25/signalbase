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
  setRefreshCookie(res, result.refreshCookieValue);
  res.status(201).json({
    accessToken: result.accessToken,
    user: result.user,
    workspace: result.workspace,
    role: result.role,
  });
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

export async function me(req, res) {
  const result = await authService.getCurrentUser(req.auth);
  res.json(result);
}
