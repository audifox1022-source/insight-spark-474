// api/upload.js
// @vercel/blob의 클라이언트 사이드 업로드를 위한 권한 대행(Proxy/Token) API
// [STABILITY] CORS 대응 및 핸드셰이크 정밀 로깅 (v2.6.3)
import { handleUpload } from '@vercel/blob/client';

export default async function handler(request, response) {
  // CORS 설정 (클라이언트 브라우저에서의 직접 호출 허용)
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Pre-flight 요청 처리
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    console.log(`[Prod-Blob-Handshake] 🚀 Start: ${request.method} ${request.url}`);
    
    /**
     * handleUpload: Vercel Blob 클라이언트 업로드를 위한 핸드셰이크 핵심 함수
     * 1. 클라이언트에서 upload() 호출 시 이 엔드포인트로 토큰 발급을 요청함.
     * 2. onBeforeGenerateToken에서 허용 여부를 결정하고 토큰을 발급함.
     */
    const jsonResponse = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        console.log(`[Prod-Blob-Handshake] 🔑 Token Request for: ${pathname}`);
        
        return {
          allowedContentTypes: [
            'audio/mpeg', 
            'audio/wav', 
            'audio/ogg', 
            'audio/webm', 
            'audio/flac', 
            'audio/x-m4a',
            'audio/mp4'
          ],
          tokenPayload: JSON.stringify({
            userId: 'work-ai-prod-user',
            uploadTime: new Date().toISOString(),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('✅ [Prod-Blob-Handshake] Finalized:', blob.url);
      },
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    console.error('❌ [Prod-Blob-Handshake Error]:', error);
    return response.status(400).json({ 
      error: error.message || '인증 핸드셰이크 실패',
      code: 'BLOB_HANDSHAKE_FAILED'
    });
  }
}
