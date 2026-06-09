// api/blob-token.js
// @vercel/blob의 클라이언트 사이드 업로드를 위한 토큰 생성기
import { handleUpload } from '@vercel/blob/client';
import { applyCorsHeaders, requireAuth } from './_auth.js';

export default async function handler(request, response) {
  applyCorsHeaders(response, request);

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    const jsonResponse = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        await requireAuth(request, { clientPayload });

        /*
         * 사용자가 업로드 권한을 제어할 수 있는 곳입니다.
         * 여기서는 모든 업로드를 허용하지만, 실제 서비스에서는 세션 체크 등을 수행할 수 있습니다.
         */
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
            // 추가적인 메타데이터를 토큰에 담을 수 있습니다.
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // 업로드가 완료되었을 때 서버 측에서 수행할 작업 (예: DB 업데이트)
        console.log('✅ Blob upload completed:', blob.url);
      },
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    console.error('❌ Blob Token Generation Error:', error);
    return response.status(400).json({ error: error.message });
  }
}
