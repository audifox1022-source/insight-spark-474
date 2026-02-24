import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

const STORYTELLING_PERSONA = `## 페르소나
당신은 두 가지 전문성을 결합한 1티어 프레젠테이션 컨설턴트입니다:
1. TED 강연자들의 발표 자료를 디자인한 **프레젠테이션 디자인 전문가**
2. 차트를 통해 인사이트를 오해 없이 직관적으로 전달하는 **데이터 스토리텔링 전문가**

## 💡 무결점 품질 관리 (Zero-Defect Quality Control) - 최우선 지침
당신이 생성하는 초기 결과물은 추가적인 리뷰나 수정이 필요 없는 완벽한 상태여야 합니다. 다음을 엄격하게 준수하세요:
1. [가독성 극대화] 문장은 최대한 간결한 개조식(단문)으로 작성하고, 불필요한 수식어나 장황한 서술을 완벽히 제거하세요.
2. [데이터 누락 방지] 업로드된 파일 내의 핵심 수치, 통계, 날짜, 중요한 팩트는 절대 누락하지 말고 본문이나 keyMetrics에 반드시 포함하세요.
3. [완벽한 논리 구조] 각 슬라이드의 제목만 차례대로 읽어도 발표의 기승전결이 완벽히 이해되도록 논리적 비약 없이 구성하세요.
4. [차트 디테일 완성] 차트가 들어갈 경우, 제목은 단순 명사가 아닌 "핵심 인사이트(결론)" 형태로 적고, X축/Y축 레이블에는 반드시 '(단위)'를 명시하세요.

## 핵심 원칙
- **스토리텔링 구조**: 도입(배경/문제) → 전개(데이터/분석) → 위기/전환(인사이트) → 결론(해결책/CTA) 구조를 유지합니다.
- **한 슬라이드, 한 메시지**: 각 슬라이드는 오직 하나의 핵심 메시지만 전달합니다.
- **시각적 임팩트**: 데이터는 반드시 차트나 핵심 지표로 시각화하고, 텍스트는 최소화합니다.
- **감정적 연결**: "왜 이것이 중요한가?"라는 맥락을 항상 포함합니다.

## 데이터 시각화 원칙
- **최적 차트 선택**:
  - 시간에 따른 변화 → line 또는 area
  - 항목 간 크기 비교 → bar
  - 전체 대비 비율/구성 → pie
- **데이터 스토리라인**: 현황(As-Is) → 문제 발견 → 원인 분석 → 해결 방안 → 기대 효과 순서로 차트를 배치하세요.

## 톤앤스타일
명확함, 분석적, 전문적. AI가 생성한 느낌을 철저히 배제하고, 현업 최고 실무자가 직접 작성한 것 같은 자연스럽고 세련된 문체.`;

// 여러 파일을 수용할 수 있도록 한도 대폭 증가 (300,000자)
const MAX_FILE_DATA_LENGTH = 300000;
// 다중 파일 업로드 용량을 수용하도록 4MB 로 증가
const MAX_BODY_SIZE = 4_000_000; 
const AI_TIMEOUT_MS = 120_000;

// ── Input validation schemas ──
const MeetingInfoSchema = z.object({
  week: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  reporter: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
}).optional();

const SettingsSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard", "executive"]).optional(),
  volume: z.enum(["brief", "standard", "detailed", "comprehensive"]).optional(),
}).optional();

const RequestSchema = z.object({
  mode: z.enum(["outline", "generate", "regenerate_slide", "chat_edit", "review", "review_and_fix", "generate_image", "search_images", "analyze_template"]),
  fileData: z.any().optional(),
  meetingInfo: MeetingInfoSchema,
  settings: SettingsSchema,
  template: z.string().max(50).optional(),
  approvedOutline: z.any().optional(),
  slideIndex: z.number().int().min(0).max(100).optional(),
  currentSlide: z.any().optional(),
  presentation: z.any().optional(),
  userInstruction: z.string().max(3000).optional(),
  userMessage: z.string().max(3000).optional(),
  query: z.string().max(200).optional(),
  page: z.number().int().min(1).max(100).optional(),
  perPage: z.number().int().min(1).max(50).optional(),
  customPrompt: z.string().max(1000).optional(),
  slideTitle: z.string().max(500).optional(),
  slideContent: z.array(z.string().max(500)).max(20).optional(),
  slideType: z.string().max(50).optional(),
  templateData: z.string().optional(),
});

