// api/upload.js
// @vercel/blob의 클라이언트 사이드 업로드를 위한 권한 대행(Proxy/Token) API
// [STABILITY] CORS 대응 및 에러 핸들링 강화 (v2.6.2)
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
    const jsonResponse = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        /**
         * [SECURITY] 업로드 전 토큰 생성 보안 로직
         * 여기서 사용자 인증(Session)을 체크하거나 특정 파일 타입만 허용할 수 있습니다.
         */
        console.log(`[Blob Auth] Generating token for: ${pathname}`);
        
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
            userId: 'work-ai-user', // 실제 연동 시 세션 ID 등으로 교체 가능
            uploadTime: new Date().toISOString(),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        /**
         * [CALLBACK] 업로드 완료 후 실행되는 로직
         * 데이터베이스에 URL을 저장하거나 추가 작업을 수행할 수 있습니다.
         */
        console.log('✅ [Blob Pipeline] Upload Completed:', blob.url);
        
        try {
          const { userId } = JSON.parse(tokenPayload);
          console.log(`[Blob Pipeline] Verified for user: ${userId}`);
        } catch (e) {
          console.error('[Blob Pipeline] Payload parse error');
        }
      },
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    console.error('❌ [Blob Auth Error]:', error);
    // 400 Bad Request와 함께 명확한 에러 메시지 반환
    return response.status(400).json({ 
      error: error.message || 'Vercel Blob 인증에 실패했습니다.',
      code: 'BLOB_AUTH_FAILED'
    });
  }
}
