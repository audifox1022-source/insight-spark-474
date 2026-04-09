// ============================================================
// api/upload.ts (Vercel Edge Runtime - v2.8.0)
// [ARCHITECT UPGRADE] Web standard Request/Response architecture
// [LOCATION] c:\Users\SAMSUNG\.gemini\antigravity\scratch\insight-spark-474-main\insight-spark-474-main\api\upload.ts
// [CRITICAL] Fixes Node.js/Web API mismatch causing 400/CORS crashes
// ============================================================

import { handleUpload } from '@vercel/blob/client';

/**
 * [VITAL] Vercel Edge Runtime 선언
 * 이 설정은 이 함수가 Node.js가 아닌 Edge 환경에서 실행되도록 보장합니다.
 * Edge 환경은 Web 표준 Request/Response 객체를 네이티브로 지원합니다.
 */
export const config = {
  runtime: 'edge',
};

/**
 * [Edge Standard Handler]
 * @param request Web API standard Request object
 */
export default async function handler(request: Request) {
  // --- [1] POST 요청만 수락 ---
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // --- [2] Request Body 파싱 (Edge standard) ---
    const body = await request.json();

    // --- [3] handleUpload 실행 (Web standard Request 호환) ---
    const jsonResponse = await handleUpload({
      body: body,
      request: request, // Edge Runtime 상에서 정합성 완벽 보장
      
      onBeforeGenerateToken: async (pathname) => {
        console.log(`[Edge Upload]: Handshaking for path: ${pathname}`);
        
        return {
          // [USER REQUEST] 모든 오디오 MIME 타입 명시적 허용
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
            runtime: 'edge-v2.8.0',
            timestamp: new Date().toISOString()
          }),
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log(`[Edge Upload]: ✅ COMPLETED: ${blob.url}`);
      },
    });

    // --- [4] Web Standard Response 반환 ---
    return new Response(JSON.stringify(jsonResponse), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // CORS 안전장치
      },
    });

  } catch (error: any) {
    console.error('[Edge Upload API Error]:', error);
    
    // 우아한 에러 응답
    return new Response(JSON.stringify({ 
      error: error.message || 'Edge Blob Handshake Failed' 
    }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
