import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "쉽고 간결하게, 핵심 내용만 전달. 전문 용어를 최소화하고 이해하기 쉬운 표현 사용.",
  medium: "일반적인 업무 보고 수준. 적절한 전문 용어와 데이터 분석 포함.",
  hard: "심층 분석 포함. 상세한 데이터 해석, 통계적 트렌드, 기술적 용어 적극 활용.",
  executive: "경영진 보고 수준. 전략적 관점에서의 분석, 의사결정에 필요한 핵심 인사이트와 리스크/기회 요인 강조.",
};

const VOLUME_MAP: Record<string, string> = {
  brief: "3-4장으로 핵심만 압축. 표지 포함 최소한의 슬라이드.",
  standard: "5-7장의 표준적인 보고 분량. 표지, 요약, 분석, 제안, 마무리 포함.",
  detailed: "8-12장의 상세한 분석. 각 주제별 개별 슬라이드와 추가 데이터 분석 포함.",
  comprehensive: "13장 이상의 종합 보고서. 모든 데이터의 심층 분석, 부록, 참고 자료 포함.",
};

const TEMPLATE_MAP: Record<string, string> = {
  auto: "파일 내용을 분석하여 가장 적합한 구성을 자동으로 선택하세요.",
  report: "현황 → 분석 → 결론 → 실행계획 순서로 구성하세요.",
  analysis: "차트와 수치 중심의 데이터 분석 발표로 구성하세요.",
  proposal: "문제 제기 → 솔루션 → 기대효과 순서로 구성하세요.",
  summary: "핵심 내용만 간결하게 압축한 브리핑으로 구성하세요.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ── 모드별 분기 ──
    if (mode === "outline") {
      return await handleOutline(body, LOVABLE_API_KEY);
    } else if (mode === "regenerate_slide") {
      return await handleRegenerateSlide(body, LOVABLE_API_KEY);
    } else if (mode === "chat_edit") {
      return await handleChatEdit(body, LOVABLE_API_KEY);
    } else {
      return await handleGenerate(body, LOVABLE_API_KEY);
    }
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "알 수 없는 오류" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── 1. 구성안(목차) 미리보기 생성 ──
async function handleOutline(body: any, apiKey: string) {
  const { fileData, meetingInfo, settings, template } = body;
  const difficulty = settings?.difficulty || "medium";
  const volume = settings?.volume || "standard";

  const prompt = `당신은 발표 자료 구성 전문가입니다.
업로드된 파일 데이터를 분석하여 발표 자료의 목차(구성안)를 먼저 제안해주세요.

회의 정보:
- 발표 주제: ${meetingInfo.week || '미입력'}
- 부서: ${meetingInfo.department || '미입력'}
- 발표자: ${meetingInfo.reporter || '미입력'}
- 추가 지시사항: ${meetingInfo.notes || '없음'}

설정:
- 난이도: ${DIFFICULTY_MAP[difficulty]}
- 분량: ${VOLUME_MAP[volume]}
- 템플릿: ${TEMPLATE_MAP[template] || TEMPLATE_MAP.auto}

파일 데이터:
${JSON.stringify(fileData, null, 2)}

아래 JSON 형식으로 목차만 생성하세요 (슬라이드 전체 내용은 생성하지 마세요):
{
  "title": "전체 발표 제목",
  "outline": [
    {
      "slideNumber": 1,
      "title": "슬라이드 제목",
      "type": "title|data|chart|action|summary",
      "description": "이 슬라이드에서 다룰 내용 한 줄 요약"
    }
  ]
}`;

  const data = await callAI(prompt, apiKey);
  const content = data.choices?.[0]?.message?.content || "";

  let outline;
  try {
    const match = content.match(/\{[\s\S]*\}/);
    outline = match ? JSON.parse(match[0]) : null;
  } catch {
    outline = null;
  }

  return new Response(JSON.stringify({ outline }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── 2. 전체 슬라이드 생성 ──
async function handleGenerate(body: any, apiKey: string) {
  const { fileData, meetingInfo, settings, template, approvedOutline } = body;
  const difficulty = settings?.difficulty || "medium";
  const volume = settings?.volume || "standard";

  const outlineHint = approvedOutline
    ? `\n\n사용자가 승인한 목차 구성:\n${JSON.stringify(approvedOutline, null, 2)}\n위 목차 구성을 반드시 따르세요.`
    : "";

  const systemPrompt = `당신은 전문 발표 자료 작성 전문가입니다.

핵심 원칙:
- AI가 생성한 느낌이 전혀 나지 않는, 현장 관리자가 직접 작성한 것 같은 자연스러운 문체
- 구체적 데이터와 수치를 활용한 근거 기반 보고
- 실행 가능한 개선 방안과 인사이트 제시
- 간결하고 핵심적인 내용 구성

📊 난이도: ${DIFFICULTY_MAP[difficulty]}
📄 분량: ${VOLUME_MAP[volume]}
📋 템플릿: ${TEMPLATE_MAP[template] || TEMPLATE_MAP.auto}
${outlineHint}

반드시 아래 JSON 형식으로 생성하세요:
{
  "title": "전체 발표 제목",
  "slides": [
    {
      "slideNumber": 1,
      "title": "슬라이드 제목",
      "type": "title|data|chart|action|summary",
      "content": ["핵심 내용 항목들"],
      "notes": "발표자 노트",
      "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up|down|flat"}]
    }
  ]
}`;

  const userPrompt = `회의 정보:
- 발표 주제: ${meetingInfo.week || '미입력'}
- 부서: ${meetingInfo.department || '미입력'}
- 발표자: ${meetingInfo.reporter || '미입력'}
- 추가 지시사항: ${meetingInfo.notes || '없음'}

파일 데이터:
${JSON.stringify(fileData, null, 2)}

위 데이터를 분석하여 발표 자료를 생성해주세요.`;

  const data = await callAI(`${systemPrompt}\n\n${userPrompt}`, apiKey);
  const content = data.choices?.[0]?.message?.content || "";

  let presentation;
  try {
    const match = content.match(/\{[\s\S]*\}/);
    presentation = match ? JSON.parse(match[0]) : null;
  } catch {
    presentation = null;
  }

  return new Response(JSON.stringify({ presentation, rawContent: content }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── 3. 특정 슬라이드만 재생성 ──
async function handleRegenerateSlide(body: any, apiKey: string) {
  const { slideIndex, currentSlide, presentation, fileData, meetingInfo, settings, userInstruction } = body;

  const prompt = `당신은 전문 발표 자료 작성 전문가입니다.
아래 슬라이드를 개선하거나 다시 작성해주세요.

전체 발표 제목: ${presentation?.title || ''}
전체 슬라이드 수: ${presentation?.slides?.length || 0}장
현재 슬라이드 번호: ${slideIndex + 1}번

현재 슬라이드 내용:
${JSON.stringify(currentSlide, null, 2)}

${userInstruction ? `사용자 지시사항: ${userInstruction}` : '더 좋은 내용으로 전면 재작성해주세요.'}

파일 원본 데이터 (참고):
${JSON.stringify(fileData, null, 2)}

아래 JSON 형식으로 슬라이드 1개만 반환하세요:
{
  "slideNumber": ${slideIndex + 1},
  "title": "슬라이드 제목",
  "type": "title|data|chart|action|summary",
  "content": ["내용 항목들"],
  "notes": "발표자 노트",
  "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up|down|flat"}]
}`;

  const data = await callAI(prompt, apiKey);
  const content = data.choices?.[0]?.message?.content || "";

  let slide;
  try {
    const match = content.match(/\{[\s\S]*\}/);
    slide = match ? JSON.parse(match[0]) : null;
  } catch {
    slide = null;
  }

  return new Response(JSON.stringify({ slide }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── 4. 채팅형 슬라이드 수정 ──
async function handleChatEdit(body: any, apiKey: string) {
  const { userMessage, currentSlide, slideIndex, presentation } = body;

  const prompt = `당신은 발표 자료 편집 전문가입니다.
사용자의 요청에 따라 슬라이드를 수정해주세요.

전체 발표: ${presentation?.title || ''}
현재 슬라이드 (${slideIndex + 1}번):
${JSON.stringify(currentSlide, null, 2)}

사용자 요청: "${userMessage}"

요청을 정확히 반영하여 슬라이드를 수정하고, 아래 JSON 형식으로 수정된 슬라이드만 반환하세요:
{
  "slideNumber": ${slideIndex + 1},
  "title": "슬라이드 제목",
  "type": "title|data|chart|action|summary",
  "content": ["내용 항목들"],
  "notes": "발표자 노트",
  "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up|down|flat"}]
}

수정 후 어떤 변경을 했는지 "summary" 필드에 한 줄로 설명을 추가하세요:
{
  "slide": { ... },
  "summary": "변경 내용 한 줄 요약"
}`;

  const data = await callAI(prompt, apiKey);
  const content = data.choices?.[0]?.message?.content || "";

  let result;
  try {
    const match = content.match(/\{[\s\S]*\}/);
    result = match ? JSON.parse(match[0]) : null;
  } catch {
    result = null;
  }

  return new Response(JSON.stringify({ result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── 공통 AI 호출 ──
async function callAI(prompt: string, apiKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
    if (response.status === 402) throw new Error("크레딧이 부족합니다.");
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    throw new Error("AI 생성 오류가 발생했습니다.");
  }

  return response.json();
}
