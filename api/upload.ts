// ============================================================
// api/upload.ts (Vercel Serverless Function)
// ============================================================

import { handleUpload } from '@vercel/blob/client';
import {
  ALLOWED_AUDIO_MIME_TYPES,
  getBlobAudioUploadLimit,
  isAllowedAudioPath,
} from './_audio-upload.js';
import { applyCorsHeaders, requireAuth } from './_auth.js';

export default async function handler(request, response) {
  applyCorsHeaders(response, request);

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (pathname, clientPayload) => {
        await requireAuth(request, { clientPayload });

        if (!isAllowedAudioPath(pathname)) {
          throw new Error('Unsupported audio file extension.');
        }

        return {
          allowedContentTypes: [...ALLOWED_AUDIO_MIME_TYPES],
          maximumSizeInBytes: getBlobAudioUploadLimit(),
          tokenPayload: JSON.stringify({
            runtime: 'nodejs-serverless-v2.15.0',
            timestamp: new Date().toISOString(),
          }),
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.info('[Upload] Blob upload completed.', {
          pathname: blob.pathname,
          size: blob.size,
          contentType: blob.contentType,
        });
      },
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    console.error('[Upload] Blob upload failed:', error);

    return response.status(400).json({
      error: error.message || 'Audio upload handshake failed',
    });
  }
}
