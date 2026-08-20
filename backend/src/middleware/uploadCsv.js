import multer from 'multer';
import { ApiError } from './errorHandler.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(null, true);
    }
    cb(new ApiError(400, 'Only .csv files are accepted'));
  },
}).single('file');

/** Wraps multer so its errors become ApiError shapes instead of a raw 500. */
export function uploadCsv(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'CSV must be under 5MB'));
    next(new ApiError(400, err.message));
  });
}
