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

// ✅ 볼륨별 토큰 한도 — JSON 잘림 방지
const TOKEN_MAP: Record<string, number> = {
  brief: 4096,
  standard: 12000,
  detailed: 24000,
  comprehensive: 32768,
};

const SYSTEM_PROMPT_CORE = `당신은 사용자가 제공한 원본 데이터를 완벽하게 분석하여 프레젠테이션으로 변환하는 '데이터 중심 전문가'입니다.

[🔥 절대 준수: 데이터 소스 우선순위 규칙 🔥]
1. [파일 데이터가 있는 경우]: 외부 지식이나 웹 검색을 배제하고, 오직 업로드된 파일의 텍스트만 사용하여 내용을 구성하세요.
2. [파일이 없고 주제만 있는 경우]: 사용자의 주제를 바탕으로 창의적으로 전개하되 범위를 벗어나지 마세요.

[🎨 시각화 생성 규칙 — 반드시 준수]
1. 수치 비교 데이터(매출, 성장률 등) → "stats" 배열 필수 사용 (바 차트로 렌더링됨)
2. 비율/구성 데이터(점유율, 예산 배분 등) → "chartData" 필드 사용 (파이/도넛 차트로 렌더링됨)
3. 항목 비교표(기능 비교, 일정표 등) → "tableData" 필드 사용 (표로 렌더링됨)
4. 핵심 KPI 수치(단일 지표 강조) → "keyMetrics" 배열 사용 (카드로 렌더링됨)
5. 수치 데이터가 있다면 반드시 위 4가지 중 하나 이상을 사용하세요. 텍스트로만 처리하지 마세요.
6. 'content' 배열 내부에는 절대 객체({})를 넣지 말고 오직 "단순 문자열"만 넣으세요.
7. 'notes'는 발표용 구어체 대본으로 작성하되, 슬라이드당 2문장 이내로 간결하게 작성하세요.
8. 모든 응답은 마크다운 없이 순수 JSON 객체여야 합니다.
9. JSON이 잘리지 않도록 notes와 content는 간결하게 작성하세요.`;

// ✅ fileData 객체를 올바르게 파싱
function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";

  if (typeof fileData === 'object' && !Array.isArray(fileData)) {
    const parts: string[] = [];

    for (const [fileName, value] of Object.entries(fileData)) {
      const v = value as any;

      if (v.error) {
        parts.push(`### [${fileName}]\n⚠️ ${v.note || '파싱 실패'}`);
        continue;
      }
      if (v.content) {
        parts.push(`### [${fileName} (${v.type || 'text'})]:\n${v.content}`);
        continue;
      }
      if (v.type === 'excel' && v.data) {
        const excelText = typeof v.data === 'string' ? v.data : JSON.stringify(v.data, null, 2);
        parts.push(`### [${fileName} (Excel)]:\n${excelText}`);
        continue;
      }
      if (v.type === 'image') {
        parts.push(`### [${fileName} (이미지)]: 이미지 파일이 포함되어 있습니다.`);
        continue;
      }
      parts.push(`### [${fileName}]:\n${JSON.stringify(v)}`);
    }

    return parts.join('\n\n').slice(0, 80000);
  }

  if (Array.isArray(fileData)) {
    return fileData
      .map((f: any, i: number) => {
        const content = f.content || f.text || JSON.stringify(f);
        return `### [파일 ${i + 1}: ${f.fileName || '문서'}]\n${content}`;
      })
      .join('\n\n')
      .slice(0, 80000);
  }

  return String(fileData).slice(0, 80000);
}

/**
 * ✅ 방탄 JSON 파서 — 잘린 JSON 복구
 */
