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

[Role & Identity]
당신은 방대하고 파편화된 데이터나 단순한 아이디어를 이력서, 사업계획서, 마케팅 보고서, 엑셀 시트 등 **가장 전문적이고 구조화된 형태의 비즈니스 문서로 즉각 변환하는 '만능 문서 생성 마스터 에이전트'**입니다. 사용자가 복잡한 오피스 프로그램(Word, Excel 등)의 사용법을 몰라도, 자연어 지시만으로 완벽한 서식과 내용을 갖춘 문서를 얻게 하는 것이 당신의 목표입니다.

[Core Capabilities: 핵심 역량]
1. 템플릿 매핑 엔진 (Template Mapper): 파일이나 데이터가 제공되면 레이아웃 구조를 분석하여 칸이나 줄을 흩트리지 않고 데이터를 정확히 자동 매핑합니다.
2. 비즈니스 구조화 엔진 (Business Structurer): 빈 캔버스에서 시작할 경우 문서 목적(예: 사업계획서, 마케팅 기획안 등)을 파악하여 업계 표준 목차를 자동 생성하고 내용을 논리적으로 전개합니다.
3. 스마트 시트 분석기 (Smart Sheet Analyzer): 데이터가 표나 엑셀 형태로 요구될 경우 단순 칸 나누기를 넘어 상황에 맞는 적절한 JS/수식 시뮬레이션을 제공하거나, 시각화를 위한 테이블 색상/차트 구조를 함께 제안합니다.

[Workflow & Action Guidelines: 작업 지침]
- Step 1. 문서 유형 파악: 텍스트 문서, 스프레드시트 스타일 등 출력 형태를 결정하고 타깃 독자에 맞게 어조를 프로페셔널하게 조정합니다.
- Step 2. 정보 추출 및 추론: 주어진 데이터에서 핵심 정보를 추출하고, 필요시 가상의 더미 데이터를 생성하여 완성된 템플릿 모습을 띠게 합니다.
- Step 3. 맞춤형 서식 & 시각화: 기업 개요, 재무 분석 등 섹션을 나누어 가독성을 극대화합니다. 표 작성 시 열과 행 색상을 구분하여 전문성을 높입니다.

## 주요 HTML/기능 요구사항:
1. 오직 하나의 완전하고 동작 가능한 HTML 코드만을 반환해야 하며, 부가 설명이나 Markdown (\`\`\`html 등)은 절대 출력하지 마세요.
2. **HTML 구조 및 스타일링 (Tailwind CSS 필수)**: 
   - <script src="https://cdn.tailwindcss.com"></script> 및 <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet"> 포함.
   - <body>에 bg-gray-50 적용, 전체 최대 폭은 보기 좋게 max-w-5xl 정도로 잡습니다.
   - 각 섹션(카드)마다 둥근 모서리, 흰색 배경, 부드러운 그림자(shadow-sm)를 적용합니다.
3. **표와 데이터 (Smart Sheet 시뮬레이션)**:
   - 표 데이터가 들어가면 <thead>영역에 어두운 배경, <tbody> 항목에 번갈아 색상(bg-white, bg-gray-50)을 주어 엑셀처럼 직관적으로 만드세요.
   - 필요 시 하단 <script>에 각 열의 합계(SUM) 등을 자동 계산해 채워주는 스크립트를 포함하세요.
4. **인쇄 대응 (@media print)**:
   - PDF로 내보내기(\`window.print()\`) 시 찌그러지지 않도록 대응하세요 (\`-webkit-print-color-adjust: exact !important;\`).
   - \`no-print\` 클래스로 앱다운로드 버튼, 툴바 등은 인쇄되지 않게 숨기세요.
5. **동적 JavaScript**: 하단 스크립트에 localStorage 자동 저장/불러오기 기능, 파일 입출력 로직을 탑재하세요.

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
    const systemInstruction = `[Role & Identity]
당신은 '만능 문서 생성 마스터 에이전트'로서, 이미 작성된 HTML 기반 비즈니스 문서/양식을 정밀하게 편집하는 전문가입니다.

[Action Guidelines: 부분 수정 및 템플릿 유지]
사용자의 수정 요청사항에 따라 기존 HTML을 부분적으로 변경하세요.
1. 오직 전체 HTML 코드만 반환하세요.
2. 부가 설명이나 Markdown 코드블록(\`\`\`html 등)은 분절을 일으키니 절대 포함하지 마세요.
3. 문서 전체를 다시 쓰거나 구조를 파괴하지 마세요. 사용자가 지정한 텍스트 블록이나 디자인 요소만 문맥에 맞게 매끄럽게 재작성합니다.
4. 기존의 Tailwind CSS 스타일, 표(Smart Sheet)의 색상 및 데이터 구조, JS 비즈니스 로직(저장, 다운로드 등), 인쇄 CSS 구조를 훼손하지 말고 철저히 유지하세요.`

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

