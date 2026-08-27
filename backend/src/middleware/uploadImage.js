import multer from 'multer';
import { ApiError } from './errorHandler.js';

// Workspace logo upload. Small on purpose: the image is stored inline as a
// data: URI on the workspace row (workspaceService.setLogo), so the cap
// keeps the DB column — and the settings payload that returns it — modest.
// A logo/avatar never needs to be large.
export const MAX_LOGO_BYTES = 150 * 1024; // 150 KB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOGO_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, 'Logo must be a PNG, JPEG, or WebP image'));
  },
}).single('logo');

/** Wraps multer so its errors become ApiError shapes instead of a raw 500. */
export function uploadImage(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'Logo must be under 150KB'));
    next(new ApiError(400, err.message));
  });
}
