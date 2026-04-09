// ============================================================
// api/upload.ts (Standard Node.js Runtime - v2.13.0)
// [ARCHITECT UPGRADE] MIME Type Synchronization & Stabilization (v2.13.0)
// [LOCATION] c:\Users\SAMSUNG\.gemini\antigravity\scratch\insight-spark-474-main\insight-spark-474-main\api\upload.ts
// [CRITICAL] Expanded allowedContentTypes and set 500MB hard limit
// ============================================================

import { handleUpload } from '@vercel/blob/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * [Vercel Node.js Serverless Function]
 * MIME 타입 불일치로 인한 400 에러를 방지하기 위해 허용 목록을 극대화합니다.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- [1] CORS 헤더 설정 (Serverless standard) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- [2] POST 요청 체크 ---
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // --- [3] Request Body 안전 파싱 ---
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    console.log(`[Node.js Upload]: Initiating MIME-Aligned Handshake (v2.13.0)...`);

    // --- [4] handleUpload 실행 ---
    const jsonResponse = await handleUpload({
      body: body,
      request: req,
      
      onBeforeGenerateToken: async (pathname) => {
        return {
          // [STABLE] 브라우저 가변성을 고려하여 허용 MIME 타입 극대화
          allowedContentTypes: [
            'audio/mp4',
            'video/mp4',           // .m4a를 비디오로 인식하는 브라우저 대응
            'application/octet-stream', // 타입을 인식하지 못하는 케이스 대응
            'audio/x-m4a',
            'audio/mpeg',
            'audio/wav',
            'audio/webm',
            'audio/aac',
            'audio/ogg',
            'audio/flac',
            'audio/x-wav'
          ],
          // [CRITICAL] 500MB 용량 제한 강제 적용
          maximumSizeInBytes: 524288000, 
          tokenPayload: JSON.stringify({
            runtime: 'nodejs-v2.13.0',
            timestamp: new Date().toISOString()
          }),
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.log(`[Node.js Upload]: ✅ COMPLETED: ${blob.url}`);
      },
    });

    // --- [5] JSON 응답 반환 ---
    return res.status(200).json(jsonResponse);

  } catch (error: any) {
    console.error('[Node.js Upload API Error]:', error);
    
    return res.status(400).json({ 
      error: error.message || 'MIME-Aligned Handshake Failed' 
    });
  }
}
