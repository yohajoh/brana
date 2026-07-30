/**
 * Media Controller
 * POST /api/media/upload?folder=brana/physical-books/covers
 *
 * Accepts up to 10 images in the "files" multipart field.
 * Uploads each to Cloudinary on the server and returns the secure URLs.
 * The frontend sends these URLs as plain strings when creating/updating entities.
 */

import { uploadImageToCloudinary } from '../utils/cloudinary.js';
import { AppError } from '../middlewares/error.middleware.js';

export const uploadFiles = async (req, res) => {
  const files = /** @type {Express.Multer.File[]} */ (req.files || []);
  if (!files.length) throw new AppError('No files provided', 400);

  const folder = req.query.folder?.toString().trim() || 'brana';

  // Fan out to Cloudinary in parallel — each file is an independent request
  // so there are no shared timestamps or signature collisions.
  const urls = await Promise.all(
    files.map((file) => uploadImageToCloudinary(file, { folder })),
  );

  const validUrls = urls.filter(Boolean);
  if (!validUrls.length) throw new AppError('All uploads failed', 502);

  res.status(201).json({ status: 'success', data: { urls: validUrls } });
};
