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
  res.status(201).json({ status: 'success', data: { urls: validUrls } });
};

export const proxyImage = async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl || typeof imageUrl !== "string") {
    res.setHeader("Content-Type", "image/svg+xml");
    return res.send(generateFallbackSvg("Invalid Image"));
  }

  if (imageUrl.startsWith("data:")) {
    const matches = imageUrl.match(/^data:(.+?);base64,(.+)$/);
    if (matches) {
      res.setHeader("Content-Type", matches[1]);
      return res.send(Buffer.from(matches[2], "base64"));
    }
  }

  try {
    const upstreamResp = await fetch(imageUrl, {
      signal: AbortSignal.timeout(2000),
    });

    if (upstreamResp.ok) {
      const contentType = upstreamResp.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buffer = await upstreamResp.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }
  } catch (err) {
    console.warn(`[ImageProxy] Upstream cover image fetch timed out or failed (${imageUrl}):`, err.message);
  }

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.send(generateFallbackSvg("Book Cover"));
};

const generateFallbackSvg = (title) => `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" fill="none">
  <rect width="400" height="600" fill="#E8E5EE"/>
  <rect x="30" y="30" width="340" height="540" rx="16" fill="#D7D2E2"/>
  <path d="M160 260C160 248.954 168.954 240 180 240H220C231.046 240 240 248.954 240 260V340C240 351.046 231.046 360 220 360H180C168.954 360 160 351.046 160 340V260Z" fill="#B9B0CC"/>
  <text x="200" y="310" text-anchor="middle" fill="#5F5774" font-family="sans-serif" font-size="20" font-weight="bold">Brana Library</text>
  <text x="200" y="340" text-anchor="middle" fill="#8980A0" font-family="sans-serif" font-size="14">${title}</text>
</svg>
`;
