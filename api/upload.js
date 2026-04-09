// api/upload.js
// @vercel/blob의 클라이언트 사이드 업로드를 위한 표준 토큰 생성기
// AudioLab.tsx에서 handleUploadUrl로 참조됩니다.
import { handleUpload } from '@vercel/blob/client';

export default async function handler(request, response) {
  // CORS 설정 (필수)
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    const jsonResponse = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // 업로드 파일 타입 및 권한 제어
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
            timestamp: Date.now(),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('✅ [Blob Upload] Completed:', blob.url);
      },
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    console.error('❌ [Blob Token Error]:', error);
    return response.status(400).json({ error: error.message });
  }
}
