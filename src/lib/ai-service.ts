/**
 * Google Gemini API 서비스
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

const SYSTEM_PROMPT_CORE = `당신은 데이터를 완벽하게 분석하여 고품질 프레젠테이션으로 변환하는 '비주얼 전문가'입니다.

[🔥 절대 준수: 데이터 소스 우선순위]
1. 파일 데이터가 있는 경우: 오직 업로드된 파일의 내용만 사용하세요.
2. 파일이 없고 주제만 있는 경우: 주제를 바탕으로 창의적으로 전개하세요.

[🎨 슬라이드 타입 선택 규칙 — 핵심]
- "title"     : 표지. 발표 제목 + 발표자 정보
- "agenda"    : 목차. items 배열에 목차 항목 나열
- "kpi"       : KPI 수치 강조. keyMetrics 배열 필수
- "chart"     : 수치 비교/추이. 반드시 chartData 객체 필수 (bar, line, pie 차트)
- "compare"   : 좌우 2가지 비교. leftTitle/leftItems/rightTitle/rightItems 필수
- "table"     : 표/데이터 그리드. headers + rows 필수
- "process"   : 순서/단계. steps 배열 필수
- "cards"     : 카드 나열. items 배열 필수 (각 항목: {title, desc})
- "content"   : 일반 텍스트. points 배열 사용
- "closing"   : 감사 인사 마지막 슬라이드

[🚫 절대 금지]
- table 타입에 stats 사용 금지 (표는 반드시 headers + rows만 사용)
- content 배열에 객체({}) 삽입 금지 — 순수 문자열만
- chart 타입에 tableData나 stats 사용 금지 (오직 chartData 구조만 허용)
- 모든 응답은 순수 JSON (마크다운 없음)`;

function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";

  if (typeof fileData === 'object' && !Array.isArray(fileData)) {
    const parts: string[] = [];
    for (const [fileName, value] of Object.entries(fileData)) {
      const v = value as any;
      if (v.error) { parts.push(`### [${fileName}]\n⚠️ ${v.note || '파싱 실패'}`); continue; }
      if (v.content) { parts.push(`### [${fileName} (${v.type || 'text'})]:\n${v.content}`); continue; }
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

  try { return JSON.parse(cleanText); } catch { console.warn('JSON 손상, 복구 시도...'); }

  try {
    let repaired = cleanText;
    if ((repaired.match(/"/g) || []).length % 2 !== 0) repaired += '"';
    let braces   = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
    let brackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
    while (brackets > 0) { repaired += ']'; brackets--; }
    while (braces   > 0) { repaired += '}'; braces--;   }
    return JSON.parse(repaired.replace(/,\s*([\]}])/g, '$1'));
  } catch { console.warn('2차 복구...'); }

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

async function callGeminiAPI(prompt: string, maxTokens: number = 8192) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다.');

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  );

  if (!response.ok) throw new Error(`AI 서버 통신 오류 (${response.status})`);
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

const SLIDE_SCHEMA = `
"chart" 타입 필수 구조:
  { "slideNumber":4, "type":"chart", "title":"데이터 차트", "chartData":{"type":"bar","data":[{"name":"항목A","value":42},{"name":"항목B","value":58}]}, "notes":"..." }

⚠️ 절대 규칙:
- chart 타입은 반드시 chartData 객체를 포함하고, data 배열 안의 value는 순수 "숫자"여야 합니다. (예: "150억" -> 150)
`;

export const aiService = {
  async getOutline(body: any) {
    const { fileData, settings, meetingInfo } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[미션] 발표 목차(구성안)만 설계하세요. 원본 데이터 기반으로 요약하세요.\n${truncateFileData(fileData)}\n\n반드시 아래 JSON만 반환:\n{"title":"전체 제목","outline":[{"slideNumber":1,"title":"제목","type":"title|agenda|kpi|chart|compare|table|process|cards|content|closing","description":"요약"}]}`;
    const text = await callGeminiAPI(prompt, TOKEN_MAP[settings?.volume || 'standard']);
    let data = extractJSON(text);
    if (Array.isArray(data)) data = { title: '발표 구성안', outline: data };
    return { outline: data };
  },

  async generatePresentation(body: any) {
    const { fileData, settings, approvedOutline } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[미션] 승인된 목차와 원본 자료를 바탕으로 슬라이드를 완성하세요.\n- 목차: ${JSON.stringify(approvedOutline)}\n- 자료: ${truncateFileData(fileData)}\n${SLIDE_SCHEMA}\n반드시 JSON만 반환하세요: {"title":"발표 제목","slides":[...]}`;
    
    const text = await callGeminiAPI(prompt, TOKEN_MAP[settings?.volume || 'standard']);
    let data = extractJSON(text);
    if (!data) throw new Error('발표 자료 파싱 실패');
    if (Array.isArray(data)) data = { title: '발표 자료', slides: data };

    // ✨ 극한의 차트 정규화 로직 (AI가 아무렇게나 줘도 강제로 name, value로 변환)
    data.slides = (data.slides || []).map((s: any, i: number) => {
      if (s.type === 'chart' || s.chartData || s.stats) {
        let rawData = [];
        if (s.chartData && Array.isArray(s.chartData.data)) rawData = s.chartData.data;
        else if (Array.isArray(s.chartData)) rawData = s.chartData;
        else if (Array.isArray(s.stats)) rawData = s.stats;

        let normalizedData = rawData.map((item: any, idx: number) => {
          if (typeof item !== 'object') return { name: `항목 ${idx+1}`, value: Number(String(item).replace(/[^0-9.-]+/g, "")) || 0 };
          
          let name = item.name || item.label || item.x || item.항목 || item.구분;
          let value = item.value !== undefined ? item.value : (item.y !== undefined ? item.y : item.수치);

          // 명시적 키가 없으면 객체 내부를 뒤져서 숫자와 문자를 찾아냄
          if (value === undefined || name === undefined) {
            for (const key in item) {
              const strVal = String(item[key]);
              if (/[0-9]/.test(strVal) && value === undefined) value = item[key];
              else if (typeof item[key] === 'string' && name === undefined) name = item[key];
            }
          }

          return {
            name: String(name || `항목 ${idx + 1}`),
            value: Number(String(value).replace(/[^0-9.-]+/g, "")) || 0
          };
        }).filter((item: any) => item.name !== '항목' || item.value !== 0); // 완전한 빈 데이터 제거

        if (normalizedData.length > 0) {
          s.type = 'chart';
          s.chartData = { type: (s.chartData?.type || 'bar'), data: normalizedData };
        } else {
          s.type = s.type === 'chart' ? 'content' : s.type; // 데이터 추출 실패 시 텍스트 슬라이드로 폴백
          s.chartData = undefined;
        }
        s.stats = undefined; 
      }
      return { ...s, id: `slide-${Date.now()}-${i}` };
    });

    return { presentation: data };
  },

  async regenerateSlide(body: any) {
    const text = await callGeminiAPI(`${SYSTEM_PROMPT_CORE}\n수정 요청: "${body.userInstruction}"\n데이터: ${JSON.stringify(body.currentSlide)}\n수정된 슬라이드 JSON 1개만 반환.`, 4096);
    return { slide: extractJSON(text) };
  },

  async chatEdit(body: any) {
    const text = await callGeminiAPI(`${SYSTEM_PROMPT_CORE}\n요청: "${body.userMessage}"\n데이터: ${JSON.stringify(body.currentSlide)}\n{"slide":{...},"summary":"..."} 반환.`, 4096);
    return { result: extractJSON(text) };
  },

  async changePersona(body: any) {
    const text = await callGeminiAPI(`${SYSTEM_PROMPT_CORE}\n페르소나: ${body.persona}\n데이터: ${JSON.stringify(body.currentSlide)}\n슬라이드 JSON 1개만 반환.`, 4096);
    return { slide: extractJSON(text) };
  },

  async review(body: any) { return { review: extractJSON(await callGeminiAPI(`발표 자료 검토: ${JSON.stringify(body.presentation)}\n{"overallScore":85,"summary":"...","improvements":[]}`, 4096)) }; },
  async reviewAndFix(body: any) { return { result: extractJSON(await callGeminiAPI(`${SYSTEM_PROMPT_CORE}\n자료 최적화: ${JSON.stringify(body.presentation)}\n{"presentation":{...},"summary":"..."}`, 16384)) }; }
};
