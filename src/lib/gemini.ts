/**
 * gemini.ts — Centralized Gemini AI logic with Error Prevention Rules
 * [FIX] Hardcoded URL models/gemini-1.5-flash -> models/gemini-2.5-flash
 */

const COMMON_RULES = `
[절대 규칙: 오버플로우 방지]
1. 각 불릿 포인트(Bullet point)는 공백 포함 **최대 60자**를 초과할 수 없습니다.
2. 특정 슬라이드에 내용이 너무 많을 경우, 내용을 요약하거나 다음 슬라이드로 나누어(Smart Splitting) 생성하세요.
3. 텍스트가 컨테이너를 벗어나지 않도록 간결하고 명확하게 작성하세요.

[절대 규칙: 할루시네이션 차단]
1. 모든 슬라이드 데이터는 사용자가 제공한 컨텍스트나 신뢰할 수 있는 RAG 검색 결과 범위 내에서만 추출하세요.
2. 절대 임의로 허위 정보를 지어내거나 근거 없는 수치를 날조하지 마세요.
3. 정보가 부족할 경우 지어내지 말고, 있는 그대로의 사실만 전달하거나 추가 정보를 요청하는 텍스트를 담으세요.
`;

const INTENT_SYSTEM_PROMPT = `당신은 프레젠테이션 슬라이드 JSON 데이터를 부분적으로 수정하는 AI입니다.
${COMMON_RULES}

[수정 규칙]
1. 전체 슬라이드를 재생성하지 마세요.
2. 사용자의 요청에 따라 변경이 필요한 특정 노드의 값만 수정하여 반환하세요.
3. 수정된 텍스트 역시 60자 제한을 엄격히 준수해야 합니다.
4. 반드시 순수한 JSON 객체만 반환하세요.

[슬라이드 JSON 스키마 필드 가이드 (presentation.ts 준수)]
{
  "type": "title|section|content|process|compare|timeline|kpi|chart|table",
  "title": "슬라이드 제목",
  "subhead": "부제목 (선택사항)",
  "content": ["본문 불릿 포인트 배열"],
  "keyMetrics": [{"label":"지표명","value":"값","unit":"단위","trend":"up|down|flat"}],
  "leftItems": ["좌측 리스트"],
  "rightItems": ["우측 리스트"],
  "bgGradient": "linear-gradient(135deg, #hex, #hex)",
  "layout": "default|split-left|split-right|grid"
}
`;

const GENERATION_SYSTEM_PROMPT = `당신은 전문 프레젠테이션 디자이너입니다.
주제에 맞는 고품질 슬라이드 6-8장을 JSON 배열로 생성하세요.
${COMMON_RULES}

[생성 가이드]
1. 슬라이드 순서에 따라 적절한 'type'을 선택하세요 (title -> section -> content/process/kpi -> closing).
2. 각 본문(\`content\`) 항목이 60자를 넘지 않도록 작성하세요.
3. 데이터가 많다면 한 장에 모두 넣지 말고 여러 장으로 분할(Smart Splitting) 생성하세요.
4. 반드시 다음 필드명을 엄격히 준수하는 JSON 배열만 반환하세요:
   - "type", "title", "subhead", "content", "keyMetrics", "leftItems", "rightItems", "layout", "slideNumber"

예시 스키마:
[
  {
    "slideNumber": 1,
    "type": "title",
    "title": "주제 제목",
    "subhead": "부제 또는 설명"
  },
  {
    "slideNumber": 2,
    "type": "content",
    "title": "핵심 내용",
    "content": ["포인트 1", "포인트 2"]
  }
]
`;

import { callGeminiAPI } from '@/services/ai/api-client';

export async function classifyIntent(apiKey_ignored: string, currentSlideJSON: any, userCommand: string) {
  const prompt = `[현재 슬라이드 JSON]\n${JSON.stringify(currentSlideJSON, null, 2)}\n\n[사용자 수정 요청]\n"${userCommand}"\n\n변경이 필요한 JSON 노드만 반환하세요:`;
  const result = await callGeminiAPI(INTENT_SYSTEM_PROMPT, prompt);
  return JSON.parse(result);
}

export async function generateSlides(apiKey_ignored: string, topic: string, context: string = '') {
  const userPrompt = `주제: "${topic}"\n참고 문맥: "${context}"\n\n슬라이드를 생성해주세요.`;
  const result = await callGeminiAPI(GENERATION_SYSTEM_PROMPT, userPrompt);
  return JSON.parse(result);
}