// Safe error messages that can be shown to users
const SAFE_ERROR_MESSAGES = new Set([
  "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  "크레딧이 부족합니다.",
  "AI가 올바른 JSON 형식으로 응답하지 않았습니다. 다시 시도해주세요.",
  "AI가 올바른 구성안 구조를 생성하지 못했습니다. 다시 시도해주세요.",
  "AI가 올바른 슬라이드 구조를 생성하지 못했습니다. 다시 시도해주세요.",
  "슬라이드 JSON을 파싱할 수 없습니다. 다시 시도해주세요.",
  "AI 수정 결과를 파싱할 수 없습니다. 다시 시도해주세요.",
  "리뷰 결과를 파싱할 수 없습니다. 다시 시도해주세요.",
  "최적화 결과를 파싱할 수 없습니다. 다시 시도해주세요.",
  "이미지를 생성하지 못했습니다. 다시 시도해주세요.",
  "이미지 업로드에 실패했습니다.",
  "검색어가 필요합니다.",
  "템플릿 데이터가 필요합니다.",
  "템플릿 분석 결과를 파싱하지 못했습니다.",
  "발표자료가 없습니다.",
  "AI 응답 시간이 초과되었습니다. 파일 크기를 줄이거나 다시 시도해주세요.",
  "요청 데이터가 너무 큽니다.",
  "잘못된 요청 형식입니다.",
]);

function sanitizeErrorMessage(e: unknown): string {
  if (e instanceof z.ZodError) {
    return "잘못된 요청 형식입니다.";
  }
  if (e instanceof Error && SAFE_ERROR_MESSAGES.has(e.message)) {
    return e.message;
  }
  return "처리 중 오류가 발생했습니다. 다시 시도해주세요.";
}

// 여러 파일일 경우 각 파일별로 용량을 공평하게 분배하여 잘라냄
function truncateFileData(fileData: any): string {
  if (!fileData) return "";

  // 배열(여러 파일)로 들어온 경우
  if (Array.isArray(fileData) && fileData.length > 0) {
    const limitPerFile = Math.floor(MAX_FILE_DATA_LENGTH / fileData.length);
    
    const processedFiles = fileData.map((file, index) => {
      const fileName = file.fileName || `문서_${index + 1}`;
      const fileStr = typeof file === 'object' ? JSON.stringify(file, null, 2) : String(file);
      
      if (fileStr.length > limitPerFile) {
        return `\n--- [업로드 파일: ${fileName}] 시작 ---\n${fileStr.slice(0, limitPerFile)}\n... (이 파일의 데이터가 너무 길어 뒷부분 생략됨)\n--- [업로드 파일: ${fileName}] 끝 ---\n`;
      }
      return `\n--- [업로드 파일: ${fileName}] 시작 ---\n${fileStr}\n--- [업로드 파일: ${fileName}] 끝 ---\n`;
    });
    
    return processedFiles.join("\n");
  }

  // 단일 객체/문자열일 경우 기존 로직 적용
  const raw = typeof fileData === 'object' ? JSON.stringify(fileData, null, 2) : String(fileData);
  if (raw.length <= MAX_FILE_DATA_LENGTH) return raw;
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
        "title": "차트 제목 (반드시 핵심 인사이트를 포함할 것)",
        "data": [{"name": "항목명", "value": 숫자, "value2": 선택적_비교숫자}],
        "xAxisLabel": "X축 레이블 (반드시 괄호 안에 단위 표기)",
        "yAxisLabel": "Y축 레이블 (반드시 괄호 안에 단위 표기)",
        "series1Label": "계열1 이름",
        "series2Label": "계열2 이름 (value2 사용 시)",
        "showLegend": true
      }`;

const CHART_INSTRUCTION = `
중요 - 데이터 시각화 규칙:
파일 데이터에 수치/통계 데이터가 포함되어 있으면 반드시 적절한 차트를 포함한 슬라이드(type: "chart")를 생성하세요.

