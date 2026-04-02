// ============================================================
// app/api/audio/analyze/route.ts
// [Security Fix] Backend Proxy for Gemini Audio Analysis
// [Protocol] Accept Base64 Audio -> Gemini 2.5 Flash -> Response
// [FIX] models/gemini-1.5-flash -> gemini-2.5-flash (404 방어)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    // 1. 요청 데이터 추출 (Base64 및 MIME 타입)
    const { base64Audio, mimeType } = await req.json();

    if (!base64Audio || !mimeType) {
      return NextResponse.json({ error: "오디오 데이터나 형식이 올바르지 않습니다." }, { status: 400 });
    }

    // 2. 서버 측 API 키 로드 (보안)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "서버 API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    // 3. Google Generative AI 초기화 (Gemini 2.5 Flash 사용으로 404 방지)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 4. 모델 전송용 인라인 데이터 구성
    const audioPart = {
      inlineData: {
        data: base64Audio,
        mimeType: mimeType,
      },
    };

    const prompt = "이 오디오가 음성인지 음악인지 판별하고 핵심 내용을 JSON으로 요약하라. 한국어로 답변할 것.";

    // 5. 서버 측에서 Gemini 모델 호출
    const result = await model.generateContent([prompt, audioPart]);
    const response = await result.response;
    const text = response.text();

    // 6. 분석 결과 반환
    return NextResponse.json({ 
      success: true, 
      analysis: text 
    });

  } catch (error: any) {
    console.error("[Backend Error] Audio Analysis Failed:", error);
    return NextResponse.json({ 
      error: "오디오 분석 중 처리 오류가 발생했습니다.", 
      details: error.message 
    }, { status: 500 });
  }
}
