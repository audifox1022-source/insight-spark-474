// ============================================================
// form-ai-service.ts — 양식 생성 AI 서비스
// ============================================================

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

async function callGeminiAPI(
  systemInstruction: string,
  userPrompt: string,
  maxTokens = 8192
): Promise<string> {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY 미설정");

  const payload = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: maxTokens,
    },
  };

  let lastError: Error = new Error("알 수 없는 오류");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (response.status === 429) {
      const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
      lastError = new Error(`API 요청 한도 초과. ${waitMs / 1000}초 후 재시도...`);
      await new Promise((res) => setTimeout(res, waitMs));
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = (errorBody as any)?.error?.message || "알 수 없는 오류";
      throw new Error(`AI 서버 오류 (${response.status}): ${message}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || text.trim() === "") throw new Error("빈 응답이 반환되었습니다.");
    return text;
  }

  throw lastError;
}

export const formAiService = {
  /**
   * 양식명 + 요청사항을 받아 완전한 HTML 양식 파일을 생성합니다.
   */
  async generateForm(formName: string, requirements: string): Promise<string> {
    const systemInstruction = `당신은 한국 업무환경에 최적화된 HTML 양식 생성 전문가입니다.
아래 규칙을 반드시 준수하세요:
1. 완전한 단일 HTML 파일을 생성합니다 (<!DOCTYPE html> 부터 </html> 까지).
2. Tailwind CSS CDN을 사용합니다.
3. Font Awesome CDN으로 아이콘을 사용합니다.
4. 한국어 업무환경 최적화 (존댓말, 비즈니스 용어, 한국 법규 반영).
5. localStorage 자동 저장/불러오기 기능 포함.
6. JSON 데이터 파일 다운로드/업로드 기능 포함.
7. window.print() 기반 PDF 저장 버튼 포함.
8. Tab 키로 placeholder 예시 내용 적용 기능 포함.
9. 양식명에 따른 동적 테마 색상 및 헤더 배경 적용.
10. @media print 스타일로 인쇄/PDF 품질 보장.
11. 반드시 HTML 코드만 반환하세요. 설명 텍스트나 마크다운 코드블록 없이 순수 HTML만.`;

    const themeGuide = getThemeGuide(formName);

    const userPrompt = `다음 양식을 생성해주세요.

양식명: ${formName}
요청사항: ${requirements || '기본 양식으로 생성'}

${themeGuide}

[필수 포함 섹션]
1. 상단 헤더: 양식명, 문서번호, 날짜, 작성자 (그라디언트 배경)
2. 양식 입력 영역: 양식명에 맞는 세부 입력 필드들 (카드형 섹션)
3. 하단 제어 버튼:
   - "양식 생성/미리보기" 버튼
   - "PDF 저장" 버튼
   - "데이터 파일로 저장" 버튼
   - "데이터 파일 불러오기" 버튼
   - "양식 초기화" 버튼
4. 생성된 문서 미리보기 영역 (인쇄 최적화)

[기술 스택]
- Tailwind CSS: <script src="https://cdn.tailwindcss.com"></script>
- Font Awesome: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
- Google Fonts (Noto Sans KR, Playfair Display)

[JavaScript 필수 함수]
- saveFormDataToLocalStorage()
- loadFormDataFromLocalStorage()
- clearForm()
- downloadDataFile()
- uploadDataFile(event)
- generateDocument()
- setupInputPlaceholders()

완전한 HTML 파일을 생성해주세요.`;

    const html = await callGeminiAPI(systemInstruction, userPrompt, 32768);

    // HTML 코드블록 제거 (AI가 마크다운으로 감쌀 경우)
    return html
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  },

  /**
   * 생성된 양식을 수정 요청합니다.
   */
  async modifyForm(currentHtml: string, modifyRequest: string): Promise<string> {
    const systemInstruction = `당신은 HTML 양식 수정 전문가입니다.
기존 HTML을 수정 요청에 따라 개선하고, 완전한 HTML 파일을 반환합니다.
반드시 HTML 코드만 반환하세요. 마크다운 코드블록 없이 순수 HTML만.`;

    const userPrompt = `다음 HTML 양식을 수정해주세요.

수정 요청: ${modifyRequest}

기존 HTML (앞 3000자):
${currentHtml.slice(0, 3000)}

... (이하 생략, 위 패턴을 유지하면서 수정 요청만 반영해주세요)

완전한 수정된 HTML 파일을 생성해주세요.`;

    const html = await callGeminiAPI(systemInstruction, userPrompt, 32768);

    return html
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  },
};

// 양식명 → 테마 가이드 생성
function getThemeGuide(formName: string): string {
  const themes: Record<string, { color: string; start: string; end: string; icon: string; bg: string }> = {
    보고서: { color: '#1d4ed8', start: '#1e3a8a', end: '#2563eb', icon: 'fa-file-chart-line', bg: 'business' },
    기획서: { color: '#7c3aed', start: '#4c1d95', end: '#7c3aed', icon: 'fa-lightbulb', bg: 'planning' },
    제안서: { color: '#0891b2', start: '#164e63', end: '#0891b2', icon: 'fa-handshake', bg: 'proposal' },
    계획서: { color: '#059669', start: '#064e3b', end: '#059669', icon: 'fa-calendar-check', bg: 'schedule' },
    회의록: { color: '#d97706', start: '#78350f', end: '#d97706', icon: 'fa-users', bg: 'meeting' },
    품의서: { color: '#dc2626', start: '#7f1d1d', end: '#dc2626', icon: 'fa-file-signature', bg: 'approval' },
    결재: { color: '#dc2626', start: '#7f1d1d', end: '#dc2626', icon: 'fa-stamp', bg: 'official' },
    계약서: { color: '#374151', start: '#111827', end: '#374151', icon: 'fa-file-contract', bg: 'contract' },
    이력서: { color: '#0369a1', start: '#0c4a6e', end: '#0369a1', icon: 'fa-user-tie', bg: 'resume' },
    보도자료: { color: '#0f172a', start: '#020617', end: '#0f172a', icon: 'fa-newspaper', bg: 'news' },
  };

  const matched = Object.entries(themes).find(([key]) => formName.includes(key));
  if (!matched) {
    return `[테마 색상] 파란색 계열 (--accent: #2563eb) 사용`;
  }

  const [, theme] = matched;
  return `[테마 색상]
- 주 색상: ${theme.color}
- 그라디언트: ${theme.start} → ${theme.end}
- 헤더 아이콘: ${theme.icon} (Font Awesome)
- CSS 변수:
  --accent-color: ${theme.color};
  --accent-color-start: ${theme.start};
  --accent-color-end: ${theme.end};`;
}
