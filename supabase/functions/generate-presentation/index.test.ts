import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

async function getTestToken(): Promise<string> {
  const email = `test-txt-${Date.now()}@example.com`;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password: "testpassword123!" }),
  });
  const data = await res.json();
  assert(data.access_token, "Signup should return access_token");
  return data.access_token;
}

// Text-only payload — no numeric data, no Excel
const TEXT_ONLY_PAYLOAD = {
  "프로젝트_계획서.txt": {
    type: "text",
    content: `2025년 신규 프로젝트 추진 계획서

1. 프로젝트 개요
- 프로젝트명: 스마트 물류 자동화 시스템 구축
- 추진 배경: 물류 비용 절감 및 배송 효율화 필요
- 목표: 물류센터 자동화율 70% 달성, 배송 리드타임 30% 단축

2. 추진 전략
- 1단계(Q1-Q2): 현황 분석 및 시스템 설계
- 2단계(Q3): 파일럿 운영 및 검증
- 3단계(Q4): 전사 확대 적용

3. 기대 효과
- 연간 물류비 약 15억원 절감
- 배송 오류율 5% → 1% 이하로 감소
- 고객 만족도 향상

4. 리스크 요인
- 초기 투자 비용 부담 (약 8억원)
- 기존 시스템과의 호환성 이슈
- 직원 교육 및 변화 관리 필요`,
  },
  "회의록.txt": {
    type: "text",
    content: `경영전략회의 회의록 (2025.01.15)

참석자: 김전무, 이상무, 박부장, 최과장
안건: 스마트 물류 자동화 시스템 도입 검토

주요 논의사항:
- 김전무: ROI 분석 결과 2년 내 투자금 회수 가능할 것으로 판단
- 이상무: 경쟁사 A사는 이미 도입 완료, 우리도 서둘러야 함
- 박부장: 파일럿은 수도권 물류센터에서 먼저 진행 제안
- 최과장: 벤더 3곳 비교 분석 중, 다음 주 결과 보고 예정

결정사항:
1. 프로젝트 정식 승인
2. 전담 TF팀 구성 (2월 중)
3. 벤더 선정 후 Q2 착수 목표`,
  },
};

Deno.test("generate mode with text-only files: produces valid presentation without charts", async () => {
  const token = await getTestToken();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-presentation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      mode: "generate",
      fileData: TEXT_ONLY_PAYLOAD,
      meetingInfo: {
        week: "스마트 물류 자동화 프로젝트 추진 보고",
        department: "경영기획팀",
        reporter: "최과장",
        notes: "",
      },
      settings: { difficulty: "medium", volume: "standard" },
      template: "proposal",
    }),
  });

  const body = await res.json();
  assertEquals(res.status, 200, `Expected 200: ${JSON.stringify(body).slice(0, 300)}`);

  const p = body.presentation;
  assert(p?.title, "Presentation should have a title");
  assert(p.slides.length >= 5, `Standard volume should have >=5 slides, got ${p.slides.length}`);

  console.log(`\n📊 "${p.title}" — ${p.slides.length} slides`);
  console.log(`   Flow: ${p.slides.map((s: any) => s.type).join(" → ")}\n`);

  // === 1. Slide structure validation ===
  for (const slide of p.slides) {
    assert(slide.title, `Slide ${slide.slideNumber} must have title`);
    assert(["title", "data", "chart", "action", "summary"].includes(slide.type), `Invalid type: ${slide.type}`);
    assert(Array.isArray(slide.content), `Slide ${slide.slideNumber} content must be array`);

    // If chart slide exists, chartData must be valid
    if (slide.type === "chart" && slide.chartData) {
      const cd = slide.chartData;
      assert(cd.title, "Chart title required");
      assert(Array.isArray(cd.data) && cd.data.length >= 2, "Chart data needs >=2 points");
      console.log(`   📈 Chart found: "${cd.title}" (${cd.chartType}, ${cd.data.length} points)`);
    }
  }

  // === 2. Content coverage: both files should be reflected ===
  const allText = p.slides.flatMap((s: any) => [
    s.title || "",
    ...(s.content || []),
    s.notes || "",
  ]).join(" ");

  const hasProjectPlan = allText.includes("물류") || allText.includes("자동화") || allText.includes("배송");
  assert(hasProjectPlan, "Should reflect project plan content");

  const hasMeetingNotes = allText.includes("ROI") || allText.includes("파일럿") || allText.includes("TF") || allText.includes("벤더") || allText.includes("경쟁");
  assert(hasMeetingNotes, "Should reflect meeting notes content");

  console.log("✅ File coverage:");
  console.log(`   프로젝트 계획서: ${hasProjectPlan}`);
  console.log(`   회의록: ${hasMeetingNotes}`);

  // === 3. Storytelling structure ===
  const first = p.slides[0];
  const last = p.slides[p.slides.length - 1];
  assert(first.type === "title", `First slide: ${first.type}`);
  assert(last.type === "summary" || last.type === "action", `Last slide: ${last.type}`);

  // === 4. Proposal template: should have problem → solution → benefit flow ===
  const types = p.slides.map((s: any) => s.type);
  const hasAction = types.includes("action");
  assert(hasAction, "Proposal template should include action slide");

  console.log(`\n✅ All text-only validations passed!`);
});