차트 유형 선택 기준 (데이터 종류 + 전달 메시지에 따라):
- 시계열 데이터(월별, 주별, 연도별 변화 추이) → line 또는 area 차트
- 카테고리별 크기 비교 → bar 차트
- 전체 대비 비율/구성 → pie 차트
- 동일 항목의 두 기간/지표 비교 → bar 차트 + value2 활용

차트 품질 기준 (리뷰 지적 방지):
- chartData의 title은 단순 제목이 아닌 핵심 인사이트를 담을 것 (예: "월별 생산량" → "3분기 이후 생산량 15% 회복세")
- xAxisLabel, yAxisLabel에 단위를 반드시 포함 (예: "생산량(톤)", "기간(월)")
- data 배열에는 실제 파일 데이터에서 추출한 정확한 수치를 사용하세요
- 범례(showLegend)는 2개 이상 계열이 있을 때만 true로 설정
- chartData는 type이 "chart"인 슬라이드에만 포함하세요
- 각 차트 슬라이드의 content에는 "이 데이터가 의미하는 것"에 대한 인사이트를 반드시 포함`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Authentication ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "인증이 필요합니다. 로그인해주세요." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "인증이 만료되었습니다. 다시 로그인해주세요." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Input validation ──
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_SIZE) {
      throw new Error("요청 데이터가 너무 큽니다.");
    }

    const parsed = JSON.parse(rawBody);
    const body = RequestSchema.parse(parsed);
    const { mode } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("처리 중 오류가 발생했습니다. 다시 시도해주세요.");

    if (mode === "outline") return await handleOutline(body, LOVABLE_API_KEY);
    else if (mode === "regenerate_slide") return await handleRegenerateSlide(body, LOVABLE_API_KEY);
    else if (mode === "chat_edit") return await handleChatEdit(body, LOVABLE_API_KEY);
    else if (mode === "review") return await handleReview(body, LOVABLE_API_KEY);
    else if (mode === "review_and_fix") return await handleReviewAndFix(body, LOVABLE_API_KEY);
    else if (mode === "generate_image") return await handleGenerateImage(body, LOVABLE_API_KEY);
    else if (mode === "search_images") return await handleSearchImages(body);
    else if (mode === "analyze_template") return await handleAnalyzeTemplate(body, LOVABLE_API_KEY);
    else return await handleGenerate(body, LOVABLE_API_KEY);
  } catch (e) {
    const safeMessage = sanitizeErrorMessage(e);
    const status = e instanceof z.ZodError ? 400 : 500;
    return new Response(JSON.stringify({ error: safeMessage }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── 1. 구성안(목차) 미리보기 생성 ──
async function handleOutline(body: any, apiKey: string) {
  const { fileData, meetingInfo, settings, template } = body;
  const difficulty = settings?.difficulty || "medium";
  const volume = settings?.volume || "standard";
  const fileDataStr = truncateFileData(fileData);

  const prompt = `${STORYTELLING_PERSONA}

당신은 발표 자료 구성 전문가입니다.
업로드된 모든 파일 데이터를 종합적으로 분석하여 발표 자료의 목차(구성안)를 제안해주세요. 여러 개의 파일이 업로드되었다면 모든 파일의 내용을 빠짐없이 통합해서 반영해야 합니다.
스토리텔링 구조(도입→전개→전환→결론)를 반영하여 청중이 몰입할 수 있는 흐름을 만들어주세요.

회의 정보:
- 발표 주제: ${meetingInfo?.week || '미입력'}
- 부서: ${meetingInfo?.department || '미입력'}
- 발표자: ${meetingInfo?.reporter || '미입력'}
- 추가 지시사항: ${meetingInfo?.notes || '없음'}

