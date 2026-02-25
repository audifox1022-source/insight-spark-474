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

const SYSTEM_PROMPT_CORE = `당신은 사용자가 제공한 원본 데이터를 완벽하게 분석하여 프레젠테이션으로 변환하는 '데이터 중심 전문가'입니다.

[🔥 절대 준수: 데이터 소스 우선순위 규칙 🔥]
1. [파일 데이터가 있는 경우]: 외부 지식이나 웹 검색을 배제하고, 오직 업로드된 파일의 텍스트만 사용하여 내용을 구성하세요.
2. [파일이 없고 주제만 있는 경우]: 사용자의 주제를 바탕으로 창의적으로 전개하되 범위를 벗어나지 마세요.

[시각화 및 형식 규칙]
1. 수치 데이터는 반드시 'table', 'kpi', 'barCompare' 타입을 사용하여 시각화하세요.
2. 'points', 'items', 'steps' 배열 내부에는 절대 객체({})를 넣지 말고 오직 "단순 문자열"만 넣으세요.
3. 'notes'는 발표용 구어체 대본으로 작성하되, 슬라이드당 3문장 이내로 작성하세요.
4. 모든 응답은 마크다운 없이 순수 JSON 객체여야 합니다.`;

// ✅ 수정: fileData 객체를 올바르게 파싱하여 텍스트로 변환
function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";

  // buildAIPayload()가 반환하는 { "파일명": { type, content/data } } 구조 처리
  if (typeof fileData === 'object' && !Array.isArray(fileData)) {
    const parts: string[] = [];

    for (const [fileName, value] of Object.entries(fileData)) {
      const v = value as any;

      // 파싱 실패 파일
      if (v.error) {
        parts.push(`### [${fileName}]\n⚠️ ${v.note || '파싱 실패'}`);
        continue;
      }

      // 텍스트/PDF/Word 파일
      if (v.content) {
        parts.push(`### [${fileName} (${v.type || 'text'})]:\n${v.content}`);
        continue;
      }

      // 엑셀 파일
      if (v.type === 'excel' && v.data) {
        const excelText = typeof v.data === 'string'
          ? v.data
          : JSON.stringify(v.data, null, 2);
        parts.push(`### [${fileName} (Excel)]:\n${excelText}`);
        continue;
      }

      // 이미지 파일
      if (v.type === 'image') {
        parts.push(`### [${fileName} (이미지)]: 이미지 파일이 포함되어 있습니다.`);
        continue;
      }

      // 기타
      parts.push(`### [${fileName}]:\n${JSON.stringify(v)}`);
    }

    const result = parts.join('\n\n');
    return result.slice(0, 100000);
  }

  // 배열인 경우 (예외 처리)
  if (Array.isArray(fileData)) {
    return fileData
      .map((f: any, i: number) => {
        const content = f.content || f.text || JSON.stringify(f);
        return `### [파일 ${i + 1}: ${f.fileName || '문서'}]\n${content}`;
      })
      .join('\n\n')
      .slice(0, 100000);
  }

  return String(fileData).slice(0, 100000);
}

/**
 * 손상되거나 잘린 JSON을 복구하는 방탄 파서
 */
