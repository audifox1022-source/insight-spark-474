/**
 * gemini.ts — Centralized Gemini AI logic with Error Prevention Rules
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
4. 반드시 순수한 JSON만 반환하세요.

[슬라이드 JSON 스키마 참조]
{
  "layout_type": "title|content|two_column|kpi|conclusion",
  "theme": { "bg_color": "#hex", "accent_color": "#hex", "text_color": "#hex" },
  "content": {
    "title": "string",
    "subtitle": "string",
    "body": ["string 배열"],
    "kpis": [{"label":"","value":"","unit":"","trend":"up|down|neutral"}],
    "left_column": {"title":"","items":["string"]},
    "right_column": {"title":"","items":["string"]},
    "cta": "string"
  }
}
`;

const GENERATION_SYSTEM_PROMPT = `당신은 전문 프레젠테이션 디자이너입니다.
주어진 주제로 6-8장의 슬라이드를 JSON 배열로 생성하세요.
${COMMON_RULES}

[생성 가이드]
1. 첫 슬라이드는 'title', 중간은 'content/two_column/kpi', 마지막은 'conclusion' 레이아웃을 사용하세요.
2. 각 불릿 포인트가 60자를 넘지 않도록 핵심 위주로 정리하세요.
3. 데이터가 많다면 한 장의 슬라이드에 몰아넣지 말고 여러 장으로 분할 생성하세요.
4. 반드시 순수한 JSON 배열만 반환하세요.
`;

export async function classifyIntent(apiKey: string, currentSlideJSON: any, userCommand: string) {
  const prompt = `[현재 슬라이드 JSON]\n${JSON.stringify(currentSlideJSON, null, 2)}\n\n[사용자 수정 요청]\n"${userCommand}"\n\n변경이 필요한 JSON 노드만 반환하세요:`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: INTENT_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) throw new Error('API 호출 실패');
  const data = await response.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

export async function generateSlides(apiKey: string, topic: string, context: string = '') {
  const userPrompt = `주제: "${topic}"\n참고 문맥: "${context}"\n\n슬라이드를 생성해주세요.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: GENERATION_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) throw new Error('API 호출 실패');
  const data = await response.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}
