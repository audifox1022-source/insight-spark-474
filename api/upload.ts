// ============================================================
// api/upload.ts (Vercel Serverless Function - v2.15.0)
// [ARCHITECT UPGRADE] Node.js Runtime Restore (Serverless Environment)
// [CRITICAL] FIXED: Edge Function referencing unsupported modules (stream, crypto, etc.)
// [LOCATION] c:\Users\SAMSUNG\.gemini\antigravity\scratch\insight-spark-474-main\insight-spark-474-main\api\upload.ts
// ============================================================

import { handleUpload } from '@vercel/blob/client';
import { buildCorsHeaders, requireAuth } from './_auth.js';

/**
 * [Vercel Serverless Configuration]
 * Edge 런타임의 모듈 제약(stream, crypto 미지원) 이슈를 해결하기 위해 
 * 표준 Node.js 환경에서 Web API 스타일(Request, Response)을 사용합니다.
 * (runtime: 'edge' 설정을 의도적으로 제거함)
 */

export default async function handler(request: Request): Promise<Response> {
  const corsHeaders = buildCorsHeaders(request);

  // --- [1] CORS 및 OPTIONS 요청 처리 ---
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // --- [2] POST 요청 체크 ---
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // --- [3] Request Body 파싱 (표준 Web API 방식) ---
    const body = await request.json();

    console.log(`[Node.js Serverless Upload]: Initiating Handshake (v2.15.0)...`);

    // --- [4] handleUpload 실행 ---
    const jsonResponse = await handleUpload({
      body: body,
      request: request, 
      
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        await requireAuth(request, { clientPayload });

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
            runtime: 'nodejs-serverless-v2.15.0',
            timestamp: new Date().toISOString()
          }),
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.log(`[Node.js Serverless Upload]: ✅ COMPLETED: ${blob.url}`);
      },
    });

    // --- [5] JSON 응답 반환 (Web API Response) ---
    return new Response(JSON.stringify(jsonResponse), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('[Node.js Serverless Upload Error]:', error);
    
    return new Response(JSON.stringify({ error: error.message || 'MIME-Aligned Handshake Failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
