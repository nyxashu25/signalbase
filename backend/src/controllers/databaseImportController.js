import * as databaseImportService from '../services/databaseImportService.js';
import * as adminService from '../services/adminService.js';
import { ApiError } from '../middleware/errorHandler.js';

export async function upload(req, res) {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded — attach a CSV as "file"');
  }
  const rows = databaseImportService.parseRpfCsv(req.file.buffer);
  const batch = await databaseImportService.createImportBatch({
    rows,
    filename: req.file.originalname,
    superAdminId: req.superAdmin.adminId,
  });
  res.status(202).json(batch);
}

export async function list(req, res) {
  res.json(await databaseImportService.listImportBatches());
}

export async function detail(req, res) {
  res.json(await databaseImportService.getImportBatch(req.params.batchId));
}

export async function approve(req, res) {
  const batch = await databaseImportService.approveImportBatch(
    req.params.batchId,
    req.superAdmin.adminId,
  );
  await adminService.recordAuditLog({
    superAdminId: req.superAdmin.adminId,
    action: 'APPROVE_IMPORT',
    metadata: {
      batchId: batch.id,
      filename: batch.filename,
      insertedContacts: batch.insertedContacts,
      insertedCompanies: batch.insertedCompanies,
    },
  });
  res.json(batch);
}
