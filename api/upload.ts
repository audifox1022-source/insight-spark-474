// ============================================================
// api/upload.ts (Pure Vercel Serverless Function - v2.7.0)
// [ARCHITECT UPGRADE] Vercel Blob Robust Handshake & Body Parsing
// [LOCATION] c:\Users\SAMSUNG\.gemini\antigravity\scratch\insight-spark-474-main\insight-spark-474-main\api\upload.ts
// [CRITICAL] Full Audio MIME Type Coverage & Secure Parsing
// ============================================================

import { handleUpload } from '@vercel/blob/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * [Vercel Node.js Standard Structure]
 * @param req VercelRequest
 * @param res VercelResponse
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- [1] 전역 CORS 헤더 설정 (Brute-force 허용) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 (Pre-flight) 즉시 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- [2] 환경 변수 체크 (CRITICAL) ---
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[Upload API Error]: BLOB_READ_WRITE_TOKEN is missing!");
    return res.status(500).json({ 
      error: "Server missing BLOB_READ_WRITE_TOKEN env variable." 
    });
  }

  // --- [3] POST 요청만 수락 ---
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // --- [4] Request Body 안전 파싱 (User Request 반영) ---
    // Vercel 런타임에 따라 Body가 이미 객체이거나 문자열일 수 있음
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    console.log(`[Upload API]: Initiating Vercel Blob Handshake...`);

    // --- [5] handleUpload 실행 ---
    const jsonResponse = await handleUpload({
      body: body,      // 파싱된 바디 전달
      request: req,    // 원본 리퀘스트 컨텍스트 전달
      
      /**
       * [VITAL] 토큰 생성 전 오디오 전용 화이트리스트 명시
       * 이 부분이 없으면 기본적으로 이미지(png, jpg 등)만 허용되어 400 에러 발생 가능
       */
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        console.log(`[Upload API]: Generating token for path: ${pathname}`);
        
        return {
          // [USER REQUEST] 모든 오디오 포맷 명시적 허용
          allowedContentTypes: [
            'audio/mpeg',     // .mp3
            'audio/wav',      // .wav
            'audio/mp4',      // .mp4 (audio)
            'audio/x-m4a',    // .m4a
            'audio/webm',     // .webm
            'audio/aac',      // .aac
            'audio/ogg',      // .ogg
            'audio/x-m4v',    // .m4v (audio context)
            'audio/flac'      // .flac (bonus coverage)
          ],
          tokenPayload: JSON.stringify({
            userId: 'Spark-Lab-User',
            uploadTime: new Date().toISOString()
          }),
        };
      },

      /**
       * 업로드 완료 후 콜백 (서버측 정리 작업 가능)
       */
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log(`[Upload API]: ✅ Upload completed successfully: ${blob.url}`);
      },
    });

    // --- [6] 성공 응답 반환 ---
    return res.status(200).json(jsonResponse);

  } catch (error: any) {
    // [USER REQUEST] 상세 에러 로깅
    console.error('[Upload API Error]:', error);
    
    // 우아한 실패 처리
    return res.status(400).json({ 
      error: error.message || 'Blob Handshake Failed' 
    });
  }
}
