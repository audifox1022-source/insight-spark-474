/**
 * Google Gemini API 직접 호출 서비스 (Supabase Edge Function 우회)
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

const TEMPLATE_MAP: Record<string, string> = {
  auto: "파일 내용을 분석하여 가장 적합한 구성을 자동으로 선택하세요.",
  report: "현황 → 분석 → 결론 → 실행계획 순서로 구성하세요.",
  analysis: "차트와 수치 중심의 데이터 분석 발표로 구성하세요.",
  proposal: "문제 제기 → 솔루션 → 기대효과 순서로 구성하세요.",
  summary: "핵심 내용만 간결하게 압축한 브리핑으로 구성하세요.",
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

[🎨 슬라이드 타입 선택 규칙 — 핵심]
- "title"     : 표지. 발표 제목 + 발표자 정보
- "agenda"    : 목차. items 배열에 목차 항목 나열
- "kpi"       : KPI 수치 강조. keyMetrics 배열 필수 (3~4개 카드)
- "chart"     : 수치 비교/추이. 반드시 chartData 객체 필수 (bar, line, pie 차트)
- "compare"   : 좌우 2가지 비교. leftTitle/leftItems/rightTitle/rightItems 필수
- "table"     : 표/데이터 그리드. headers + rows 필수
- "process"   : 순서/단계. steps 배열 필수
- "cards"     : 카드 나열. items 배열 필수 (각 항목: {title, desc})
- "timeline"  : 시간 흐름. milestones 배열 필수
- "content"   : 일반 텍스트. points 배열 사용
- "summary"   : 마무리/결론. points 배열 + keyMetrics 선택
- "closing"   : 감사 인사 마지막 슬라이드

[🚫 절대 금지]
- table 타입에 stats 사용 금지 (표는 반드시 headers + rows만 사용)
- content/points/steps 배열에 객체({}) 삽입 금지 — 반드시 순수 문자열만 작성
- 모든 응답은 순수 JSON (마크다운 없음)`;

function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";

  if (typeof fileData === 'object' && !Array.isArray(fileData)) {
    const parts: string[] = [];
    for (const [fileName, value] of Object.entries(fileData)) {
      const v = value as any;
      if (v.error) { parts.push(`### [${fileName}]\n⚠️ ${v.note || '파싱 실패'}`); continue; }
      if (v.content) { parts.push(`### [${fileName} (${v.type || 'text'})]:\n${v.content}`); continue; }
      if (v.type === 'excel' && v.data) {
        const excelText = typeof v.data === 'string' ? v.data : JSON.stringify(v.data, null, 2);
        parts.push(`### [${fileName} (Excel)]:\n${excelText}`); continue;
      }
      parts.push(`### [${fileName}]:\n${JSON.stringify(v)}`);
    }
    return parts.join('\n\n').slice(0, 80000);
  }

  if (Array.isArray(fileData)) {
    return fileData
      .map((f: any, i: number) => `### [파일 ${i + 1}: ${f.fileName || '문서'}]\n${f.content || f.text || JSON.stringify(f)}`)
      .join('\n\n').slice(0, 80000);
  }

  return String(fileData).slice(0, 80000);
}

function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();

  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();

  try { return JSON.parse(cleanText); } catch { console.warn('JSON 손상, 1차 복구 시도...'); }

  try {
    let repaired = cleanText;
    if ((repaired.match(/"/g) || []).length % 2 !== 0) repaired += '"';
    let braces   = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
    let brackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
    while (brackets > 0) { repaired += ']'; brackets--; }
    while (braces   > 0) { repaired += '}'; braces--;   }
    return JSON.parse(repaired.replace(/,\s*([\]}])/g, '$1'));
  } catch { console.warn('JSON 손상, 2차 복구 시도...'); }

  try {
    const slidesMatch = cleanText.match(/"slides"\s*:\s*(\[[\s\S]*)/);
    if (slidesMatch) {
      let slidesText = slidesMatch[1];
      let brackets = (slidesText.match(/\[/g) || []).length - (slidesText.match(/\]/g) || []).length;
      while (brackets > 0) { slidesText += ']'; brackets--; }
      slidesText = slidesText.replace(/,\s*([\]}])/g, '$1');
      return { title: '발표 자료', slides: JSON.parse(slidesText) };
    }
  } catch { return null; }
  return null;
}

// 🚀 클라이언트에서 Gemini API로 직접 쏘는 함수
async function callGeminiAPI(prompt: string, maxTokens: number = 8192) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal }
    );

    if (!response.ok) throw new Error(`AI 서버 통신 오류 (${response.status})`);
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('AI 응답 시간 초과 (60초). 다시 시도해주세요.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ✨ 정규화 함수
function normalizeSlide(s: any): any {
  if (!s || typeof s !== 'object') return s;
  if (!s.id) s.id = `slide-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  if (Array.isArray(s.points)) s.points = s.points.map((p: any) => typeof p === 'object' ? (p.title || p.desc || p.label || JSON.stringify(p)) : String(p));
  if (Array.isArray(s.content)) s.content = s.content.map((p: any) => typeof p === 'object' ? (p.title || p.desc || p.label || JSON.stringify(p)) : String(p));
  if (Array.isArray(s.steps)) s.steps = s.steps.map((p: any) => typeof p === 'object' ? (p.title || p.desc || p.label || JSON.stringify(p)) : String(p));
  
  if (Array.isArray(s.items)) {
    s.items = s.items.map((it: any) => {
      if (typeof it === 'string') return { title: it, desc: '' };
      return { title: String(it.title || it.label || it.name || ''), desc: String(it.desc || it.description || it.value || '') };
    });
  }

  if (s.type === 'chart' || s.chartData || s.stats) {
    let rawData: any[] = [];
    
    if (s.chartData && Array.isArray(s.chartData.data)) rawData = s.chartData.data;
    else if (s.chartData && s.chartData.labels && s.chartData.datasets) {
      const labels = s.chartData.labels;
      const values = s.chartData.datasets[0]?.data || [];
      rawData = labels.map((l: string, i: number) => ({ name: l, value: values[i] }));
    }
    else if (Array.isArray(s.chartData)) rawData = s.chartData;
    else if (Array.isArray(s.stats)) rawData = s.stats;
    else if (Array.isArray(s.keyMetrics)) rawData = s.keyMetrics;

    let normalizedData = rawData.map((item: any, idx: number) => {
      if (item == null) return null;
      if (typeof item !== 'object') return { name: `항목 ${idx + 1}`, value: Number(String(item).replace(/[^0-9.-]+/g, "")) || 0 };

      let name = item.name ?? item.label ?? item.title ?? item.x ?? item.항목 ?? item.구분 ?? `항목 ${idx + 1}`;
      let value = item.value ?? item.y ?? item.수치 ?? item.rightValue ?? item.leftValue;

      if (value === undefined || value === null) {
        for (const key in item) {
          const strVal = String(item[key]);
          if (/[0-9]/.test(strVal) && !['name', 'label', 'title'].includes(key)) {
            value = item[key]; break;
          }
        }
      }

      return {
        name: String(name),
        value: Number(String(value).replace(/[^0-9.-]+/g, "")) || 0
      };
    }).filter((item: any) => item != null && !isNaN(item.value));

    if (normalizedData.length > 0) {
      s.type = 'chart';
      const labels = normalizedData.map((d: any) => d.name);
      const values = normalizedData.map((d: any) => d.value);

      s.chartData = {
        type: s.chartData?.type || 'bar',
        data: normalizedData, 
        labels: labels,
        datasets: [{ label: '수치', data: values }]
      };

      s.stats = normalizedData.map((d: any) => ({
        label: d.name,
        value: String(d.value),
        leftValue: String(d.value),
        rightValue: ''
      }));
    } else {
      s.type = s.type === 'chart' ? 'content' : s.type;
      s.chartData = undefined;
    }
  }

  return s;
}

const SLIDE_SCHEMA = `
"chart" 타입 필수 구조:
  { "slideNumber":4, "type":"chart", "title":"데이터 차트", "chartData":{"type":"bar","labels":["A","B"],"datasets":[{"label":"수치","data":[42,58]}]}, "stats":[{"label":"A","value":"42"},{"label":"B","value":"58"}], "notes":"..." }
`;

export const aiService = {
  async getOutline(body: any) {
    const { fileData, settings, meetingInfo, template } = body;
    const fileContent = truncateFileData(fileData);
    const maxTokens = TOKEN_MAP[settings?.volume || 'standard'];

    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[미션] 발표 목차(구성안)만 설계하세요. 상세 내용은 생성하지 마세요.\n[원본 자료]\n${fileContent}\n\n반드시 아래 JSON만 반환:\n{"title":"전체 제목","outline":[{"slideNumber":1,"title":"슬라이드 제목","type":"title|agenda|kpi|chart|compare|table|process|cards|timeline|content|summary|closing","description":"한 줄 설명"}]}`;

    const text = await callGeminiAPI(prompt, maxTokens);
    let data = extractJSON(text);
    if (!data) throw new Error('구성안 파싱 실패');
    if (Array.isArray(data)) data = { title: '발표 구성안', outline: data };
    return { outline: data };
  },

  async generatePresentation(body: any) {
    const { fileData, settings, approvedOutline, meetingInfo, template } = body;
    const fileContent = truncateFileData(fileData);
    const maxTokens = TOKEN_MAP[settings?.volume || 'standard'];

    const outlineHint = approvedOutline ? `\n[승인된 목차 — 반드시 이 구성과 타입을 그대로 사용하세요]\n${JSON.stringify(approvedOutline, null, 2)}` : '';

    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[미션] 원본 자료를 바탕으로 고품질 슬라이드를 완성하세요.\n${outlineHint}\n[원본 자료]\n${fileContent}\n${SLIDE_SCHEMA}\n반드시 아래 JSON만 반환:\n{"title":"발표 제목","slides":[/* 타입별 스키마에 맞는 슬라이드 배열 */]}`;

    const text = await callGeminiAPI(prompt, maxTokens);
    let data = extractJSON(text);
    if (!data) throw new Error('발표 자료 파싱 실패');
    if (Array.isArray(data)) data = { title: '발표 자료', slides: data };

    data.slides = (data.slides || []).map(normalizeSlide);
    return { presentation: data };
  },

  async regenerateSlide(body: any) {
    const { currentSlide, userInstruction, fileData } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n[미션] 아래 슬라이드를 재작성하세요.\n- 요청: "${userInstruction || '전면 재작성'}"\n- 현재 데이터: ${JSON.stringify(currentSlide)}\n- 원본 자료: ${truncateFileData(fileData)}\n${SLIDE_SCHEMA}\n슬라이드 JSON 1개만 반환.`;
    const text = await callGeminiAPI(prompt, 4096);
    return { slide: normalizeSlide(extractJSON(text)) };
  },

  async chatEdit(body: any) {
    const { userMessage, currentSlide } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n[미션] 사용자 요청에 따라 수정하세요.\n- 요청: "${userMessage}"\n- 현재: ${JSON.stringify(currentSlide)}\n${SLIDE_SCHEMA}\n{"slide":{...},"summary":"..."} 반환.`;
    const text = await callGeminiAPI(prompt, 4096);
    const result = extractJSON(text);
    if (result && result.slide) result.slide = normalizeSlide(result.slide);
    return { result };
  },

  async changePersona(body: any) {
    const { currentSlide, persona } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n[미션] 아래 페르소나 스타일로 재작성하세요. 타입(${currentSlide.type}) 유지.\n- 페르소나: ${persona}\n- 현재: ${JSON.stringify(currentSlide)}\n${SLIDE_SCHEMA}\n슬라이드 JSON 1개만 반환.`;
    const text = await callGeminiAPI(prompt, 4096);
    return { slide: normalizeSlide(extractJSON(text)) };
  },

  async review(body: any) {
    const prompt = `발표 자료 검토 제안:\n${JSON.stringify(body.presentation)}\n{"overallScore":85,"summary":"...","improvements":[]}`;
    return { review: extractJSON(await callGeminiAPI(prompt, 4096)) };
  },

  async reviewAndFix(body: any) {
    const prompt = `${SYSTEM_PROMPT_CORE}\n[미션] 전체 시각화를 최적화하세요.\n원본: ${JSON.stringify(body.presentation)}\n${SLIDE_SCHEMA}\n{"presentation":{"title":"...","slides":[...]},"summary":"..."}`;
    const text = await callGeminiAPI(prompt, 16384);
    const data = extractJSON(text);
    if (!data) throw new Error('최적화 파싱 실패');

    if (!data.presentation && data.slides) {
      data.slides = data.slides.map(normalizeSlide);
      return { result: { presentation: data, summary: '최적화됨' } };
    }
    if (data.presentation && data.presentation.slides) {
      data.presentation.slides = data.presentation.slides.map(normalizeSlide);
    }
    return { result: data };
  },

  // ✨ 신규: Google Imagen 3 API를 사용한 고화질 배경 이미지 생성기
  async generateImage(slideTitle: string, slideContent: string) {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다.');

    // 글자가 포함되지 않는 깔끔한 기업용 프레젠테이션 배경을 요청하는 프롬프트
    const prompt = `Create a professional, clean, minimalist business presentation background image. Title context: "${slideTitle}". Content context: "${slideContent}". Style: Corporate, modern, abstract geometric shapes, soft lighting, ample empty space. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS. 16:9 aspect ratio.`;

    const payload = {
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "16:9"
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Image generation error:", errText);
      throw new Error('AI 이미지 생성에 실패했습니다. (API 키의 Imagen 권한을 확인해주세요.)');
    }

    const data = await response.json();
    if (!data.predictions || !data.predictions[0] || !data.predictions[0].bytesBase64Encoded) {
      throw new Error('이미지 데이터가 생성되지 않았습니다.');
    }

    // Base64 형태를 Data URL로 변환하여 즉시 화면에 렌더링 가능하도록 리턴
    return `data:image/jpeg;base64,${data.predictions[0].bytesBase64Encoded}`;
  }
};