function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();

  // 마크다운 코드 블록 제거
  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();

  // 1차: 정상 파싱
  try {
    return JSON.parse(cleanText);
  } catch {
    console.warn('JSON 손상 감지, 복구 시도 중...');
  }

  // 2차: 잘린 문자열 닫기 + 괄호 맞추기
  try {
    let repaired = cleanText;
    if ((repaired.match(/"/g) || []).length % 2 !== 0) repaired += '"';

    let braces   = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
    let brackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;

    while (brackets > 0) { repaired += ']'; brackets--; }
    while (braces   > 0) { repaired += '}'; braces--;   }

    const finalJson = repaired.replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(finalJson);
  } catch {
    console.warn('2차 복구 시도 중...');
  }

  // ✅ 3차: slides 배열만 추출 시도 (부분 파싱)
  try {
    const slidesMatch = cleanText.match(/"slides"\s*:\s*(\[[\s\S]*)/);
    if (slidesMatch) {
      let slidesText = slidesMatch[1];
      let brackets = (slidesText.match(/\[/g) || []).length - (slidesText.match(/\]/g) || []).length;
      while (brackets > 0) { slidesText += ']'; brackets--; }
      slidesText = slidesText.replace(/,\s*([\]}])/g, '$1');

      const slides = JSON.parse(slidesText);
      const titleMatch = cleanText.match(/"title"\s*:\s*"([^"]+)"/);
      return {
        title: titleMatch ? titleMatch[1] : '발표 자료',
        slides: Array.isArray(slides) ? slides : [],
      };
    }
  } catch {
    console.warn('3차 부분 복구 시도 중...');
  }

  // ✅ 4차: 완성된 슬라이드 객체만 추출
  try {
    const slideObjects: any[] = [];
    const slidePattern = /\{[^{}]*"slideNumber"[^{}]*"title"[^{}]*\}/g;
    const matches = cleanText.match(slidePattern);
    if (matches && matches.length > 0) {
      for (const m of matches) {
        try {
          slideObjects.push(JSON.parse(m));
        } catch { /* skip */ }
      }
    }
    if (slideObjects.length > 0) {
      console.warn(`✅ ${slideObjects.length}개 슬라이드 부분 복구 성공`);
      const titleMatch = cleanText.match(/"title"\s*:\s*"([^"]+)"/);
      return {
        title: titleMatch ? titleMatch[1] : '발표 자료',
        slides: slideObjects,
      };
    }
  } catch { /* skip */ }

  console.error('JSON 복구 최종 실패:', cleanText.slice(-100));
  return null;
}

/**
 * ✅ Gemini API 호출 — 타임아웃 + 볼륨별 토큰 지원
 */
