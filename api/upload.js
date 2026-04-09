// ============================================================
// api/upload.js (Root Level - Vercel Pure Serverless Node.js Handler)
// [ARCHITECT UPGRADE] Vercel Blob 인증 핸드셰이크 (v2.6.4)
// [CORE] export default async function handler(request, response)
// [STABILITY] CORS 대응 및 오디오 MIME 타입 엄격 관리
// ============================================================
import { handleUpload } from '@vercel/blob/client';

/**
 * [Vercel Serverless Function]
 * Vite + Vercel 환경에서 루트 /api 폴더에 위치하며, 
 * 클라이언트의 upload() 호출에 대한 보안 토큰 발급 및 콜백을 처리합니다.
 */
export default async function handler(request, response) {
  console.log(`[Blob API] 📥 Incoming Handshake Request: ${request.method}`);

  // 1. CORS Pre-flight Handling (Pre-flight 및 일반 요청 모두 대응)
  response.setHeader('Access-Control-Allow-Origin', '*'); 
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // 2. HTTP Method Validation
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    /**
     * @vercel/blob handleUpload 핵심 로직
     * body: 클라이언트가 보낸 핸드셰이크 데이터 (필수)
     * onBeforeGenerateToken: 업로드 권한을 승인하는 서버측 가교
     */
    const jsonResponse = await handleUpload({
      body: request.body, // Vercel Node 런타임에서 자동 파싱된 JSON
      request,
      onBeforeGenerateToken: async (pathname) => {
        console.log(`[Blob API] 🔑 Token Requested for: ${pathname}`);
        
        // [SECURITY] 오디오 관련 확장자 및 타입만 허용하도록 화이트리스트 적용
        return {
          allowedContentTypes: [
            'audio/mpeg', 
            'audio/mp4', 
            'audio/wav', 
            'audio/wave', 
            'audio/x-wav', 
            'audio/ogg', 
            'audio/x-m4a',
            'audio/midi',
            'audio/x-midi',
            'audio/webm'
          ],
          tokenPayload: JSON.stringify({
            timestamp: Date.now(),
            service: 'WorkAI-Audio-Inference'
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log(`[Blob API] ✅ Upload Completed: ${blob.url}`);
        // 필요 시 DB 업데이트 로직 추가 가능
      },
    });

    // 3. 최종 토큰/응답 반환
    return response.status(200).json(jsonResponse);
  } catch (error) {
    console.error(`[Blob API] ❌ Critical Failure:`, error.message);
    return response.status(400).json({ error: error.message });
  }
}
