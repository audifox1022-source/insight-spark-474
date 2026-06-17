import multer from 'multer';

export const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
  'audio/x-wav',
]);

export const ALLOWED_AUDIO_EXTENSIONS = new Set([
  'aac',
  'flac',
  'm4a',
  'mp3',
  'mp4',
  'oga',
  'ogg',
  'wav',
  'webm',
]);

export const MAX_DIRECT_AUDIO_UPLOAD_BYTES = 50 * 1024 * 1024;
export const DEFAULT_BLOB_AUDIO_UPLOAD_BYTES = 100 * 1024 * 1024;

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getBlobAudioUploadLimit() {
  return parsePositiveInteger(process.env.BLOB_AUDIO_MAX_BYTES, DEFAULT_BLOB_AUDIO_UPLOAD_BYTES);
}

export function isAllowedAudioMimeType(mimeType) {
  return typeof mimeType === 'string' && ALLOWED_AUDIO_MIME_TYPES.has(mimeType.toLowerCase());
}

export function isAllowedAudioPath(pathname) {
  if (typeof pathname !== 'string') return false;
  const extension = pathname.split('?')[0].split('.').pop()?.toLowerCase();
  return Boolean(extension && ALLOWED_AUDIO_EXTENSIONS.has(extension));
}

export function createAudioUploadMiddleware() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_DIRECT_AUDIO_UPLOAD_BYTES, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!isAllowedAudioMimeType(file.mimetype)) {
        callback(new Error(`Unsupported audio type: ${file.mimetype || 'unknown'}`));
        return;
      }

      callback(null, true);
    },
  });
}