async function callGeminiAPI(prompt: string, maxTokens: number = 8192) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다.');

  // ✅ 60초 타임아웃
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
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API 오류:', response.status, errText);
      throw new Error(`AI 서버 통신 오류 (${response.status})`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('AI 응답이 비어있습니다.');
    }

    // ✅ finishReason 체크 — STOP이 아니면 잘린 것
    const candidate = data.candidates[0];
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.warn(`⚠️ Gemini finishReason: ${candidate.finishReason} — 응답이 잘렸을 수 있습니다.`);
    }

    return candidate.content.parts[0].text;

  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('AI 응답 시간 초과 (60초). 다시 시도해주세요.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ✅ 슬라이드 JSON 스키마 설명 (generatePresentation / regenerateSlide 공용)
const SLIDE_JSON_SCHEMA = `
슬라이드 JSON 스키마 (각 필드 설명):
- slideNumber: 슬라이드 번호 (number)
- type: "title" | "agenda" | "data" | "chart" | "action" | "summary" | "closing" | "kpi"
- title: 슬라이드 제목 (string)
- content: 텍스트 불릿 배열 (string[]). 반드시 순수 문자열만.
- keyMetrics: KPI 카드 배열. 단일 핵심 수치 강조시 사용.
  형식: [{"label": "지표명", "value": "150억", "trend": "up|down|flat", "description": "부연설명(선택)"}]
- stats: 바 차트 배열. 여러 항목의 수치 비교시 사용.
  형식: [{"label": "항목명", "value": "75", "unit": "%"}]
  ※ value는 숫자 문자열로 입력 (바 길이 계산에 사용됨)
- chartData: 파이/도넛 차트. 비율/구성 비교시 사용.
  형식: {"type": "pie", "labels": ["항목A","항목B"], "values": [60, 40]}
- tableData: 표. 항목별 비교, 일정표 등에 사용.
  형식: {"headers": ["구분","내용","비고"], "rows": [["행1열1","행1열2","행1열3"]]}
- notes: 발표자 대본 (2문장 이내 구어체)

[시각화 선택 가이드]
- 수치가 3개 이상 비교: stats 사용
- 비율/퍼센트 구성: chartData 사용  
- 행/열 비교표: tableData 사용
- 단일 핵심 KPI: keyMetrics 사용
- 수치 데이터가 전혀 없는 경우에만 content만 사용
`;

export const aiService = {

  async getOutline(body: any) {
    const { fileData, settings, meetingInfo, template } = body;
    const fileContent = truncateFileData(fileData);
    const maxTokens = TOKEN_MAP[settings?.volume || 'standard'];

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 제공된 자료를 분석하여 '발표 목차(구성안)'만 설계하세요.
상세 본문이나 대본은 생성하지 마세요. 오직 구조만 반환하세요.

[발표 정보]
- 발표 주제: ${meetingInfo?.week || '미입력'}
- 발표자: ${meetingInfo?.reporter || '미입력'}
- 소속/부서: ${meetingInfo?.department || '미입력'}
- 추가 지시사항: ${meetingInfo?.notes || '없음'}
- 템플릿: ${TEMPLATE_MAP[template || 'auto']}
- 난이도: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']}
- 분량: ${VOLUME_MAP[settings?.volume || 'standard']}

[원본 자료]
${fileContent}

반드시 아래 JSON 형식만 반환하세요:
{"title": "전체 제목", "outline": [{"slideNumber": 1, "title": "제목", "type": "title|agenda|data|chart|action|summary", "description": "이 슬라이드에서 다룰 내용 한 줄 요약"}]}`;

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

    const outlineHint = approvedOutline
      ? `\n[승인된 목차 - 반드시 이 구성을 따르세요]\n${JSON.stringify(approvedOutline, null, 2)}`
      : '';

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 원본 자료를 바탕으로 슬라이드 내용을 완성하세요.
수치/비교/비율 데이터가 있다면 반드시 stats, chartData, tableData, keyMetrics 중 적절한 필드를 사용하세요.
텍스트(content)만으로 처리하면 안 됩니다.

[발표 정보]
- 발표 주제: ${meetingInfo?.week || '미입력'}
- 발표자: ${meetingInfo?.reporter || '미입력'}
- 소속/부서: ${meetingInfo?.department || '미입력'}
- 추가 지시사항: ${meetingInfo?.notes || '없음'}
- 템플릿: ${TEMPLATE_MAP[template || 'auto']}
- 난이도: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']}
- 분량: ${VOLUME_MAP[settings?.volume || 'standard']}
${outlineHint}

[원본 자료]
${fileContent}

${SLIDE_JSON_SCHEMA}

반드시 아래 JSON 형식만 반환하세요 (notes는 2문장 이내로 간결하게):
{
  "title": "제목",
  "slides": [
    {
      "slideNumber": 1,
      "type": "title|data|chart|action|summary|kpi",
      "title": "슬라이드 제목",
      "content": ["텍스트 불릿1", "텍스트 불릿2"],
      "keyMetrics": [{"label": "매출", "value": "150억", "trend": "up", "description": "전년比 +23%"}],
      "stats": [{"label": "항목A", "value": "75", "unit": "%"}],
      "chartData": {"type": "pie", "labels": ["A","B"], "values": [60, 40]},
      "tableData": {"headers": ["구분","내용"], "rows": [["행1","값1"]]},
      "notes": "발표자 노트 (2문장 이내)"
    }
  ]
}`;

    const text = await callGeminiAPI(prompt, maxTokens);
    let data = extractJSON(text);
    if (!data) throw new Error('발표 자료 파싱 실패');
    if (Array.isArray(data)) data = { title: '발표 자료', slides: data };

    data.slides = (data.slides || []).map((s: any, i: number) => ({
      ...s,
      id: `slide-${Date.now()}-${i}`,
    }));

    return { presentation: data };
  },

  async regenerateSlide(body: any) {
    const { currentSlide, userInstruction, fileData, slideIndex, presentation } = body;
    const fileContent = truncateFileData(fileData);

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 수정 요청을 반영하되 원본 자료를 참고하세요.
수치/비교/비율 데이터가 있다면 반드시 stats, chartData, tableData, keyMetrics 중 적절한 필드를 사용하세요.
- 전체 발표 제목: ${presentation?.title || ''}
- 슬라이드 번호: ${slideIndex + 1}번
- 수정 요청: "${userInstruction || '더 좋은 내용으로 전면 재작성해주세요.'}"
- 현재 슬라이드: ${JSON.stringify(currentSlide)}
- 원본 자료: ${fileContent}

${SLIDE_JSON_SCHEMA}

슬라이드 JSON 1개만 반환하세요:
{
  "slideNumber": ${slideIndex + 1},
  "type": "...",
  "title": "...",
  "content": ["..."],
  "keyMetrics": [],
  "stats": [],
  "chartData": null,
  "tableData": null,
  "notes": "..."
}`;

    const text = await callGeminiAPI(prompt, 4096);
    return { slide: extractJSON(text) };
  },

  async chatEdit(body: any) {
    const { userMessage, currentSlide, slideIndex, presentation } = body;

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 사용자 요청에 따라 슬라이드를 수정하세요.
수치/비교/비율 데이터가 있다면 반드시 stats, chartData, tableData, keyMetrics 중 적절한 필드를 사용하세요.
- 전체 발표: ${presentation?.title || ''}
- 현재 슬라이드 (${(slideIndex || 0) + 1}번): ${JSON.stringify(currentSlide)}
- 수정 요청: "${userMessage}"

${SLIDE_JSON_SCHEMA}

아래 JSON 형식으로 반환하세요:
{
  "slide": {
    "slideNumber": ${(slideIndex || 0) + 1},
    "type": "...",
    "title": "...",
    "content": ["..."],
    "keyMetrics": [],
    "stats": [],
    "chartData": null,
    "tableData": null,
    "notes": "..."
  },
  "summary": "변경 내용 한 줄 요약"
}`;

    const text = await callGeminiAPI(prompt, 4096);
    return { result: extractJSON(text) };
  },

  async changePersona(body: any) {
    const { currentSlide, persona } = body;

    const personaPrompts: Record<string, string> = {
      jobs:     '스티브 잡스 스타일: 단순하고 강렬한 메시지, 감성적 스토리텔링',
      mckinsey: '맥킨지 컨설턴트 스타일: 데이터 중심, MECE 구조, 논리적 흐름',
      ceo:      '임원 보고 스타일: 두괄식, 핵심 수치 중심, 의사결정 지원',
      team:     '팀 공유 스타일: 친근한 구어체, 협업 강조, 실행 중심',
      client:   '외부 고객 스타일: 전문적이고 설득력 있는 제안 형식',
    };

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 아래 페르소나 스타일로 슬라이드를 재작성하세요.
수치 데이터가 있다면 stats, chartData, tableData, keyMetrics를 유지하거나 강화하세요.
- 페르소나: ${personaPrompts[persona] || persona}
- 현재 슬라이드: ${JSON.stringify(currentSlide)}

${SLIDE_JSON_SCHEMA}

슬라이드 JSON 1개만 반환하세요 (slideNumber, type, title, content, keyMetrics, stats, chartData, tableData, notes 포함).`;

    const text = await callGeminiAPI(prompt, 4096);
    return { slide: extractJSON(text) };
  },

  async review(body: any) {
    const { presentation } = body;

    const prompt = `발표 자료 전문가로서 아래 발표 자료를 검토하고 개선점을 제안하세요.
- 발표 자료: ${JSON.stringify(presentation)}

아래 JSON 형식으로 반환하세요:
{"overallScore": 85, "summary": "전체 평가 한 줄", "improvements": [{"slideIndex": 0, "issue": "문제점", "suggestion": "개선 제안"}]}`;

    const text = await callGeminiAPI(prompt, 4096);
    return { review: extractJSON(text) };
  },

  async reviewAndFix(body: any) {
    const { presentation } = body;

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 아래 발표 자료 전체를 검토하고 논리적 흐름, 내용 완성도, 일관성을 최적화하세요.
수치 데이터가 있는 슬라이드는 stats, chartData, tableData, keyMetrics를 적극 활용하세요.
- 원본 발표 자료: ${JSON.stringify(presentation)}

${SLIDE_JSON_SCHEMA}

아래 JSON 형식으로 반환하세요:
{"presentation": {"title": "...", "slides": [...]}, "summary": "개선된 내용 요약"}`;

    const text = await callGeminiAPI(prompt, 16384);
    const data = extractJSON(text);
    if (!data) throw new Error('최적화 파싱 실패');

    if (!data.presentation && data.slides) {
      return { result: { presentation: data, summary: '전체 발표 자료가 최적화되었습니다.' } };
    }

    return { result: data };
  },
};
