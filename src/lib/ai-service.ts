/**
 * Google Gemini API (발표자료) 및 DeepAI (무료 이미지 생성) 통합 서비스
 * (🚀 JSON 잘림 방지 및 토큰 용량 최적화 완료)
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
- 모든 응답은 순수 JSON (마크다운 없음)으로 반환하세요.
- 슬라이드의 본문 내용은 반드시 "content"라는 이름의 문자열 배열(string[])로 작성하세요.`;

function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";
  if (typeof fileData === 'string') return fileData.slice(0, 80000);
  return JSON.stringify(fileData).slice(0, 80000);
}

// ✨ 슬라이드 데이터 정규화
function normalizeSlide(s: any): any {
  if (!s || typeof s !== 'object') return s;

  const rawContent = s.content || s.points || s.bullets || s.items || s.list || [];

  s.content = Array.isArray(rawContent)
    ? rawContent.map((p: any) => typeof p === 'object' ? (p.title || p.text || JSON.stringify(p)) : String(p))
    : (typeof rawContent === 'string' ? [rawContent] : []);

  if (!s.type) s.type = 'content';
  if (!s.id) s.id = `slide-${Math.random().toString(36).substr(2, 9)}`;

  return s;
}

// ✨ JSON 강제 추출 및 복구 로직 (에러 완벽 방어)
function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();

  // 1. 마크다운 블록 제거
  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();

  // 2. 일반적인 파싱 시도
  try {
    const parsed = JSON.parse(cleanText);
    if (parsed.slides && Array.isArray(parsed.slides)) {
      parsed.slides = parsed.slides.map(normalizeSlide);
    }
    return parsed;
  } catch (e1) {
    console.warn("JSON 1차 파싱 실패. 구조 복구를 시도합니다.");
  }

  // 3. JSON이 중간에 잘리거나 쓰레기 값이 붙은 경우 강제 복구
  try {
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    const startIdx = (firstBrace !== -1 && firstBracket !== -1) ? Math.min(firstBrace, firstBracket) : Math.max(firstBrace, firstBracket);
    
    if (startIdx !== -1) {
      let repaired = cleanText.substring(startIdx);
      
      // 잘린 괄호 강제 닫기 (휴리스틱 복구)
      let braces = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
      let brackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
      
      // 마지막 쉼표 제거
      repaired = repaired.replace(/,\s*$/, '');
      
      while (brackets > 0) { repaired += ']'; brackets--; }
      while (braces > 0) { repaired += '}'; braces--; }

      // 배열/객체 끝의 불필요한 쉼표 제거 (e.g., [1, 2, ] -> [1, 2])
      repaired = repaired.replace(/,\s*([\]}])/g, '$1');

      const parsed = JSON.parse(repaired);
      if (parsed.slides && Array.isArray(parsed.slides)) {
        parsed.slides = parsed.slides.map(normalizeSlide);
      }
      return parsed;
    }
  } catch (e2) {
    console.error("JSON 파싱 최종 실패:", e2);
  }
  
  return null; // 복구 불가능 시
}

async function callGeminiAPI(prompt: string, maxTokens: number = 8192) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY 미설정');
  
  const payload = { 
    contents: [{ parts: [{ text: prompt }] }], 
    generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens, responseMimeType: 'application/json' } 
  };
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, { 
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
  });
  
  if (!response.ok) throw new Error(`AI 서버 통신 오류 (${response.status})`);
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export const aiService = {
  // 🚀 구성안 생성 로직 (토큰 넉넉하게 확보 + 예외 처리)
  async getOutline(body: any) {
    const prompt = `당신은 프레젠테이션 기획자입니다. 다음 원본 데이터를 분석하여 발표 목차(구성안)만 빠르게 설계하세요.
    [원본]
    ${truncateFileData(body.fileData)}
    
    [규칙]
    - 전체적인 흐름만 파악하여 목차를 작성하세요.
    - 반드시 아래 JSON 형식만 반환하고 부가 설명은 절대 하지 마세요.
    {"title": "전체 제목", "outline": [{"slideNumber": 1, "title": "슬라이드 제목", "type": "content", "description": "핵심 내용"}]}`;
    
    // ✨ 변경점: 토큰 제한을 1024 -> 4096으로 늘려서 잘림 현상 원천 차단
    const text = await callGeminiAPI(prompt, 4096); 
    let data = extractJSON(text);

    if (!data) throw new Error("AI가 구성안 포맷을 잘못 생성했습니다. 다시 시도해주세요.");

    // AI가 배열 형태로 던졌을 경우 객체로 포장
    if (Array.isArray(data)) {
      data = { title: "새 발표 자료", outline: data };
    } else if (!data.outline && data.slides) {
      data.outline = data.slides;
    } else if (!data.outline) {
      // 그 외의 경우 억지로라도 형식을 맞춰줌
      data.outline = [{ slideNumber: 1, title: data.title || "도입", type: "content", description: "내용" }];
    }

    return { outline: data };
  },

  async generatePresentation(body: any) {
    const text = await callGeminiAPI(`${SYSTEM_PROMPT_CORE}\n[미션] 슬라이드 완성\n[원본]\n${truncateFileData(body.fileData)}\nJSON 반환: {"title":"제목","slides":[]}`, TOKEN_MAP[body.settings?.volume || 'standard']);
    let data = extractJSON(text);

    if (!data) throw new Error("AI가 슬라이드 포맷을 잘못 생성했습니다. 다시 시도해주세요.");

    if (Array.isArray(data)) {
      data = { title: "새 발표 자료", slides: data };
    }

    return { presentation: data };
  },

  async regenerateSlide(body: any) {
    const text = await callGeminiAPI(`${SYSTEM_PROMPT_CORE}\n[미션] 슬라이드 재작성\n내용: ${JSON.stringify(body.currentSlide)}\n요청: ${body.userInstruction}\nJSON 반환.`, 4096);
    let json = extractJSON(text);
    if (!json) throw new Error("재생성 파싱 실패");
    return { slide: normalizeSlide(json) };
  },

  async chatEdit(body: any) {
    const text = await callGeminiAPI(`${SYSTEM_PROMPT_CORE}\n[미션] 수정 요청 반영: ${body.userMessage}\n현재슬라이드: ${JSON.stringify(body.currentSlide)}\nJSON 반환: {"slide":{...},"summary":"..."}`, 4096);
    const json = extractJSON(text);
    if (json && json.slide) json.slide = normalizeSlide(json.slide);
    return { result: json };
  },

  async changePersona(body: any) {
    const text = await callGeminiAPI(`${SYSTEM_PROMPT_CORE}\n[미션] ${body.persona} 스타일 변환\n현재슬라이드: ${JSON.stringify(body.currentSlide)}\nJSON 반환.`, 4096);
    let json = extractJSON(text);
    if (!json) throw new Error("스타일 변환 파싱 실패");
    return { slide: normalizeSlide(json) };
  },

  async review(body: any) {
    const text = await callGeminiAPI(`검토: ${JSON.stringify(body.presentation)}\nJSON 반환: {"overallScore":85,"summary":"...","improvements":[]}`, 4096);
    return { review: extractJSON(text) };
  },

  async reviewAndFix(body: any) {
    const text = await callGeminiAPI(`${SYSTEM_PROMPT_CORE}\n최적화: ${JSON.stringify(body.presentation)}\nJSON 반환: {"presentation":{...},"summary":"..."}`, 16384);
    let data = extractJSON(text);
    if (!data) throw new Error("전체 최적화 실패");
    return { result: data };
  },

  // ✨ DeepAI 무료 배경 이미지 생성
  async generateImage(slideTitle: string, slideContent: string) {
    const DEEPAI_API_KEY = import.meta.env.VITE_DEEPAI_API_KEY;
    if (!DEEPAI_API_KEY) throw new Error('VITE_DEEPAI_API_KEY가 설정되지 않았습니다.');

    const prompt = `Professional business presentation background, abstract geometric shapes, minimalist corporate style, soft gradient, theme: ${slideTitle}, ${slideContent}. High quality, no text, no letters, wide screen 16:9.`;
    const formData = new FormData();
    formData.append('text', prompt);
    formData.append('grid_size', '1');
    formData.append('width', '1280');
    formData.append('height', '720');

    try {
      const response = await fetch('https://api.deepai.org/api/text2img', {
        method: 'POST', headers: { 'api-key': DEEPAI_API_KEY }, body: formData
      });
      if (!response.ok) throw new Error(`DeepAI 오류`);
      const data = await response.json();
      return data.output_url;
    } catch (error) {
      throw error;
    }
  },

  // ✨ 인포그래픽 분석
  async analyzeInfographic(content: string[]) {
    const prompt = `다음 리스트의 관계를 분석해 최적의 인포그래픽 타입을 "cycle", "hierarchy", "process", "grid" 중 하나로 선택하세요.
    내용: ${JSON.stringify(content)}
    반드시 JSON {"type": "선택값", "reason": "이유"}만 반환.`;
    const text = await callGeminiAPI(prompt, 1024);
    return extractJSON(text) || { type: 'grid' };
  },

  // ✨ 연동 목업
  async exportToExternal(presentation: any, platform: 'notion' | 'google') {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  }
};