function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();

  // 마크다운 코드 블록 제거
  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();

  try {
    return JSON.parse(cleanText);
  } catch {
    console.warn('JSON 손상 감지, 복구 시도 중...');

    let repaired = cleanText;
    if ((repaired.match(/"/g) || []).length % 2 !== 0) repaired += '"';

    let braces = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
    let brackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;

    while (brackets > 0) { repaired += ']'; brackets--; }
    while (braces > 0) { repaired += '}'; braces--; }

    try {
      const finalJson = repaired.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(finalJson);
    } catch {
      console.error('JSON 복구 실패:', cleanText.slice(-50));
      return null;
    }
  }
}

/**
 * Gemini API 호출
 */
async function callGeminiAPI(prompt: string) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다.');

  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
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

  return data.candidates[0].content.parts[0].text;
}

export const aiService = {

  // ✅ 수정: meetingInfo, template 프롬프트에 반영
  async getOutline(body: any) {
    const { fileData, settings, meetingInfo, template } = body;
    const fileContent = truncateFileData(fileData);

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

    const text = await callGeminiAPI(prompt);
    let data = extractJSON(text);
    if (!data) throw new Error('구성안 파싱 실패');
    if (Array.isArray(data)) data = { title: '발표 구성안', outline: data };
    return { outline: data };
  },

  // ✅ 수정: meetingInfo, template 프롬프트에 반영
  async generatePresentation(body: any) {
    const { fileData, settings, approvedOutline, meetingInfo, template } = body;
    const fileContent = truncateFileData(fileData);

    const outlineHint = approvedOutline
      ? `\n[승인된 목차 - 반드시 이 구성을 따르세요]\n${JSON.stringify(approvedOutline, null, 2)}`
      : '';

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 원본 자료를 바탕으로 슬라이드 내용을 완성하세요.
데이터가 있다면 반드시 'headers', 'rows', 'stats' 필드를 채워 시각화하세요.

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

반드시 아래 JSON 형식만 반환하세요:
{"title": "제목", "slides": [{"slideNumber": 1, "type": "title|data|chart|action|summary", "title": "슬라이드 제목", "content": ["내용1", "내용2"], "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up|down|flat"}], "notes": "발표자 노트"}]}`;

    const text = await callGeminiAPI(prompt);
    let data = extractJSON(text);
    if (!data) throw new Error('발표 자료 파싱 실패');
    if (Array.isArray(data)) data = { title: '발표 자료', slides: data };

    // React Key용 고유 ID 부여
    data.slides = data.slides.map((s: any, i: number) => ({
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
- 전체 발표 제목: ${presentation?.title || ''}
- 슬라이드 번호: ${slideIndex + 1}번
- 수정 요청: "${userInstruction || '더 좋은 내용으로 전면 재작성해주세요.'}"
- 현재 슬라이드: ${JSON.stringify(currentSlide)}
- 원본 자료: ${fileContent}

슬라이드 JSON 1개만 반환하세요:
{"slideNumber": ${slideIndex + 1}, "type": "...", "title": "...", "content": ["..."], "keyMetrics": [], "notes": "..."}`;

    const text = await callGeminiAPI(prompt);
    return { slide: extractJSON(text) };
  },

  async chatEdit(body: any) {
    const { userMessage, currentSlide, slideIndex, presentation } = body;

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 사용자 요청에 따라 슬라이드를 수정하세요.
- 전체 발표: ${presentation?.title || ''}
- 현재 슬라이드 (${(slideIndex || 0) + 1}번): ${JSON.stringify(currentSlide)}
- 수정 요청: "${userMessage}"

아래 JSON 형식으로 반환하세요:
{"slide": {"slideNumber": ${(slideIndex || 0) + 1}, "type": "...", "title": "...", "content": ["..."], "keyMetrics": [], "notes": "..."}, "summary": "변경 내용 한 줄 요약"}`;

    const text = await callGeminiAPI(prompt);
    return { result: extractJSON(text) };
  },

  async changePersona(body: any) {
    const { currentSlide, persona } = body;

    const personaPrompts: Record<string, string> = {
      jobs: '스티브 잡스 스타일: 단순하고 강렬한 메시지, 감성적 스토리텔링',
      mckinsey: '맥킨지 컨설턴트 스타일: 데이터 중심, MECE 구조, 논리적 흐름',
      ceo: '임원 보고 스타일: 두괄식, 핵심 수치 중심, 의사결정 지원',
      team: '팀 공유 스타일: 친근한 구어체, 협업 강조, 실행 중심',
      client: '외부 고객 스타일: 전문적이고 설득력 있는 제안 형식',
    };

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 아래 페르소나 스타일로 슬라이드를 재작성하세요.
- 페르소나: ${personaPrompts[persona] || persona}
- 현재 슬라이드: ${JSON.stringify(currentSlide)}

슬라이드 JSON 1개만 반환하세요 (slideNumber, type, title, content, keyMetrics, notes 포함).`;

    const text = await callGeminiAPI(prompt);
    return { slide: extractJSON(text) };
  },

  async review(body: any) {
    const { presentation } = body;

    const prompt = `발표 자료 전문가로서 아래 발표 자료를 검토하고 개선점을 제안하세요.
- 발표 자료: ${JSON.stringify(presentation)}

아래 JSON 형식으로 반환하세요:
{"overallScore": 85, "summary": "전체 평가 한 줄", "improvements": [{"slideIndex": 0, "issue": "문제점", "suggestion": "개선 제안"}]}`;

    const text = await callGeminiAPI(prompt);
    return { review: extractJSON(text) };
  },

  // ✅ 수정: 반환 구조 명확화 (result.presentation 보장)
  async reviewAndFix(body: any) {
    const { presentation } = body;

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 아래 발표 자료 전체를 검토하고 논리적 흐름, 내용 완성도, 일관성을 최적화하세요.
- 원본 발표 자료: ${JSON.stringify(presentation)}

아래 JSON 형식으로 반환하세요:
{"presentation": {"title": "...", "slides": [...]}, "summary": "개선된 내용 요약"}`;

    const text = await callGeminiAPI(prompt);
    const data = extractJSON(text);
    if (!data) throw new Error('최적화 파싱 실패');

    // ✅ presentation 키가 없는 경우 대응
    if (!data.presentation && data.slides) {
      return { result: { presentation: data, summary: '전체 발표 자료가 최적화되었습니다.' } };
    }

    return { result: data };
  },
};
