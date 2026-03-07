// ============================================================
// form-ai-service.ts — Edge Function 프록시 방식으로 수정
// VITE_GEMINI_API_KEY 완전 제거 → callGemini() 사용
// ============================================================

import { callGemini, type GeminiPayload } from '@/lib/gemini-client'

// ============================================================
// ✅ 핵심 교체: callGeminiAPI → Edge Function 프록시 사용
//    VITE_GEMINI_API_KEY 완전 제거
// ============================================================
async function callGeminiAPI(
  systemInstruction: string,
  userPrompt:        string,
  maxTokens = 8192
): Promise<string> {
  const payload: GeminiPayload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      { role: 'user', parts: [{ text: userPrompt }] },
    ],
    generationConfig: {
      temperature:     0.2,   // form-ai-service는 0.2 유지 (정확도 우선)
      maxOutputTokens: maxTokens,
    },
  }
  return callGemini(payload)
}

export const formAiService = {
  /**
   * 양식명 + 요청사항을 받아 완전한 HTML 양식 파일을 생성합니다.
   */
  async generateForm(formName: string, requirements: string): Promise<string> {
    const systemInstruction = `[양식명]: ${formName}

당신은 최고의 맞춤형 비즈니스 문서 폼/양식 생성 도우미입니다.
모든 결과물은 오직 하나의 완전하고 동작 가능한 HTML 코드만을 반환해야 하며, 부가 설명이나 Markdown (\`\`\`html 등)은 절대 출력하지 마세요.

## 주요 요구사항:
1. **한국 업무환경 및 생활문화 최적화**: 공손한 비즈니스 톤, 국내 기관/기업에서 통용되는 테이블 구조 및 결재란, 항목 배치 등을 기본으로 합니다.
2. **HTML 구조 및 스타일링 (Tailwind CSS 필수)**: 
   - <script src="https://cdn.tailwindcss.com"></script> 및 <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">를 <head>에 포함.
   - <body>에 bg-gray-50 적용, 전체 최대 폭은 max-w-5xl 정도로 잡아 보기 좋게 구성.
   - 헤더(제목 영역)에 \`gradient-header-bg\` 클래스를 부여하고 시각적 강조 효과를 줍니다.
   - 각 섹션(카드)마다 \`material-section\` 둥근 모서리, 흰색 배경, 그림자 적용.
   - <h2>, <h3> 제목 구역엔 \`section-heading\` 클래스를 주어 폰트 웨이트와 밑줄 아이콘 강조.
3. **인쇄 대응 (@media print)**:
   - PDF로 내보내기(\`window.print()\`) 시 찌그러짐을 방지하고 배경(그라디언트, 그림자)이 나오도록 \`-webkit-print-color-adjust: exact !important;\` 와 \`print-color-adjust: exact !important;\`를 반드시 포함하세요.
   - \`no-print\` 클래스로 "PDF 저장", "다운로드", "불러오기", "초기화" 등의 버튼이 인쇄되지 않게 숨기세요.
4. **동적 JavaScript 탑재**:
   - 하단 스크립트 란에 작성하세요.
   - 입력 필드의 예시 텍스트(placeholder)를 사용자가 Tab 키 등을 눌러 빠르게 적용할 수 있도록 로직 추가 (또는 그냥 직관적인 예시placeholder만 잘 넣어도 됨).
   - localStorage 자동 저장 및 로드 기능 (\`saveFormDataToLocalStorage\`, \`loadFormDataFromLocalStorage\`, \`clearForm\`).
   - 파일 입출력 로직: \`downloadDataFile\`(현재 폼의 JSON 다운), \`uploadDataFile\` (JSON 파일 업로드 후 폼 채우고 localStorage 저장).
   - 폼 상단 또는 하단에 기능 버튼("PDF 저장(window.print())", "데이터 파일로 저장", "데이터 파일 불러오기", "양식 초기화")을 \`no-print\` 영역에 배치.
5. **UI & 동적 변수**: 
   - \`--accent-color\`, \`--accent-color-start\`, \`--accent-color-end\` 등 CSS 변수를 사용해 테마를 맞추세요. (기본 파란색 계열)

아래의 요청사항을 반영하여, 완벽히 작동하는 HTML(CSS+JS 포함) 문서를 만들어 반환하세요.`

    const userPrompt = `양식명: ${formName}
추가 요청사항: ${requirements || '표준 비즈니스 양식으로 만들어주세요.'}

위 정보를 바탕으로 완벽히 디자인되고 기능(JS)이 포함된 완전한 index.html 코드를 작성하세요.
절대 설명을 덧붙이지 말고 <html> 태그로 시작하여 </html>로 끝나는 코드만 응답해야 합니다.`

    const html = await callGeminiAPI(systemInstruction, userPrompt, 65536)

    // HTML 코드블록 제거 (AI가 마크다운으로 감쌀 최악의 경우 대비)
    return html
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i,     '')
      .replace(/\s*```$/i,     '')
      .trim()
  },

  /**
   * 생성된 양식을 수정 요청합니다.
   */
  async modifyForm(currentHtml: string, modifyRequest: string): Promise<string> {
    const systemInstruction = `당신은 HTML 문서를 정밀하게 편집하는 전문가입니다.
사용자의 수정 요청사항에 따라 기존 HTML을 변경하세요.
1. 오직 전체 HTML 코드만 반환하세요.
2. 부가 설명이나 Markdown 코드블록(\`\`\`html 등)은 분절을 일으키니 절대 포함하지 마세요.
3. 기존의 Tailwind CSS 스타일, JS 비즈니스 로직(저장, 다운로드 등), 인쇄 CSS 등을 훼손하지 말고 그대로 유지하면서 요청 구역만 추가/수정/삭제하세요.`

    const userPrompt = `기존 HTML 코드를 바탕으로 다음 구체적인 수정사항을 반영하세요: "${modifyRequest}".

[기존 문서 코드]
${currentHtml}

위 전체 문서를 수정한 후 처음부터 끝까지 하나의 <html> 문서로 반환하세요. 오직 코드만 출력하세요.`

    const html = await callGeminiAPI(systemInstruction, userPrompt, 65536)

    return html
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i,     '')
      .replace(/\s*```$/i,     '')
      .trim()
  },
}

