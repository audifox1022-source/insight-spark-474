import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const MAX_FILE_DATA_LENGTH = 12000;
const AI_TIMEOUT_MS = 120_000;

function truncateFileData(fileData: any): string {
  const raw = JSON.stringify(fileData, null, 2);
  if (raw.length <= MAX_FILE_DATA_LENGTH) return raw;
  console.warn(`File data truncated: ${raw.length} → ${MAX_FILE_DATA_LENGTH} chars`);
  return raw.slice(0, MAX_FILE_DATA_LENGTH) + "\n... (데이터가 너무 길어 일부 생략됨)";
}

function extractJSON(text: string): any | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* fall through */ }
  }
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { start = -1; }
      }
    }
  }
  return null;
}

const CHART_DATA_SCHEMA = `"chartData": {
        "chartType": "bar|line|pie|area",
        "title": "차트 제목",
        "data": [{"name": "항목명", "value": 숫자, "value2": 선택적_비교숫자}],
        "xAxisLabel": "X축 레이블",
        "yAxisLabel": "Y축 레이블",
        "series1Label": "계열1 이름",
        "series2Label": "계열2 이름 (value2 사용 시)",
        "showLegend": true
      }`;

const CHART_INSTRUCTION = `
중요 - 차트 자동 삽입 규칙:
파일 데이터에 수치/통계 데이터가 포함되어 있으면 반드시 적절한 차트를 포함한 슬라이드(type: "chart")를 생성하세요.
- 시계열 데이터(월별, 주별, 연도별 등) → line 또는 area 차트
- 카테고리별 비교 데이터 → bar 차트  
- 비율/구성 데이터 → pie 차트
- chartData의 data 배열에는 실제 파일 데이터에서 추출한 정확한 수치를 사용하세요.
- chartData는 type이 "chart"인 슬라이드에만 포함하세요.
- 수치 데이터가 충분하면 2개 이상의 차트 슬라이드도 가능합니다.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log(`[generate-presentation] mode=${mode}`);

    if (mode === "outline") return await handleOutline(body, LOVABLE_API_KEY);
    else if (mode === "regenerate_slide") return await handleRegenerateSlide(body, LOVABLE_API_KEY);
    else if (mode === "chat_edit") return await handleChatEdit(body, LOVABLE_API_KEY);
    else if (mode === "review") return await handleReview(body, LOVABLE_API_KEY);
    else if (mode === "generate_image") return await handleGenerateImage(body, LOVABLE_API_KEY);
    else if (mode === "search_images") return await handleSearchImages(body);
    else if (mode === "analyze_template") return await handleAnalyzeTemplate(body, LOVABLE_API_KEY);
    else return await handleGenerate(body, LOVABLE_API_KEY);
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
  const fileDataStr = truncateFileData(fileData);

  const prompt = `당신은 발표 자료 구성 전문가입니다.
업로드된 파일 데이터를 분석하여 발표 자료의 목차(구성안)를 먼저 제안해주세요.

회의 정보:
- 발표 주제: ${meetingInfo?.week || '미입력'}
- 부서: ${meetingInfo?.department || '미입력'}
- 발표자: ${meetingInfo?.reporter || '미입력'}
- 추가 지시사항: ${meetingInfo?.notes || '없음'}

설정:
- 난이도: ${DIFFICULTY_MAP[difficulty]}
- 분량: ${VOLUME_MAP[volume]}
- 템플릿: ${TEMPLATE_MAP[template] || TEMPLATE_MAP.auto}

파일 데이터:
${fileDataStr}
${CHART_INSTRUCTION}

