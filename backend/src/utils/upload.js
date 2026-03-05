import multer from 'multer';
import { AppError } from '../middlewares/error.middleware.js';

const storage = multer.memoryStorage();

const fileFilter = (allowedMimes) => (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`, 400), false);
  }
};

/** For PDF uploads (digital books) */
export const uploadPDF = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: fileFilter(['application/pdf']),
});

/** Alias for consistent naming across route files */
export const uploadPdf = uploadPDF;

/** For image uploads (authors, book covers, book images) */
export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp']),
});

/** For digital book creation: fields pdf + coverImage */
export const uploadBookFiles = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type.', 400), false);
    }
  },
});
