/**
 * 🛠️ 데이터 누락 방지 및 신규 기능이 통합된 AI 서비스
 */

const SYSTEM_PROMPT_CORE = `당신은 프레젠테이션 시각화 전문가입니다.
[🔥 데이터 구조 규칙]
- 슬라이드 본문 내용은 반드시 "content"라는 이름의 문자열 배열로 반환하세요.
- 차트 데이터가 필요한 경우 "chartData"와 "stats"를 포함하세요.
- 마크다운 없이 순수 JSON만 응답하세요.`;

// ✨ 슬라이드 데이터 정규화 (내용 누락 방지의 핵심)
function normalizeSlide(s: any): any {
  if (!s || typeof s !== 'object') return s;
  
  // AI가 보낼 수 있는 다양한 본문 키값들을 'content' 하나로 통합
  const rawContent = s.content || s.points || s.bullets || s.items || s.list || [];
  
  s.content = Array.isArray(rawContent) 
    ? rawContent.map((p: any) => typeof p === 'object' ? (p.title || p.text || JSON.stringify(p)) : String(p))
    : (typeof rawContent === 'string' ? [rawContent] : []);

  if (!s.type) s.type = 'content';
  if (!s.id) s.id = `slide-${Math.random().toString(36).substr(2, 9)}`;
  
  return s;
}

function extractJSON(text: string): any | null {
  try {
    let cleanText = text.trim().replace(/^```json/, '').replace(/```$/, '');
    const parsed = JSON.parse(cleanText);
    if (parsed.slides && Array.isArray(parsed.slides)) {
      parsed.slides = parsed.slides.map(normalizeSlide); // 모든 슬라이드 정규화
    }
    return parsed;
  } catch (e) {
    console.error("JSON 파싱 실패:", text);
    return null;
  }
}

// Gemini API 호출 함수 (기본 구조 유지)
async function callGeminiAPI(prompt: string, maxTokens: number = 8192) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens, responseMimeType: 'application/json' }
  };
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export const aiService = {
  // 발표자료 생성
  async generatePresentation(body: any) {
    const prompt = `${SYSTEM_PROMPT_CORE}\n[미션] 슬라이드 완성\n[자료]\n${JSON.stringify(body.fileData)}\n순수 JSON 반환.`;
    const text = await callGeminiAPI(prompt, 16384);
    return { presentation: extractJSON(text) };
  },

  // ✨ 3번 기능: 인포그래픽 타입 분석
  async analyzeInfographic(content: string[]) {
    const prompt = `다음 리스트의 관계를 분석해 최적의 인포그래픽 타입을 "cycle", "hierarchy", "process", "grid" 중 하나로 선택하세요.
    내용: ${JSON.stringify(content)}
    반드시 JSON {"type": "선택값", "reason": "이유"}만 반환.`;
    const text = await callGeminiAPI(prompt, 1024);
    return extractJSON(text);
  },

  // DeepAI 이미지 생성 (기존 로직 유지)
  async generateImage(slideTitle: string, slideContent: string) {
    const DEEPAI_API_KEY = import.meta.env.VITE_DEEPAI_API_KEY;
    const formData = new FormData();
    formData.append('text', `Professional abstract background for ${slideTitle}: ${slideContent}. No text.`);
    const response = await fetch('https://api.deepai.org/api/text2img', {
      method: 'POST', headers: { 'api-key': DEEPAI_API_KEY }, body: formData
    });
    const data = await response.json();
    return data.output_url;
  }
};