아래 JSON 형식으로 목차만 생성하세요. JSON 외의 텍스트는 포함하지 마세요:
{
  "title": "전체 발표 제목",
  "outline": [
    {
      "slideNumber": 1,
      "title": "슬라이드 제목",
      "type": "title|data|chart|action|summary",
      "description": "이 슬라이드에서 다룰 내용 한 줄 요약 (chart 타입이면 어떤 데이터를 어떤 차트로 시각화할지 설명)"
    }
  ]
}`;

  const data = await callAI(prompt, apiKey);
  const content = data.choices?.[0]?.message?.content || "";
  console.log(`[outline] AI response length: ${content.length}`);

  const outline = extractJSON(content);
  if (!outline) {
    console.error("[outline] Failed to parse JSON from AI response:", content.slice(0, 500));
    throw new Error("AI가 올바른 JSON 형식으로 응답하지 않았습니다. 다시 시도해주세요.");
  }
  if (!outline.title || !Array.isArray(outline.outline) || outline.outline.length === 0) {
    console.error("[outline] Invalid outline structure:", JSON.stringify(outline).slice(0, 500));
    throw new Error("AI가 올바른 구성안 구조를 생성하지 못했습니다. 다시 시도해주세요.");
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
  const fileDataStr = truncateFileData(fileData);

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
${CHART_INSTRUCTION}

반드시 아래 JSON 형식으로만 생성하세요. JSON 외의 텍스트는 포함하지 마세요:
{
  "title": "전체 발표 제목",
  "slides": [
    {
      "slideNumber": 1,
      "title": "슬라이드 제목",
      "type": "title|data|chart|action|summary",
      "content": ["핵심 내용 항목들"],
      "notes": "발표자 노트",
      "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up|down|flat"}],
      ${CHART_DATA_SCHEMA}
    }
  ]
}

참고: chartData는 type이 "chart"인 슬라이드에만 포함하세요.`;

  const userPrompt = `회의 정보:
- 발표 주제: ${meetingInfo?.week || '미입력'}
- 부서: ${meetingInfo?.department || '미입력'}
- 발표자: ${meetingInfo?.reporter || '미입력'}
- 추가 지시사항: ${meetingInfo?.notes || '없음'}

파일 데이터:
${fileDataStr}

위 데이터를 분석하여 발표 자료를 생성해주세요. 수치 데이터가 있으면 반드시 차트 슬라이드를 포함하세요.`;

  const data = await callAI(`${systemPrompt}\n\n${userPrompt}`, apiKey);
  const content = data.choices?.[0]?.message?.content || "";
  console.log(`[generate] AI response length: ${content.length}`);

  const presentation = extractJSON(content);
  if (!presentation) {
    console.error("[generate] Failed to parse JSON:", content.slice(0, 500));
    throw new Error("AI가 올바른 JSON 형식으로 응답하지 않았습니다. 다시 시도해주세요.");
  }
  if (!presentation.title || !Array.isArray(presentation.slides) || presentation.slides.length === 0) {
    console.error("[generate] Invalid presentation structure:", JSON.stringify(presentation).slice(0, 500));
    throw new Error("AI가 올바른 슬라이드 구조를 생성하지 못했습니다. 다시 시도해주세요.");
  }

  return new Response(JSON.stringify({ presentation, rawContent: content }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── 3. 특정 슬라이드만 재생성 ──
async function handleRegenerateSlide(body: any, apiKey: string) {
  const { slideIndex, currentSlide, presentation, fileData, meetingInfo, settings, userInstruction } = body;
  const fileDataStr = truncateFileData(fileData);

  const prompt = `당신은 전문 발표 자료 작성 전문가입니다.
아래 슬라이드를 개선하거나 다시 작성해주세요.

전체 발표 제목: ${presentation?.title || ''}
전체 슬라이드 수: ${presentation?.slides?.length || 0}장
현재 슬라이드 번호: ${slideIndex + 1}번

현재 슬라이드 내용:
${JSON.stringify(currentSlide, null, 2)}

${userInstruction ? `사용자 지시사항: ${userInstruction}` : '더 좋은 내용으로 전면 재작성해주세요.'}

파일 원본 데이터 (참고):
${fileDataStr}

수치 데이터가 있고 시각화가 적절하다면 chartData도 포함하세요.

아래 JSON 형식으로 슬라이드 1개만 반환하세요. JSON 외의 텍스트는 포함하지 마세요:
{
  "slideNumber": ${slideIndex + 1},
  "title": "슬라이드 제목",
  "type": "title|data|chart|action|summary",
  "content": ["내용 항목들"],
  "notes": "발표자 노트",
  "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up|down|flat"}],
  ${CHART_DATA_SCHEMA}
}`;

  const data = await callAI(prompt, apiKey);
  const content = data.choices?.[0]?.message?.content || "";

  const slide = extractJSON(content);
  if (!slide) {
    console.error("[regenerate] Failed to parse JSON:", content.slice(0, 500));
    throw new Error("슬라이드 JSON을 파싱할 수 없습니다. 다시 시도해주세요.");
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

요청을 정확히 반영하여 슬라이드를 수정하고, 아래 JSON 형식으로만 반환하세요. JSON 외의 텍스트는 포함하지 마세요:
{
  "slide": {
    "slideNumber": ${slideIndex + 1},
    "title": "슬라이드 제목",
    "type": "title|data|chart|action|summary",
    "content": ["내용 항목들"],
    "notes": "발표자 노트",
    "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up|down|flat"}],
    ${CHART_DATA_SCHEMA}
  },
  "summary": "변경 내용 한 줄 요약"
}`;

  const data = await callAI(prompt, apiKey);
  const content = data.choices?.[0]?.message?.content || "";

  const result = extractJSON(content);
  if (!result) {
    console.error("[chat_edit] Failed to parse JSON:", content.slice(0, 500));
    throw new Error("AI 수정 결과를 파싱할 수 없습니다. 다시 시도해주세요.");
  }

  return new Response(JSON.stringify({ result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── 5. 발표자료 리뷰 (가독성 검토 및 보완점 제안) ──
async function handleReview(body: any, apiKey: string) {
  const { presentation } = body;
  if (!presentation || !presentation.slides) throw new Error("발표자료가 없습니다.");

  const slideSummary = presentation.slides.map((s: any, i: number) =>
    `[${i + 1}번 - ${s.type}] ${s.title}\n내용: ${(s.content || []).join(' / ')}\n지표: ${(s.keyMetrics || []).map((m: any) => `${m.label}:${m.value}`).join(', ') || '없음'}\n차트: ${s.chartData ? s.chartData.chartType : '없음'}`
  ).join('\n\n');

  const prompt = `당신은 기업 발표자료 품질 검토 전문가입니다.
아래 발표자료를 분석하여 가독성, 완성도, 논리적 흐름을 검토하고 구체적인 개선 제안을 해주세요.

발표 제목: ${presentation.title}
총 슬라이드: ${presentation.slides.length}장

슬라이드 내용:
${slideSummary}

아래 JSON 형식으로만 반환하세요. JSON 외의 텍스트는 포함하지 마세요:
{
  "overallScore": 1~10 사이의 숫자,
  "summary": "전체적인 평가 한 줄 요약",
  "strengths": ["잘된 점 1", "잘된 점 2"],
  "improvements": [
    {
      "slideIndex": 0,
      "category": "readability|content|structure|visual|data",
      "severity": "high|medium|low",
      "issue": "문제점 설명",
      "suggestion": "구체적 개선 방법"
    }
  ],
  "generalTips": ["전반적인 개선 제안 1", "전반적인 개선 제안 2"]
}

카테고리 설명:
- readability: 가독성 (글자 수, 문장 길이, 전문 용어 등)
- content: 내용 충실도 (데이터 누락, 근거 부족 등)
- structure: 구조/흐름 (슬라이드 순서, 논리적 연결)
- visual: 시각적 요소 (차트 활용, 지표 표시)
- data: 데이터 정확성 (수치 검증, 트렌드 일관성)`;

  const data = await callAI(prompt, apiKey);
  const content = data.choices?.[0]?.message?.content || "";
  console.log(`[review] AI response length: ${content.length}`);

  const review = extractJSON(content);
  if (!review) {
    console.error("[review] Failed to parse JSON:", content.slice(0, 500));
    throw new Error("리뷰 결과를 파싱할 수 없습니다. 다시 시도해주세요.");
  }

  return new Response(JSON.stringify({ review }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── 6. 슬라이드 이미지 생성 ──
async function handleGenerateImage(body: any, apiKey: string) {
  const { slideTitle, slideContent, slideType, customPrompt } = body;

  const imagePrompt = customPrompt || `Create a professional, clean, minimalist business presentation background image for a slide about: "${slideTitle}". 
Context: ${(slideContent || []).slice(0, 2).join('. ')}
Slide type: ${slideType}
Style: Corporate, modern, subtle gradient or abstract geometric shapes. No text. Suitable as a background or accent image for a presentation slide. 16:9 aspect ratio. High quality.`;

  console.log(`[generate_image] Generating image for: ${slideTitle}`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: imagePrompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
    if (response.status === 402) throw new Error("크레딧이 부족합니다.");
    const t = await response.text();
    console.error("Image generation error:", response.status, t);
    throw new Error(`이미지 생성 오류 (${response.status})`);
  }

  const data = await response.json();
  const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!imageData) {
    console.error("[generate_image] No image in response");
    throw new Error("이미지를 생성하지 못했습니다. 다시 시도해주세요.");
  }

  // Upload to Supabase storage
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
  const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const fileName = `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

  const { error: uploadError } = await supabase.storage
    .from("slide-images")
    .upload(fileName, binaryData, { contentType: "image/png", upsert: true });

  if (uploadError) {
    console.error("[generate_image] Upload error:", uploadError);
    throw new Error("이미지 업로드에 실패했습니다.");
  }

  const { data: publicUrlData } = supabase.storage.from("slide-images").getPublicUrl(fileName);
  const imageUrl = publicUrlData.publicUrl;

  console.log(`[generate_image] Image uploaded: ${imageUrl}`);

  return new Response(JSON.stringify({ imageUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── 공통 AI 호출 (타임아웃 포함) ──
async function callAI(prompt: string, apiKey: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
      if (response.status === 402) throw new Error("크레딧이 부족합니다.");
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI 생성 오류 (${response.status})`);
    }

    return response.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("AI 응답 시간이 초과되었습니다. 파일 크기를 줄이거나 다시 시도해주세요.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── 7. Unsplash 이미지 검색 ──
async function handleSearchImages(body: any) {
  const { query, page = 1, perPage = 12 } = body;
  if (!query) throw new Error("검색어가 필요합니다.");

  const UNSPLASH_ACCESS_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (!UNSPLASH_ACCESS_KEY) throw new Error("UNSPLASH_ACCESS_KEY is not configured");

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Unsplash API error [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  
  const images = data.results.map((img: any) => ({
    id: img.id,
    url: img.urls.regular,
    thumbUrl: img.urls.small,
    altDescription: img.alt_description || img.description || '',
    photographer: img.user.name,
    photographerUrl: img.user.links.html,
    downloadUrl: img.links.download_location,
  }));

  return new Response(JSON.stringify({ images, totalPages: data.total_pages, total: data.total }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── 8. PPT 템플릿 분석 (색상/폰트 추출) ──
async function handleAnalyzeTemplate(body: any, apiKey: string) {
  const { templateData } = body; // base64 encoded PPT screenshot or content description
  if (!templateData) throw new Error("템플릿 데이터가 필요합니다.");

  const res = await fetch("https://ai.lovable.dev/api/chat", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `다음은 PPT 발표자료 템플릿의 스크린샷 또는 설명입니다.
이 템플릿에서 브랜드 스타일 요소를 분석해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "primaryColor": "#hex코드 (메인 색상, 헤더/제목에 사용되는 색상)",
  "accentColor": "#hex코드 (강조 색상, 포인트/버튼에 사용되는 색상)",
  "backgroundColor": "#hex코드 (배경 색상)",
  "textColor": "#hex코드 (본문 텍스트 색상)",
  "fontStyle": "고딕|명조|둥근|모던|클래식 중 하나",
  "layoutStyle": "미니멀|기업|크리에이티브|데이터중심 중 하나",
  "description": "이 템플릿 스타일에 대한 한 줄 설명"
}`,
            },
            ...(templateData.startsWith("data:")
              ? [{ type: "image_url" as const, image_url: { url: templateData } }]
              : [{ type: "text" as const, text: `템플릿 내용:\n${templateData}` }]),
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI 호출 실패 [${res.status}]: ${errText}`);
  }

  const aiData = await res.json();
  const text = aiData.choices?.[0]?.message?.content || "";
  const parsed = extractJSON(text);

  if (!parsed) throw new Error("템플릿 분석 결과를 파싱하지 못했습니다.");

  return new Response(JSON.stringify({ template: parsed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
