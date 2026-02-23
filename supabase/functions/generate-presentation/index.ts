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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileData, meetingInfo, settings } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const difficulty = settings?.difficulty || "medium";
    const volume = settings?.volume || "standard";

    const systemPrompt = `당신은 대한민국 대기업 제조업 단조사업부의 주간 회의를 위한 발표 자료 작성 전문가입니다.

핵심 원칙:
- AI가 생성한 느낌이 전혀 나지 않는, 현장 관리자가 직접 작성한 것 같은 자연스러운 문체
- 구체적 데이터와 수치를 활용한 근거 기반 보고
- 실행 가능한 개선 방안과 인사이트 제시
- 간결하고 핵심적인 내용 구성

📊 난이도 설정: ${DIFFICULTY_MAP[difficulty] || DIFFICULTY_MAP.medium}
📄 분량 설정: ${VOLUME_MAP[volume] || VOLUME_MAP.standard}

업로드된 파일이 다양한 형식(엑셀, PDF, Word, 텍스트, 이미지 등)일 수 있습니다.
모든 데이터를 종합적으로 분석하여 발표 자료를 구성하세요.

반드시 아래 JSON 형식으로 슬라이드를 생성하세요:
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
- 회의 주차: ${meetingInfo.week || '미입력'}
- 보고 부서: ${meetingInfo.department || '단조사업부 생산부문'}
- 보고자: ${meetingInfo.reporter || '미입력'}
- 특이사항: ${meetingInfo.notes || '없음'}

업로드된 파일 데이터:
${JSON.stringify(fileData, null, 2)}

위 데이터를 분석하여 발표 자료를 생성해주세요. 난이도와 분량 설정에 맞게 작성해주세요.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "크레딧이 부족합니다." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 생성 오류가 발생했습니다." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    let presentation;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      presentation = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      presentation = null;
    }

    return new Response(JSON.stringify({ presentation, rawContent: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "알 수 없는 오류" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
