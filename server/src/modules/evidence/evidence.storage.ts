import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';

// Ensure evidence storage directory exists outside webroot
const storageDir = path.resolve(process.cwd(), env.EVIDENCE_STORAGE_PATH);
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Allowed MIME types for digital forensics demonstration
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream', // often PCAP or raw binary forensic dumps
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.txt',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.zip',
  '.pcap',
  '.log',
  '.raw',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, storageDir);
  },
  filename: (_req, file, cb) => {
    // Generate secure randomized UUID filename to prevent path traversal and collision
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin';
    const randomizedName = `${crypto.randomUUID()}${safeExt}`;
    cb(null, randomizedName);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const error: AppError = new Error(
      `Unsupported file type '${ext}'. Allowed types: PDF, TXT, CSV, PNG, JPG, ZIP, PCAP, LOG.`
    );
    error.statusCode = 400;
    return cb(error);
  }

  cb(null, true);
};

export const evidenceUpload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES, // 50MB
  },
  fileFilter,
});
