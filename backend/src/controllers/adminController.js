import * as adminService from '../services/adminService.js';
import * as paymentSettingsService from '../services/paymentSettingsService.js';

export async function getOverview(req, res) {
  res.json(await adminService.getOverview());
}

export async function getUsage(req, res) {
  res.json(await adminService.getUsage());
}

export async function listUsers(req, res) {
  res.json(await adminService.listUsers(req.validatedQuery));
}

export async function getUserDetail(req, res) {
  res.json(await adminService.getUserDetail(req.params.userId));
}

export async function suspendUser(req, res) {
  await adminService.suspendUser(req.params.userId);
  res.status(204).end();
}

export async function unsuspendUser(req, res) {
  await adminService.unsuspendUser(req.params.userId);
  res.status(204).end();
}

export async function addCredits(req, res) {
  const result = await adminService.addCredits(req.params.userId, req.body.amount);
  res.json(result);
}

export async function updateUserPlan(req, res) {
  const result = await adminService.updateUserPlan(req.params.userId, req.body.plan);
  res.json(result);
}

export async function getBillingOverview(req, res) {
  res.json(await adminService.getBillingOverview());
}

export async function listTransactions(req, res) {
  res.json(await adminService.listTransactions(req.validatedQuery));
}

export async function getStripeSettings(req, res) {
  res.json(await paymentSettingsService.getStripeSettings());
}

export async function saveStripeSettings(req, res) {
  const result = await paymentSettingsService.saveStripeSettings(req.body, req.superAdmin.adminId);
  res.json(result);
}
