// ============================================================
// api/upload.ts (Vercel Edge Runtime - v2.14.0)
// [ARCHITECT UPGRADE] Pure Web API Transformation (No @vercel/node)
// [CRITICAL] FIXED: TS2307 Cannot find module '@vercel/node'
// [LOCATION] c:\Users\SAMSUNG\.gemini\antigravity\scratch\insight-spark-474-main\insight-spark-474-main\api\upload.ts
// ============================================================

import { handleUpload } from '@vercel/blob/client';

/**
 * [Vercel Edge Runtime Configuration]
 * @vercel/node 의존성을 완전히 제거하고 표준 Web API를 사용하여 빌드 안정성을 확보합니다.
 */
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  // --- [1] CORS 및 OPTIONS 요청 처리 (Edge standard) ---
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // --- [2] POST 요청 체크 ---
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // --- [3] Request Body 파싱 (Edge 방식) ---
    const body = await request.json();

    console.log(`[Edge Runtime Upload]: Initiating Handshake (v2.14.0)...`);

    // --- [4] handleUpload 실행 ---
    const jsonResponse = await handleUpload({
      body: body,
      request: request, 
      
      onBeforeGenerateToken: async (pathname) => {
        return {
          // [STABLE] 브라우저 가변성을 고려하여 허용 MIME 타입 극대화
          allowedContentTypes: [
            'audio/mp4',
            'video/mp4',           
            'application/octet-stream', 
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
            runtime: 'edge-v2.14.0',
            timestamp: new Date().toISOString()
          }),
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.log(`[Edge Runtime Upload]: ✅ COMPLETED: ${blob.url}`);
      },
    });

    // --- [5] JSON 응답 반환 (Edge Response) ---
    return new Response(JSON.stringify(jsonResponse), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
    });

  } catch (error: any) {
    console.error('[Edge Runtime Upload Error]:', error);
    
    return new Response(JSON.stringify({ error: error.message || 'MIME-Aligned Handshake Failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
