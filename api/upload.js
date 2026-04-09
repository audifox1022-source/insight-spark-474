// ============================================================
// api/upload.js (Root Level - Vercel Pure Serverless Node.js Handler)
// [ARCHITECT UPGRADE] Vercel Blob Perfect Handshake (v2.6.5)
// [LOCATION] c:\Users\SAMSUNG\.gemini\antigravity\scratch\insight-spark-474-main\insight-spark-474-main\api\upload.js
// [STABILITY] 전방위 CORS 허용 및 상세 에러 트레이싱
// ============================================================
import { handleUpload } from '@vercel/blob/client';

/**
 * [Vercel Serverless Function]
 * Vite 앱의 최상위 /api 폴더에 위치해야 Vercel이 서버리스 함수로 인식합니다.
 * @param {import('@vercel/node').VercelRequest} request
 * @param {import('@vercel/node').VercelResponse} response
 */
export default async function handler(request, response) {
  // --- [1] 전역 CORS 헤더 설정 (에러 응답 시에도 유지되어야 함) ---
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

  // --- [3] POST 요청만 수락 ---
  if (request.method !== 'POST') {
    console.warn(`[Blob API] ⚠️ Invalid Method: ${request.method}`);
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log(`[Blob API] 📥 Handshake Started: ${new Date().toISOString()}`);

  try {
    // Vercel Node 런타임은 application/json 타입의 body를 자동 파싱합니다.
    const body = request.body;
    
    if (!body) {
      console.error("[Blob API] ❌ Request body is missing or empty.");
      throw new Error("Request body is empty. Ensure Content-Type is application/json.");
    }

    /**
     * @vercel/blob handleUpload 핵심 로직
     */
    const jsonResponse = await handleUpload({
      body: body,
      request: request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        console.log(`[Blob API] 🔑 Generating Token for: ${pathname}`);
        
        // 오디오 관련 MIME 타입 화이트리스트
        return {
          allowedContentTypes: [
            'audio/mpeg', 
            'audio/mp4', 
            'audio/wav', 
            'audio/wave', 
            'audio/x-wav', 
            'audio/ogg', 
            'audio/x-m4a',
            'audio/webm'
          ],
          tokenPayload: JSON.stringify({
            timestamp: Date.now(),
            service: 'Insight-Spark-Audio-Lab'
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log(`[Blob API] ✅ Upload Completed: ${blob.url}`);
      },
    });

    console.log("[Blob API] 🤝 Handshake Successfully Completed");
    return response.status(200).json(jsonResponse);

  } catch (error) {
    console.error(`[Blob API] ❌ Critical Failure:`, error.message);
    
    // 에러 발생 시에도 CORS 헤더가 유지된 채로 400 또는 500 응답 반환
    return response.status(400).json({ 
      error: error.message,
      code: 'BLOB_HANDSHAKE_FAILED',
      suggestion: 'Check BLOB_READ_WRITE_TOKEN and Root /api location'
    });
  }
}
