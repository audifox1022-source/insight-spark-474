// ============================================================
// api/upload.ts (Root Level - Vercel Pure Serverless Node.ts Handler)
// [ARCHITECT UPGRADE] Vercel Blob Perfect Handshake (v2.6.8)
// [LOCATION] c:\Users\SAMSUNG\.gemini\antigravity\scratch\insight-spark-474-main\insight-spark-474-main\api\upload.ts
// [STABILITY] 전방위 CORS 허용 및 환경변수 BLOB_READ_WRITE_TOKEN 체크 강화
// ============================================================
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  // --- [1] 전역 CORS 헤더 설정 ---
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  Object.entries(headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  // --- [2] OPTIONS 요청 (Pre-flight) 즉시 응답 ---
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // --- [3] 환경 변수 체크 (CRITICAL) ---
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[Blob API] ❌ CRITICAL: BLOB_READ_WRITE_TOKEN is missing!");
    return response.status(500).json({ 
      error: "Server configuration error: BLOB_READ_WRITE_TOKEN is missing.",
      code: "ENV_MISSING"
    });
  }

  // --- [4] POST 요청 수락 ---
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = request.body as HandleUploadBody;
    
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        console.log(`[Blob API] 🔑 Generating Token for: ${pathname}`);
        return {
          allowedContentTypes: [
            'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4v', 'audio/x-m4a', 'audio/webm'
          ],
          tokenPayload: JSON.stringify({
            timestamp: Date.now(),
            service: 'Audio-Lab-Forensic'
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log(`[Blob API] ✅ Upload Completed: ${blob.url}`);
      },
    });

    return response.status(200).json(jsonResponse);

  } catch (error: any) {
    console.error(`[Blob API] ❌ Failure: ${error.message}`);
    return response.status(400).json({ 
      error: error.message,
      code: 'BLOB_HANDSHAKE_FAILED'
    });
  }
}
