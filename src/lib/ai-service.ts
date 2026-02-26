/**
 * Google Gemini API (발표자료/번역) 및 OpenAI DALL-E 3 (이미지 생성) 통합 서비스
 */

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "초보자용. 쉬운 설명 위주, 전문 용어 최소화.",
  medium: "실무자용. 표준 비즈니스 분석 및 전문 용어 사용.",
  hard: "전문가용. 심층 데이터 해석 및 기술적 트렌드 반영.",
  executive: "경영진용. 두괄식 결론, 전략적 제언, 핵심 수치(ROI) 강조.",
};

const VOLUME_MAP: Record<string, string> = {
  brief: "3~5장 내외. 핵심 요약 위주.",
  standard: "6~10장 내외. 표준 기승전결 구성.",
  detailed: "11~15장 내외. 상세 분석 및 세부 데이터 포함.",
  comprehensive: "16장 이상. 방대한 종합 보고서 형식.",
};

const TOKEN_MAP: Record<string, number> = {
  brief: 4096,
  standard: 12000,
  detailed: 24000,
  comprehensive: 32768,
};

const SYSTEM_PROMPT_CORE = `당신은 사용자가 제공한 원본 데이터를 완벽하게 분석하여 고품질 프레젠테이션으로 변환하는 '비주얼 전문가'입니다.

[🔥 절대 준수: 데이터 소스 우선순위]
1. 파일 데이터가 있는 경우: 오직 업로드된 파일의 내용만 사용하세요.
2. 파일이 없고 주제만 있는 경우: 주제를 바탕으로 창의적으로 전개하세요.

[🎨 슬라이드 타입 선택 규칙]
- "title", "agenda", "kpi", "chart", "compare", "table", "process", "cards", "timeline", "content", "summary", "closing" 슬라이드 타입을 적절히 사용하세요.

[🚫 절대 금지]
- 모든 응답은 순수 JSON (마크다운 없음)`;

function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";
  if (typeof fileData === 'string') return fileData.slice(0, 80000);
  return JSON.stringify(fileData).slice(0, 80000);
}

function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();
  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();
  try { return JSON.parse(cleanText); } catch { return null; }
}

// 🚀 Google Gemini API 호출 (텍스트 생성용)
async function callGeminiAPI(prompt: string, maxTokens: number = 8192) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다.');

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    }
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  );

  if (!response.ok) throw new Error(`AI 서버 통신 오류 (${response.status})`);
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export const aiService = {
  // 슬라이드 구성안 생성
  async getOutline(body: any) {
    const { fileData, settings } = body;
    const fileContent = truncateFileData(fileData);
    const maxTokens = TOKEN_MAP[settings?.volume || 'standard'];

    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[미션] 발표 목차(구성안)만 설계하세요.\n[원본 자료]\n${fileContent}\n\n반드시 아래 JSON만 반환:\n{"title":"전체 제목","outline":[{"slideNumber":1,"title":"슬라이드 제목","type":"content","description":"설명"}]}`;

    const text = await callGeminiAPI(prompt, maxTokens);
    return { outline: extractJSON(text) };
  },

  // 전체 발표자료 생성
  async generatePresentation(body: any) {
    const { fileData, settings, approvedOutline } = body;
    const fileContent = truncateFileData(fileData);
    const maxTokens = TOKEN_MAP[settings?.volume || 'standard'];

    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[미션] 슬라이드를 완성하세요.\n[구성안 참조]\n${JSON.stringify(approvedOutline)}\n[원본 자료]\n${fileContent}\n\n반드시 아래 JSON만 반환:\n{"title":"제목","slides":[]}`;

    const text = await callGeminiAPI(prompt, maxTokens);
    return { presentation: extractJSON(text) };
  },

  // 슬라이드 재생성
  async regenerateSlide(body: any) {
    const { currentSlide, userInstruction, fileData } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n[미션] 슬라이드를 재작성하세요.\n- 요청: "${userInstruction}"\n- 현재 데이터: ${JSON.stringify(currentSlide)}\n- 원본 자료: ${truncateFileData(fileData)}\nJSON 1개만 반환.`;
    const text = await callGeminiAPI(prompt, 4096);
    return { slide: extractJSON(text) };
  },

  // 채팅 기반 수정
  async chatEdit(body: any) {
    const { userMessage, currentSlide } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n[미션] 요청에 따라 수정하세요.\n- 요청: "${userMessage}"\n- 현재: ${JSON.stringify(currentSlide)}\n{"slide":{...},"summary":"..."} 반환.`;
    const text = await callGeminiAPI(prompt, 4096);
    return { result: extractJSON(text) };
  },

  // 페르소나/스타일 변환
  async changePersona(body: any) {
    const { currentSlide, persona } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n[미션] 페르소나 스타일로 재작성하세요.\n- 페르소나: ${persona}\n- 현재: ${JSON.stringify(currentSlide)}\nJSON 1개만 반환.`;
    const text = await callGeminiAPI(prompt, 4096);
    return { slide: extractJSON(text) };
  },

  // 리뷰 및 최적화
  async review(body: any) {
    const prompt = `발표 자료 검토 제안:\n${JSON.stringify(body.presentation)}\n{"overallScore":85,"summary":"...","improvements":[]}`;
    const text = await callGeminiAPI(prompt, 4096);
    return { review: extractJSON(text) };
  },

  async reviewAndFix(body: any) {
    const prompt = `${SYSTEM_PROMPT_CORE}\n[미션] 전체 시각화를 최적화하세요.\n원본: ${JSON.stringify(body.presentation)}\n{"presentation":{...},"summary":"..."}`;
    const text = await callGeminiAPI(prompt, 16384);
    return { result: extractJSON(text) };
  },

  // ✨ 신규: OpenAI DALL-E 3를 사용한 고화질 배경 이미지 생성기
  async generateImage(slideTitle: string, slideContent: string) {
    const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    if (!API_KEY) {
      throw new Error('VITE_OPENAI_API_KEY가 설정되지 않았습니다. OpenAI API 키를 확인해주세요.');
    }

    // DALL-E 3를 위한 최적화된 프롬프트 구성
    const prompt = `A professional, clean, minimalist business presentation background image. 
    Theme: "${slideTitle}". 
    Context: "${slideContent}". 
    Style: Modern corporate aesthetic, abstract geometric shapes, soft lighting, professional color palette, high quality 4k. 
    IMPORTANT: ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO WORDS. The image must be a clean background only. 
    Aspect ratio: Wide 16:9.`;

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1792", // DALL-E 3 가로형 지원 사이즈
          quality: "standard",
          response_format: "url"
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("OpenAI API Error:", errData);
        throw new Error(errData.error?.message || 'AI 이미지 생성 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      if (!data.data || !data.data[0] || !data.data[0].url) {
        throw new Error('이미지 생성 결과가 없습니다.');
      }

      return data.data[0].url;
    } catch (error: any) {
      console.error("Image Generation Exception:", error);
      throw error;
    }
  }
};
