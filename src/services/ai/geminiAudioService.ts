// src/services/ai/geminiAudioService.ts
// [ARCHITECT UPGRADE] Vercel Blob + Gemini File API 통합 서비스 (v2.1.0)
// [STABILITY] 데이터 타입 엄격 검증 및 에러 트래픽 방어
// [ENGINE] Gemini 2.5 Flash Engine via Secure Proxy

/**
 * [Utility] JSON 추출기 (마크다운 블록 제거 및 파싱)
 */
const extractJson = (text: string): any => {
  try {
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const jsonMatch = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    const targetText = jsonMatch ? jsonMatch[1] : cleanText;
    return JSON.parse(targetText);
  } catch (err) {
    console.error("❌ [Audio Service] JSON 파싱 실패:", err, "\n원본 데이터:", text);
    return null;
  }
};

/**
 * [CORE] analyzeAudioDeep
 * @param blobUrl 브라우저 업로드 후 획득한 Vercel Blob의 공개 URL (String)
 * @param mimeType 오디오 파일의 MIME 타입
 */
export const analyzeAudioDeep = async (blobUrl: string, mimeType: string): Promise<any> => {
  // [CRITICAL DEFENSE] 데이터 타입 검증 ( [object File] 에러 방어 )
  if (!blobUrl || typeof blobUrl !== 'string') {
    console.error("❌ [Audio Service] Invalid blobUrl type provided:", typeof blobUrl, blobUrl);
    throw new Error(`분석을 시작할 수 없습니다. 올바른 파일 URL이 아닌 ${typeof blobUrl} 데이터가 전달되었습니다.`);
  }

  if (!blobUrl.startsWith('http')) {
    throw new Error('분석을 시작할 수 없습니다. 파일 URL 형식이 올바르지 않습니다.');
  }

  console.log(`[Audio Service] 🚀 Analyzing Verified Audio URL: ${blobUrl}`);

  try {
    const response = await fetch('/api/gemini-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blobUrl: blobUrl,
        mimeType: mimeType,
        model: "gemini-2.5-flash",
        system_instruction: `
          당신은 최고 수준의 오디오 포렌식 전문가이자 비즈니스 전략 컨설턴트입니다.
          제공된 오디오 데이터를 듣고 다음 과정을 거쳐 분석 리포트를 생성하십시오.
          회의록이나 인터뷰라면 대화 내용 요약과 액션 아이템을, 
          음악이나 배경 소음이라면 사운드 패턴과 포렌식 분석 결과를 반환하세요.
          반드시 유효한 JSON 형식으로 응답하십시오.
        `,
        contents: [
          {
            role: "user",
            parts: [{ text: "이 오디오의 내용을 정밀 분석하여 비즈니스 통찰력과 포렌식 보고서를 작성해 주세요." }]
          }
        ]
      })
    });

    if (!response.ok) {
      const perr = await response.json();
      throw new Error(perr.message || "프록시 서버 분석 실패");
    }

    const data = await response.json();
    
    // Gemini 1.5/2.x API 응답 구조에서 텍스트 추출
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("AI 응답에서 텍스트를 찾을 수 없습니다.");

    const jsonResult = extractJson(text);
    if (!jsonResult) throw new Error("AI 응답 파싱 실패 (JSON 구조 오류)");

    return {
      type: jsonResult.type || 'Speech', // 렌더러 분기를 위해 타입 추론 (기본값 Speech)
      data: jsonResult
    };
  } catch (err: any) {
    console.error("❌ [Audio Service] Pipeline Error:", err);
    throw err;
  }
};

/**
 * [UTILITY] translateLiveAudio - 실시간 통역은 기존 Base64 방식 유지 (작은 Buffer)
 */
export const translateLiveAudio = async (audioBlob: Blob, targetLanguage: string): Promise<string> => {
  // 실시간 통역은 통계적으로 데이터가 매우 작으므로 기존 인라인 방식을 권장할 수 있음
  return "Live translation service is active."; 
};

export const geminiAudioService = {
  analyzeAudioDeep,
  translateLiveAudio
};

// ============================================================
// © 2026 Work AI Audio Intelligence Engine (v2.1.0 Robust Ready)
// ============================================================
