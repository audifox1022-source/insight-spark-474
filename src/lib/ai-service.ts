/**
 * src/lib/ai-service.ts
 * (🚀 JSON 평탄화 + 화이트스크린 방어 + 100% 무료/무가입 이미지 생성 통합 완벽본)
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
- 일반 설명은 "content" 배열(string[])에 넣고, 특수 타입(표, 차트 등)은 반드시 아래 스키마를 따르세요.`;

const SLIDE_SCHEMA = `
[📊 특수 슬라이드 타입 필수 JSON 구조 (반드시 준수)]
- "kpi" 타입: 
  "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up" | "down" | "flat"}]
- "chart" 타입: 
  "chartData": {"type": "bar" | "line" | "pie", "labels": ["항목1", "항목2"], "datasets": [{"label": "데이터명", "data": [10, 20]}]}
- "table" 타입: 
  "tableData": {"headers": ["열1", "열2"], "rows": [["값1", "값2"], ["값3", "값4"]]}
`;

function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";
  if (typeof fileData === 'string') return fileData.slice(0, 80000);
  return JSON.stringify(fileData).slice(0, 80000);
}

// ✨ 본문 텍스트 평탄화 추출기
function extractTextFromItem(item: any): string[] {
  if (!item) return [];
  
  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        item = JSON.parse(trimmed);
      } catch (e) {
        return [item];
      }
    } else {
      return [item];
    }
  }

  if (typeof item === 'object') {
    let result: string[] = [];
    const title = item.title || item.heading || item.name || item.subject || '';
    
    if (Array.isArray(item.content)) {
      if (title) result.push(`[${title}]`);
      result.push(...item.content.map(c => typeof c === 'string' ? c : JSON.stringify(c)));
    } else if (item.content || item.text || item.desc || item.description) {
      const body = item.content || item.text || item.desc || item.description;
      if (title) {
        result.push(`[${title}] ${body}`);
      } else {
        result.push(String(body));
      }
    } else {
      result.push(JSON.stringify(item));
    }
    return result;
  }

  return [String(item)];
}

// ✨ 화이트스크린 에러 방어 및 정규화
function normalizeSlide(s: any): any {
  if (!s || typeof s !== 'object') {
    return { id: `slide-${Math.random().toString(36).substr(2, 9)}`, type: 'content', title: '', content: [], chartData: { labels: [], datasets: [] }, tableData: { headers: [], rows: [] }, keyMetrics: [] };
  }

  s.id = s.id || `slide-${Math.random().toString(36).substr(2, 9)}`;
  s.type = s.type || 'content';
  s.title = s.title || '';

  const rawContent = s.content || s.points || s.bullets || s.items || s.list || [];
  const contentArray = Array.isArray(rawContent) ? rawContent : (typeof rawContent === 'string' ? [rawContent] : []);
  s.content = contentArray.flatMap(extractTextFromItem);

  if (s.type === 'chart' || s.chartData) {
    s.chartData = s.chartData || {};
    s.chartData.labels = Array.isArray(s.chartData.labels) ? s.chartData.labels : [];
    s.chartData.datasets = Array.isArray(s.chartData.datasets) ? s.chartData.datasets : [];
    s.chartData.datasets = s.chartData.datasets.map((ds: any) => ({
      label: ds?.label || '데이터',
      data: Array.isArray(ds?.data) ? ds.data : []
    }));
  } else {
    s.chartData = { labels: [], datasets: [] };
  }

  if (s.type === 'table' || s.tableData) {
    s.tableData = s.tableData || {};
    s.tableData.headers = Array.isArray(s.tableData.headers) ? s.tableData.headers : [];
    s.tableData.rows = Array.isArray(s.tableData.rows) ? s.tableData.rows : [];
  } else {
    s.tableData = { headers: [], rows: [] };
  }

  if (s.type === 'kpi' || s.keyMetrics) {
    s.keyMetrics = Array.isArray(s.keyMetrics) ? s.keyMetrics : [];
  } else {
    s.keyMetrics = [];
  }

  return s;
}

function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();

  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();

  try {
    const parsed = JSON.parse(cleanText);
    if (parsed && Array.isArray(parsed.slides)) parsed.slides = parsed.slides.map(normalizeSlide);
    if (parsed && Array.isArray(parsed.outline)) parsed.outline = parsed.outline.map((item: any) => ({ ...item, type: item.type || 'content' }));
    return parsed;
  } catch (e1) {
    console.warn("JSON 1차 파싱 실패, 구조 복구를 시도합니다.");
  }

  try {
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    const startIdx = (firstBrace !== -1 && firstBracket !== -1) ? Math.min(firstBrace, firstBracket) : Math.max(firstBrace, firstBracket);
    
    if (startIdx !== -1) {
      let repaired = cleanText.substring(startIdx);
      let braces = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
      let brackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
      repaired = repaired.replace(/,\s*$/, '');
      while (brackets > 0) { repaired += ']'; brackets--; }
      while (braces > 0) { repaired += '}'; braces--; }
      repaired = repaired.replace(/,\s*([\]}])/g, '$1');

      const parsed = JSON.parse(repaired);
      if (parsed && Array.isArray(parsed.slides)) parsed.slides = parsed.slides.map(normalizeSlide);
      if (parsed && Array.isArray(parsed.outline)) parsed.outline = parsed.outline.map((item: any) => ({ ...item, type: item.type || 'content' }));
      return parsed;
    }
  } catch (e2) {
    console.error("JSON 파싱 최종 실패:", e2);
  }
  return null;
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
  async getOutline(body: any) {
    const volumeGuideline = VOLUME_MAP[body.settings?.volume || 'standard'];
    
    const prompt = `당신은 프레젠테이션 기획자입니다. 다음 원본 데이터를 분석하여 발표 목차(구성안)만 설계하세요.
    [원본]
    ${truncateFileData(body.fileData)}
    
    [🔥 분량 및 규칙 제한]
    1. 슬라이드 개수: 반드시 "${volumeGuideline}" 규칙을 엄격하게 지켜서 목차의 총 개수를 맞춰주세요.
    2. 전체적인 흐름만 파악하여 목차를 작성하세요.
    3. 반드시 아래 JSON 형식만 반환하고 부가 설명은 절대 하지 마세요.
    {"title": "전체 제목", "outline": [{"slideNumber": 1, "title": "슬라이드 제목", "type": "chart", "description": "핵심 내용"}]}`;
    
    const text = await callGeminiAPI(prompt, 4096); 
    let data = extractJSON(text);

    if (!data) throw new Error("AI가 구성안 포맷을 잘못 생성했습니다. 다시 시도해주세요.");

    if (Array.isArray(data)) data = { title: "새 발표 자료", outline: data };
    if (!data.outline || !Array.isArray(data.outline)) data.outline = data.slides && Array.isArray(data.slides) ? data.slides : [];
    if (data.outline.length === 0) data.outline = [{ slideNumber: 1, title: data.title || "도입", type: "content", description: "내용을 작성해주세요." }];

    return { outline: data };
  },

  async generatePresentation(body: any) {
    const prompt = `${SYSTEM_PROMPT_CORE}\n${SLIDE_SCHEMA}\n[미션] 슬라이드 완성\n[원본]\n${truncateFileData(body.fileData)}\n[구성안]\n${JSON.stringify(body.approvedOutline)}\n반드시 아래 JSON만 반환: {"title":"제목","slides":[]}`;
    const text = await callGeminiAPI(prompt, TOKEN_MAP[body.settings?.volume || 'standard']);
    let data = extractJSON(text);

    if (!data) throw new Error("AI가 슬라이드 포맷을 잘못 생성했습니다. 다시 시도해주세요.");
    if (Array.isArray(data)) data = { title: "새 발표 자료", slides: data };
    if (!data.slides || !Array.isArray(data.slides)) data.slides = [];
    data.slides = data.slides.map(normalizeSlide);

    return { presentation: data };
  },

  async regenerateSlide(body: any) {
    const prompt = `${SYSTEM_PROMPT_CORE}\n${SLIDE_SCHEMA}\n[미션] 슬라이드 재작성\n내용: ${JSON.stringify(body.currentSlide)}\n요청: ${body.userInstruction}\nJSON 반환.`;
    const text = await callGeminiAPI(prompt, 4096);
    let json = extractJSON(text);
    if (!json) throw new Error("재생성 파싱 실패");
    return { slide: normalizeSlide(json) };
  },

  async chatEdit(body: any) {
    const prompt = `${SYSTEM_PROMPT_CORE}\n${SLIDE_SCHEMA}\n[미션] 수정 요청 반영: ${body.userMessage}\n현재슬라이드: ${JSON.stringify(body.currentSlide)}\nJSON 반환: {"slide":{...},"summary":"..."}`;
    const text = await callGeminiAPI(prompt, 4096);
    const json = extractJSON(text);
    if (json && json.slide) json.slide = normalizeSlide(json.slide);
    return { result: json || {} };
  },

  async changePersona(body: any) {
    const prompt = `${SYSTEM_PROMPT_CORE}\n${SLIDE_SCHEMA}\n[미션] ${body.persona} 스타일 변환\n현재슬라이드: ${JSON.stringify(body.currentSlide)}\nJSON 반환.`;
    const text = await callGeminiAPI(prompt, 4096);
    let json = extractJSON(text);
    if (!json) throw new Error("스타일 변환 파싱 실패");
    return { slide: normalizeSlide(json) };
  },

  async review(body: any) {
    const text = await callGeminiAPI(`검토: ${JSON.stringify(body.presentation)}\nJSON 반환: {"overallScore":85,"summary":"...","improvements":[]}`, 4096);
    let data = extractJSON(text);
    if (data && (!data.improvements || !Array.isArray(data.improvements))) data.improvements = [];
    return { review: data || { overallScore: 0, summary: "", improvements: [] } };
  },

  async reviewAndFix(body: any) {
    const prompt = `${SYSTEM_PROMPT_CORE}\n${SLIDE_SCHEMA}\n최적화: ${JSON.stringify(body.presentation)}\nJSON 반환: {"presentation":{...},"summary":"..."}`;
    const text = await callGeminiAPI(prompt, 16384);
    let data = extractJSON(text);
    if (!data) throw new Error("전체 최적화 실패");
    if (data.presentation && Array.isArray(data.presentation.slides)) {
      data.presentation.slides = data.presentation.slides.map(normalizeSlide);
    }
    return { result: data };
  },

  // ✨ Pollinations AI 무료 이미지 생성기 (DeepAI 완전 대체)
  async generateImage(slideTitle: string, slideContent: string) {
    const prompt = `Professional abstract business presentation background, minimalist corporate style, soft gradient, theme: ${slideTitle}, context: ${slideContent}. High quality, no text, no watermarks, wide screen 16:9.`;
    
    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true`;
      
      const response = await fetch(imageUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('무료 이미지 서버가 혼잡합니다.');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      return imageUrl;
    } catch (error: any) {
      console.error("이미지 생성 예외 발생:", error);
      throw new Error("이미지를 생성할 수 없습니다. 잠시 후 다시 시도해주세요.");
    }
  },

  async analyzeInfographic(content: string[]) {
    const prompt = `다음 리스트의 관계를 분석해 최적의 인포그래픽 타입을 "cycle", "hierarchy", "process", "grid" 중 하나로 선택하세요.
    내용: ${JSON.stringify(content)}\n반드시 JSON {"type": "선택값", "reason": "이유"}만 반환.`;
    const text = await callGeminiAPI(prompt, 1024);
    return extractJSON(text) || { type: 'grid' };
  },

  async exportToExternal(presentation: any, platform: 'notion' | 'google') {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  }
};