설정:
- 난이도: ${DIFFICULTY_MAP[difficulty]}
- 분량: ${VOLUME_MAP[volume]}
- 템플릿: ${TEMPLATE_MAP[template] || TEMPLATE_MAP.auto}

업로드된 전체 파일 데이터:
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

  const outline = extractJSON(content);
  if (!outline) {
    throw new Error("AI가 올바른 JSON 형식으로 응답하지 않았습니다. 다시 시도해주세요.");
  }
  if (!outline.title || !Array.isArray(outline.outline) || outline.outline.length === 0) {
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

  const systemPrompt = `${STORYTELLING_PERSONA}

핵심 작성 원칙:
- AI가 생성한 느낌이 전혀 나지 않는, 현장 관리자가 직접 작성한 것 같은 자연스러운 문체
- 여러 개의 파일이 제공된 경우, 특정 파일 하나에만 치우치지 말고 모든 파일의 데이터를 통합하여 전체적인 맥락을 구성하세요.
- 구체적 데이터와 수치를 활용한 근거 기반 보고
- 실행 가능한 개선 방안과 인사이트 제시
- 간결하고 핵심적인 내용 구성
- 스토리텔링 흐름: 도입(왜 중요한가) → 전개(현황/데이터) → 전환(인사이트/시사점) → 결론(행동 촉구)
- 💡[중요] 완벽한 초기 품질: 리뷰 단계에서 지적될 만한 가독성 저하, 데이터 누락, 논리 비약, 차트 레이블 누락을 처음부터 100% 완벽하게 차단하세요.

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

업로드된 전체 파일 데이터:
${fileDataStr}

위 데이터를 종합적으로 분석하여 발표 자료를 생성해주세요. 여러 개의 파일이 있다면 모두 완벽히 융합하여 반영해야 합니다. 수치 데이터가 있으면 반드시 차트 슬라이드를 포함하세요.`;

  const data = await callAI(`${systemPrompt}\n\n${userPrompt}`, apiKey);
  const content = data.choices?.[0]?.message?.content || "";

  const presentation = extractJSON(content);
  if (!presentation) {
    throw new Error("AI가 올바른 JSON 형식으로 응답하지 않았습니다. 다시 시도해주세요.");
  }
  if (!presentation.title || !Array.isArray(presentation.slides) || presentation.slides.length === 0) {
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

  const prompt = `${STORYTELLING_PERSONA}

아래 슬라이드를 개선하거나 다시 작성해주세요.
전체 발표의 스토리라인에서 이 슬라이드의 역할을 고려하여 더 임팩트 있게 작성하세요.

전체 발표 제목: ${presentation?.title || ''}
전체 슬라이드 수: ${presentation?.slides?.length || 0}장
현재 슬라이드 번호: ${slideIndex + 1}번

현재 슬라이드 내용:
${JSON.stringify(currentSlide, null, 2)}

${userInstruction ? `사용자 지시사항: ${userInstruction}` : '더 좋은 내용으로 전면 재작성해주세요.'}

업로드된 전체 파일 원본 데이터 (참고):
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
    throw new Error("슬라이드 JSON을 파싱할 수 없습니다. 다시 시도해주세요.");
  }

  return new Response(JSON.stringify({ slide }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── 4. 채팅형 슬라이드 수정 ──
async function handleChatEdit(body: any, apiKey: string) {
  const { userMessage, currentSlide, slideIndex, presentation } = body;

  const prompt = `${STORYTELLING_PERSONA}

사용자의 요청에 따라 슬라이드를 수정해주세요.
수정 시에도 전체 스토리라인의 흐름과 해당 슬라이드의 역할을 유지하세요.

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

  const prompt = `${STORYTELLING_PERSONA}

당신은 기업 발표자료 품질 검토 전문가이자 데이터 시각화 검토 전문가입니다.
아래 발표자료의 스토리텔링 구조, 가독성, 완성도, 논리적 흐름, 그리고 데이터 시각화 품질을 검토하고 구체적인 개선 제안을 해주세요.

특히 차트가 포함된 슬라이드는 다음을 중점 검토하세요:
- 차트 유형이 데이터 종류와 전달 메시지에 적합한가?
- 차트 제목이 단순 설명이 아닌 핵심 인사이트를 담고 있는가?
- 축 레이블에 단위가 포함되어 있는가?
- 데이터의 스토리라인 순서가 설득력 있는가? (현황 → 문제 → 원인 → 해결)

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
      "category": "readability|content|structure|visual|data|chart",
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
- data: 데이터 정확성 (수치 검증, 트렌드 일관성)
- chart: 차트 최적화 (차트 유형 적합성, 제목의 인사이트 포함 여부, 축 레이블 명확성, 범례 활용)`;

  const data = await callAI(prompt, apiKey);
  const content = data.choices?.[0]?.message?.content || "";

  const review = extractJSON(content);
  if (!review) {
    throw new Error("리뷰 결과를 파싱할 수 없습니다. 다시 시도해주세요.");
  }

  return new Response(JSON.stringify({ review }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── 5-1. 전체 발표자료 자동 최적화 ──
async function handleReviewAndFix(body: any, apiKey: string) {
  const { presentation } = body;
  if (!presentation || !presentation.slides) throw new Error("발표자료가 없습니다.");

  const prompt = `${STORYTELLING_PERSONA}

당신은 최고 수준의 프레젠테이션 컨설턴트입니다.
아래 전체 발표 자료를 분석하고, 스토리텔링의 흐름, 문장의 명확성, 핵심 지표의 강조 등을 최적화하여 전체 내용을 직접 개선해주세요.

현재 전체 발표 자료:
${JSON.stringify(presentation, null, 2)}

요구사항:
1. 전체적인 맥락과 스토리 흐름을 매끄럽게 다듬으세요.
2. 어색한 문장이나 너무 긴 문장을 간결하고 임팩트 있게 수정하세요.
3. 슬라이드의 일관성을 유지하며 내용의 배치를 개선하세요.
${CHART_INSTRUCTION}

아래 JSON 형식으로 개선된 전체 발표 자료와 어떤 부분을 수정했는지 요약을 반환하세요. JSON 외의 텍스트는 포함하지 마세요:
{
  "summary": "어떤 부분을 집중적으로 개선했는지 1~2줄로 요약",
  "presentation": {
    "title": "전체 발표 제목 (필요시 개선)",
    "slides": [
      {
        "slideNumber": 1,
        "title": "슬라이드 제목",
        "type": "title|data|chart|action|summary",
        "content": ["개선된 내용 항목들"],
        "notes": "개선된 발표자 노트",
        "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up|down|flat"}],
        ${CHART_DATA_SCHEMA}
      }
    ]
  }
}`;

  const data = await callAI(prompt, apiKey);
  const content = data.choices?.[0]?.message?.content || "";

  const result = extractJSON(content);
  if (!result) {
    throw new Error("최적화 결과를 파싱할 수 없습니다. 다시 시도해주세요.");
  }

  return new Response(JSON.stringify({ result }), {
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
    await response.text();
    throw new Error("이미지를 생성하지 못했습니다. 다시 시도해주세요.");
  }

  const data = await response.json();
  const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!imageData) {
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
    throw new Error("이미지 업로드에 실패했습니다.");
  }

  const { data: publicUrlData } = supabase.storage.from("slide-images").getPublicUrl(fileName);
  const imageUrl = publicUrlData.publicUrl;

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
      await response.text();
      throw new Error("처리 중 오류가 발생했습니다. 다시 시도해주세요.");
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
  if (!UNSPLASH_ACCESS_KEY) throw new Error("처리 중 오류가 발생했습니다. 다시 시도해주세요.");

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  });

  if (!res.ok) {
    throw new Error("이미지 검색 중 오류가 발생했습니다.");
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
    throw new Error("템플릿 분석 중 오류가 발생했습니다.");
  }

  const aiData = await res.json();
  const text = aiData.choices?.[0]?.message?.content || "";
  const parsed = extractJSON(text);

  if (!parsed) throw new Error("템플릿 분석 결과를 파싱하지 못했습니다.");

  return new Response(JSON.stringify({ template: parsed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
