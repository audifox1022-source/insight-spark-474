// ============================================================
// api/upload.ts (Standard Node.js Runtime - v2.9.0)
// [ARCHITECT RECOVERY] Reverting to Node.js due to Edge Runtime limitations
// [LOCATION] c:\Users\SAMSUNG\.gemini\antigravity\scratch\insight-spark-474-main\insight-spark-474-main\api\upload.ts
// [CRITICAL] Fixes "unsupported modules" build error & Stabilizes handshake
// ============================================================

import { handleUpload } from '@vercel/blob/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * [Vercel Node.js Serverless Function]
 * @vercel/blob handles Node.js streams internally, requiring the standard runtime.
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
    // Vercel 런타임이 자동으로 파싱했을 경우 req.body는 객체이며, 그렇지 않으면 문자열임.
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    console.log(`[Node.js Upload]: Initiating Vercel Blob Handshake (v2.9.0)...`);

    // --- [4] handleUpload 실행 ---
    const jsonResponse = await handleUpload({
      body: body,      // 파싱된 바디
      request: req,    // Node.js VercelRequest 객체
      
      onBeforeGenerateToken: async (pathname) => {
        return {
          // [STABLE] 모든 주요 오디오 MIME 타입 허용
          allowedContentTypes: [
            'audio/mp4',
            'audio/x-m4a',
            'audio/mpeg',
            'audio/wav',
            'audio/webm',
            'audio/aac',
            'audio/ogg',
            'audio/flac',
            'audio/x-wav'
          ],
          tokenPayload: JSON.stringify({
            runtime: 'nodejs-v2.9.0',
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
      error: error.message || 'Node.js Blob Handshake Failed' 
    });
  }
}
