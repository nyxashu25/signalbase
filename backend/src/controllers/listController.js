import * as listService from '../services/listService.js';
import { attachRevealStatus } from '../services/maskingService.js';
import { toCsv } from '../utils/csv.js';
import { sendCsv, COMPANY_COLUMNS, CONTACT_COLUMNS } from './searchController.js';
import { resolveReservationForCommit } from '../services/creditService.js';
import { prisma } from '../config/db.js';

export async function index(req, res) {
  const lists = await listService.listLists(req.auth.workspaceId);
  res.json({ lists });
}

export async function create(req, res) {
  const list = await listService.createList(req.auth.workspaceId, req.auth.userId, req.body);
  res.status(201).json({ list });
}

export async function show(req, res) {
  const list = await listService.getList(req.auth.workspaceId, req.params.id);
  res.json({ list });
}

export async function destroy(req, res) {
  await listService.deleteList(req.auth.workspaceId, req.params.id);
  res.status(204).end();
}

export async function addItem(req, res) {
  const item = await listService.addItem(req.auth.workspaceId, req.params.id, req.body);
  res.status(201).json({ item });
}

export async function removeItem(req, res) {
  await listService.removeItem(req.auth.workspaceId, req.params.id, req.params.itemId);
  res.status(204).end();
}

function csvSafeFilename(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug || 'list'}.csv`;
}

export async function exportCsv(req, res) {
  const list = await listService.getList(req.auth.workspaceId, req.params.id);
  const filename = csvSafeFilename(list.name);

  let csv;
  if (list.type === 'CONTACTS') {
    const contacts = await attachRevealStatus(
      req.auth.workspaceId,
      list.items.map((item) => item.contact),
    );
    csv = toCsv(contacts, CONTACT_COLUMNS);
  } else {
    const companies = list.items.map((item) => item.company);
    csv = toCsv(companies, COMPANY_COLUMNS);
  }

  const { amount } = await resolveReservationForCommit(req.reservationId, {
    workspaceId: req.auth.workspaceId,
  });
  await prisma.creditLedgerEntry.create({
    data: { workspaceId: req.auth.workspaceId, delta: -amount, reason: 'CSV_EXPORT' },
  });

  sendCsv(res, filename, csv);
}
